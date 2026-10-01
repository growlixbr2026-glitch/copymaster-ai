// Proxy server-side para referência visual de Pins (Pinterest / Quotefancy).
// GET /api/pin?url=<pin_url>            → { ok, pinId, pageUrl, thumbUrl, title, via }
// GET /api/pin?url=<pin_url>&bytes=1    → { ok, pinId, base64, mime, via } (teto ~2.5MB)
// Cadeia: host canônico → og:image → __PWS_DATA__ → Microlink (fallback gratuito).
// Sem CORS, sem chave. Rejeita páginas de tópico (/ideas/) — só Pin individual.
// Espelho dev em vite.config.ts (envApiPlugin).
const ALLOWED_HOSTS = ['pinterest.com', 'br.pinterest.com', 'mx.pinterest.com', 'pin.it', 'quotefancy.com', 'www.quotefancy.com'];

const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
];

function pickMeta(html: string, prop: string): string {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i');
  const tag = html.match(re)?.[0] || '';
  const c = tag.match(/content=["']([^"']{1,500})["']/i)?.[1] || '';
  return c.trim();
}

// Pinterest injeta estado inicial com as URLs pinimg mesmo no HTML de bot.
function pickPwsImage(html: string): { url: string; title: string } {
  const out = { url: '', title: '' };
  const m = html.match(/__PWS_DATA__\s*=\s*(\{[\s\S]{0,400000}?)\s*;<\/script>/i) || html.match(/"images"\s*:\s*\{\s*"orig"\s*:\s*\{\s*"url"\s*:\s*"([^"]{10,300})"/i);
  if (m && m[1] && m[1].startsWith('{')) {
    try {
      const blob = m[1];
      const u = blob.match(/"orig"\s*:\s*\{\s*"url"\s*:\s*"([^"]{10,300})"/i)?.[1]
        || blob.match(/https:\/\/i\.pinimg\.com\/originals\/[a-z0-9/_.-]{5,150}\.(?:jpg|jpeg|png|webp)/i)?.[0] || '';
      const t = blob.match(/"title"\s*:\s*"([^"]{1,200})"/i)?.[1] || blob.match(/"description"\s*:\s*"([^"]{1,200})"/i)?.[1] || '';
      out.url = (u || '').replace(/\\u0026/g, '&').replace(/\\\//g, '/');
      out.title = (t || '').slice(0, 140);
    } catch {}
  } else if (m && m[1] && !m[1].startsWith('{')) {
    out.url = m[1].replace(/\\\//g, '/');
  }
  if (!out.url) {
    const direct = html.match(/https:\/\/i\.pinimg\.com\/originals\/[a-z0-9/_.-]{5,150}\.(?:jpg|jpeg|png|webp)/i)?.[0];
    if (direct) out.url = direct;
  }
  return out;
}

function extractPinId(host: string, path: string): string {
  const m = path.match(/\/pin\/(\d+)/i) || path.match(/\/(\d{6,})\/?(?:$|[?#])/);
  if (m) return m[1];
  if (host.includes('quotefancy.com')) {
    const q = path.match(/quote\/[^/]+\/(\d+)/i) || path.match(/(\d{5,})\/?$/);
    if (q) return q[1];
    return 'quotefancy-page';
  }
  return '';
}

function canonicalUrl(u: URL): string {
  // Pinterest serve OG de forma mais estável no host canônico.
  if (u.hostname.toLowerCase().endsWith('pinterest.com') || u.hostname.toLowerCase() === 'pin.it') {
    const c = new URL(u.toString());
    c.hostname = 'www.pinterest.com';
    return c.toString();
  }
  return u.toString();
}

async function fetchText(url: string, ms = 12000): Promise<string> {
  let lastErr = '';
  for (const ua of UAS) {
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), ms);
      const r = await fetch(url, {
        signal: ctl.signal,
        headers: { 'User-Agent': ua, 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8', Accept: 'text/html' },
      });
      clearTimeout(to);
      if (r.ok) return (await r.text()).slice(0, 600000);
      lastErr = `HTTP ${r.status}`;
    } catch (e: any) { lastErr = String(e?.message || e).slice(0, 80); }
  }
  throw new Error(lastErr || 'fetch falhou');
}

async function microlink(url: string): Promise<{ thumbUrl: string; title: string }> {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&meta=true`, { signal: ctl.signal });
    clearTimeout(to);
    const j: any = await r.json().catch(() => ({}));
    const d = j?.data || {};
    return { thumbUrl: String(d.image?.url || d.url || ''), title: String(d.title || d.description || '').slice(0, 140) };
  } catch (e: any) {
    clearTimeout(to);
    throw new Error(String(e?.message || e).slice(0, 80));
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const rawUrl = String(req.query?.url || '').slice(0, 500);
  const wantBytes = String(req.query?.bytes || '') === '1';
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return res.status(400).json({ ok: false, reason: 'URL inválida. Cole o link do Pin (pinterest.com/pin/…).' });
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith('.' + h))) {
    return res.status(400).json({ ok: false, reason: 'Domínio não suportado. Use link do Pinterest ou Quotefancy.' });
  }
  if (/\/ideas\//i.test(u.pathname)) {
    return res.status(400).json({ ok: false, reason: 'not_a_pin', hint: 'Essa é uma página de tópico. Abra um Pin individual e cole o link dele (pinterest.com/pin/…).' });
  }
  const pinId = extractPinId(host, u.pathname);
  if (!pinId) {
    return res.status(400).json({ ok: false, reason: 'not_a_pin', hint: 'Não encontrei o ID do Pin. Cole o link do Pin individual.' });
  }
  const pageUrl = canonicalUrl(u);
  let thumbUrl = '';
  let title = '';
  let via = '';
  try {
    const html = await fetchText(pageUrl);
    thumbUrl = pickMeta(html, 'og:image');
    title = pickMeta(html, 'og:title') || pickMeta(html, 'twitter:title');
    if (thumbUrl) via = 'og';
    if (!thumbUrl) {
      const pws = pickPwsImage(html);
      if (pws.url) { thumbUrl = pws.url; title = title || pws.title; via = 'pws'; }
    }
  } catch (e: any) {
    title = '';
    void e;
  }
  if (!thumbUrl) {
    // Fallback gratuito sem chave: Microlink resolve metadados de URLs anti-bot.
    try {
      const ml = await microlink(pageUrl);
      if (ml.thumbUrl) { thumbUrl = ml.thumbUrl; title = title || ml.title; via = 'microlink'; }
    } catch {}
  }
  if (!thumbUrl) {
    return res.status(200).json({ ok: false, reason: 'Pin protegido contra leitura automática (login-wall). Salve a imagem do Pin e use "Anexar imagem salva".', code: 'unreadable' });
  }
  if (!wantBytes) return res.status(200).json({ ok: true, pinId, pageUrl, thumbUrl, title, via });
  // Defesa SSRF mínima (não quebra Pins legítimos https): só https público, sem IP privado/metadata.
  try {
    const tu = new URL(thumbUrl);
    const h = tu.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    const isPrivate = h === 'localhost' || h === 'metadata.google.internal'
      || h === '0.0.0.0' || h === '::' || h === '::1' || h === '::ffff:127.0.0.1'
      || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === '169.254.169.254'
      || /^(fc|fd)[0-9a-f]*:/.test(h.replace(/[\[\]]/g, '')) || /^fe80:/.test(h.replace(/[\[\]]/g, ''));
    if (tu.protocol !== 'https:' || isPrivate) {
      return res.status(200).json({ ok: true, pinId, pageUrl, thumbUrl, title, via, bytesError: 'thumbUrl bloqueado por política (só https público)' });
    }
  } catch {
    return res.status(200).json({ ok: true, pinId, pageUrl, thumbUrl, title, via, bytesError: 'thumbUrl inválida' });
  }
  try {
    const img = await fetch(thumbUrl, { headers: { 'User-Agent': UAS[0] } });
    if (!img.ok) return res.status(200).json({ ok: true, pinId, pageUrl, thumbUrl, title, via, bytesError: 'download falhou — gere pelo estilo + link' });
    const buf = Buffer.from(await img.arrayBuffer());
    if (buf.length > 2621440) return res.status(200).json({ ok: true, pinId, pageUrl, thumbUrl, title, via, bytesError: 'imagem > 2.5MB — salve menor e anexe' });
    const mime = (img.headers.get('content-type') || 'image/jpeg').split(';')[0];
    return res.status(200).json({ ok: true, pinId, pageUrl, thumbUrl, title, via, base64: buf.toString('base64'), mime });
  } catch (e: any) {
    return res.status(200).json({ ok: true, pinId, pageUrl, thumbUrl, title, via, bytesError: String(e?.message || e).slice(0, 120) });
  }
}
