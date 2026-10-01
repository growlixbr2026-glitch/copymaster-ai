// Proxy server-side para extração textual de site de referência (PRD Vibe Studio).
// GET /api/scrape?url=<https_url> → { ok, url, title, description, headings[], text, via }
// Cadeia: fetch direto (dual UA) → Microlink (fallback gratuito).
// Sem CORS, sem chave. Read-only (GET/OPTIONS; demais métodos 405).
// Defesa SSRF: só https público, sem IP privado/metadata (mesmo padrão de api/pin.ts).
// Espelho dev em vite.config.ts (envApiPlugin).
const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
];

function isBlockedHost(h: string): boolean {
  let host = h.toLowerCase().replace(/^\[|\]$/g, '');
  // Forma IPv6-mapped de IPv4: "::ffff:7f00:1" e "::ffff:127.0.0.1" escapavam
  // da comparação literal e davam acesso a 127.0.0.1/169.254.169.254.
  const mappedHex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16), lo = parseInt(mappedHex[2], 16);
    host = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
  } else if (host.startsWith('::ffff:')) {
    host = host.slice(7);
  }
  return host === 'localhost' || host === 'metadata.google.internal'
    || host === '0.0.0.0' || host === '::' || host === '::1' || host === '::ffff:127.0.0.1'
    || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)
    || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === '169.254.169.254'
    || /^169\.254\./.test(host) || /^0\./.test(host)
    || /^(fc|fd)[0-9a-f]*:/.test(host.replace(/[\[\]]/g, '')) || /^fe80:/.test(host.replace(/[\[\]]/g, ''));
}

function isSafeTarget(raw: string): URL | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  // Só 80/443 (porta vazia = padrão): bloqueia varredura de serviços internos.
  if (u.port && u.port !== '80' && u.port !== '443') return null;
  if (u.protocol !== 'https:' || isBlockedHost(u.hostname)) return null;
  return u;
}

async function fetchText(url: string, ms = 12000): Promise<string> {
  let lastErr = '';
  for (const ua of UAS) {
    try {
      // redirect: manual + revalidação de CADA hop — o blocklist era contornado
      // por 302 de host atacante para 169.254.169.254/127.0.0.1 (SSRF clássico).
      let target = url;
      let hops = 3;
      let body: string | null = null;
      while (true) {
        if (!isSafeTarget(target)) { lastErr = 'redirecionamento bloqueado por política'; break; }
        const ctl = new AbortController();
        const to = setTimeout(() => ctl.abort(), ms);
        const r = await fetch(target, {
          signal: ctl.signal,
          redirect: 'manual',
          headers: { 'User-Agent': ua, 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8', Accept: 'text/html' },
        });
        clearTimeout(to);
        if (r.status >= 300 && r.status < 400) {
          const loc = r.headers.get('location');
          if (!loc || hops-- <= 0) { lastErr = 'redirect sem destino ou excesso'; break; }
          try { target = new URL(loc, target).toString(); } catch { lastErr = 'redirect inválido'; break; }
          continue;
        }
        if (r.ok) body = (await r.text()).slice(0, 600000);
        else lastErr = `HTTP ${r.status}`;
        break;
      }
      if (body) return body;
    } catch (e: any) { lastErr = String(e?.message || e).slice(0, 80); }
  }
  throw new Error(lastErr || 'fetch falhou');
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#0?39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCharCode(Number(n)); } catch { return ''; } });
}

function cleanHtml(html: string): { title: string; description: string; headings: string[]; text: string } {
  const pickMeta = (prop: string): string => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]*>`, 'i');
    const tag = html.match(re)?.[0] || '';
    return (tag.match(/content=["']([^"']{1,500})["']/i)?.[1] || '').trim();
  };
  const title = decodeEntities(
    pickMeta('og:title') || pickMeta('twitter:title')
    || (html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1] || '').trim()
  ).slice(0, 200);
  const description = decodeEntities(
    pickMeta('og:description') || pickMeta('description') || pickMeta('twitter:description')
  ).slice(0, 300);
  const headings: string[] = [];
  const hRe = /<h([1-3])[^>]*>([\s\S]{1,300}?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = hRe.exec(html)) && headings.length < 12) {
    const t = decodeEntities(m[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
    if (t.length >= 3) headings.push(`H${m[1]}: ${t}`.slice(0, 160));
  }
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ');
  text = decodeEntities(text.replace(/<[^>]*>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim());
  if (/href=/.test(text)) text = text.replace(/href=[^\s>]*/gi, '').trim();
  return { title, description, headings, text: text.slice(0, 8000) };
}

async function viaMicrolink(url: string): Promise<{ title: string; description: string }> {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 9000);
  try {
    const r = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}&meta=true`, { signal: ctl.signal });
    clearTimeout(to);
    const j: any = await r.json().catch(() => ({}));
    const d = j?.data || {};
    return {
      title: String(d.title || '').slice(0, 200),
      description: String(d.description || '').slice(0, 300),
    };
  } catch (e: any) {
    clearTimeout(to);
    throw new Error(String(e?.message || e).slice(0, 80));
  }
}

export default async function handler(req: any, res: any) {
  // Sem CORS *: o chamador é same-origin (PRD Studio) e `*` transformava a
  // função num scraping relay anônimo para qualquer site da web.
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, reason: 'Somente leitura (GET). Configure chaves no dashboard em produção.' });
  }
  const rawUrl = String(req.query?.url || '').slice(0, 500);
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return res.status(400).json({ ok: false, reason: 'URL inválida. Cole um link https público (ex.: https://linear.app).' });
  }
  if (!isSafeTarget(u.toString())) {
    return res.status(400).json({ ok: false, reason: 'URL bloqueada por política (só https público em 80/443, sem rede privada).' });
  }
  const pageUrl = u.toString();
  try {
    const html = await fetchText(pageUrl);
    const { title, description, headings, text } = cleanHtml(html);
    if (!title && !text) throw new Error('HTML vazio ou ilegível');
    return res.status(200).json({ ok: true, url: pageUrl, title, description, headings, text, via: 'fetch' });
  } catch {
    try {
      const ml = await viaMicrolink(pageUrl);
      if (!ml.title && !ml.description) throw new Error('sem metadados');
      return res.status(200).json({ ok: true, url: pageUrl, title: ml.title, description: ml.description, headings: [], text: '', via: 'microlink' });
    } catch {
      return res.status(200).json({ ok: false, reason: 'Site protegido contra leitura automática (JS pesado, paywall ou login). Faça upload de um screenshot que eu extraio o DNA visual.', code: 'unreadable' });
    }
  }
}
