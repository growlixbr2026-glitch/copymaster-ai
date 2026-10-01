// Vercel Serverless — research gratuito server-side (sem CORS, sem chave).
// GET /api/research?source=arxiv|semantic|openalex|pubmed|crossref|news|web&q=...&limit=
// Retorna { ok, items: SourceSnippet[] }. Espelho da rota dev em vite.config.ts.
// `news` = Google News + Yahoo RSS (jornais). `web` = índice web Yahoo
// (blogs, guias, landing pages — Google-like para o escopo Geral).
type Snippet = { title: string; url: string; snippet: string; sourceType: string; date?: string; source: string };

function decodeEntities(s: string): string {
  return (s || '')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCharCode(parseInt(d, 10)); } catch { return ' '; } })
    .replace(/&nbsp;|&hellip;|&#x27;/gi, ' ');
}
export function cleanResearchText(s: string, n: number): string {
  return clean(s, n);
}
function clean(s: string, n: number): string {
  // Decodifica entities ANTES do strip (Google News manda &lt;a href=&quot;...&gt;),
  // remove tags, e como fallback usa title se sobrar href= residual.
  const decoded = decodeEntities(s);
  const stripped = decoded.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (/href\s*=\s*["']?https?:/i.test(stripped)) return '';
  return stripped.slice(0, n);
}
function pickTag(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? m[1].trim() : '';
}

async function fetchArxiv(q: string, limit: number): Promise<Snippet[]> {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(q)}&start=0&max_results=${limit}&sortBy=submittedDate&sortOrder=descending`;
  const r = await fetch(url, { headers: { 'User-Agent': 'CopyMasterAI/1.0' } });
  if (!r.ok) return [];
  const xml = await r.text();
  const entries = xml.split(/<entry>/i).slice(1);
  return entries.slice(0, limit).map(e => ({
    title: clean(pickTag(e, 'title'), 140),
    url: clean(pickTag(e, 'id'), 200),
    snippet: clean(pickTag(e, 'summary'), 280),
    sourceType: 'paper',
    date: clean(pickTag(e, 'published'), 10),
    source: 'arXiv',
  })).filter(x => x.title && x.url);
}

async function fetchSemantic(q: string, limit: number): Promise<Snippet[]> {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(q)}&limit=${limit}&fields=title,abstract,url,year,openAccessPdf`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) return [];
  const j: any = await r.json();
  return ((j.data || []) as any[]).map((p: any) => ({
    title: String(p.title || '').slice(0, 140),
    url: p.url || p.openAccessPdf?.url || (p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : ''),
    snippet: String(p.abstract || p.title || '').slice(0, 280),
    sourceType: 'paper',
    date: p.year ? String(p.year) : '',
    source: 'Semantic Scholar',
  })).filter((x: Snippet) => x.title && x.url).slice(0, limit);
}

async function fetchOpenAlex(q: string, limit: number): Promise<Snippet[]> {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per_page=${limit}&sort=cited_by_count:desc`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const j: any = await r.json();
  return ((j.results || []) as any[]).map((w: any) => ({
    title: String(w.title || w.display_name || '').slice(0, 140),
    url: w.id?.startsWith?.('https://openalex.org/') ? `https://openalex.org/${String(w.id).split('/').pop()}` : (w.doi ? `https://doi.org/${String(w.doi).replace('https://doi.org/', '')}` : w.id || ''),
    snippet: (w.abstract_inverted_index ? Object.keys(w.abstract_inverted_index).slice(0, 40).join(' ') : '').slice(0, 280) || String(w.title || ''),
    sourceType: 'paper',
    date: String(w.publication_date || '').slice(0, 10),
    source: 'OpenAlex',
  })).filter((x: Snippet) => x.title && x.url).slice(0, limit);
}

async function fetchPubMed(q: string, limit: number): Promise<Snippet[]> {
  const es = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(q)}&retmax=${limit}&sort=relevance&retmode=json`);
  if (!es.ok) return [];
  const ej: any = await es.json();
  const ids: string[] = ej?.esearchresult?.idlist || [];
  if (!ids.length) return [];
  const sum = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`);
  if (!sum.ok) return ids.map(id => ({ title: `PubMed ${id}`, url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`, snippet: `Artigo sobre ${q}`, sourceType: 'paper', source: 'PubMed' }));
  const sj: any = await sum.json();
  return ids.map(id => {
    const rec = sj?.result?.[id] || {};
    return {
      title: String(rec.title || `PubMed ${id}`).slice(0, 140),
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      snippet: String(rec.sortTitle || rec.title || `Artigo sobre ${q}`).slice(0, 280),
      sourceType: 'paper',
      date: String(rec.pubdate || '').slice(0, 10),
      source: 'PubMed',
    };
  }).slice(0, limit);
}

async function fetchCrossref(q: string, limit: number): Promise<Snippet[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=${limit}`;
  const r = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
    }
  });
  if (!r.ok) return [];
  const j: any = await r.json();
  return (((j.message || {}).items || []) as any[]).map((it: any) => ({
    title: String(it.title?.[0] || '').slice(0, 140),
    url: it.URL || (it.DOI ? `https://doi.org/${it.DOI}` : ''),
    snippet: clean(it.abstract || it.title?.[0] || '', 280),
    sourceType: 'thesis',
    date: String(it.created?.['date-parts']?.[0]?.join('-') || '').slice(0, 10),
    source: 'SciELO/Crossref',
  })).filter((x: Snippet) => x.title && x.url).slice(0, limit);
}

// BDTD — Biblioteca Digital Brasileira de Teses e Dissertações (IBICT).
// Busca teses brasileiras via API REST.
async function fetchBdtd(q: string, limit: number): Promise<Snippet[]> {
  try {
    const url = `https://bdtd.ibict.br/vufind/api/v1/search?query=${encodeURIComponent(q)}&limit=${limit}`;
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(url, {
      signal: ctl.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
      },
    });
    clearTimeout(to);
    if (!r.ok) return [];
    const j: any = await r.json();
    const records = j?.response?.docs || j?.records || [];
    return records.slice(0, limit).map((rec: any) => ({
      title: String(rec.title_t?.[0] || rec.title || '').slice(0, 140),
      url: rec.id ? `https://bdtd.ibict.br/vufind/Record/${rec.id}` : '',
      snippet: String(rec.abstract_t?.[0] || rec.description_t?.[0] || rec.title_t?.[0] || '').slice(0, 280),
      sourceType: 'thesis' as const,
      date: String(rec.date_t?.[0] || '').slice(0, 10),
      source: 'BDTD/IBICT',
    })).filter((x: Snippet) => x.title && x.url);
  } catch { return []; }
}

async function fetchNews(q: string, limit: number): Promise<Snippet[]> {
  // NOTÍCIAS — Google News RSS (principal) + RSS de jornais/revistas brasileiros.
  const enc = encodeURIComponent(q);
  const feeds = [
    // Google News BR + EN (maior聚合ador de notícias)
    { url: `https://news.google.com/rss/search?q=${enc}&hl=pt-BR&gl=BR&ceid=BR:pt-419`, name: 'Google News' },
    { url: `https://news.google.com/rss/search?q=${enc}&hl=en-US&gl=US&ceid=US:en`, name: 'Google News EN' },
    // RSS direto de grandes veículos
    { url: `https://feeds.folha.uol.com.br/emcimadahora/rss091.xml?q=${enc}`, name: 'Folha de S.Paulo' },
    { url: `https://pox.globo.com/rss/g1/`, name: 'G1' },
  ];
  const out: Snippet[] = [];
  for (const f of feeds) {
    if (out.length >= limit) break;
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(f.url, {
        signal: ctl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml,application/xml,text/xml,*/*',
        }
      });
      clearTimeout(to);
      if (!r.ok) continue;
      const xml = await r.text();
      const items = xml.split(/<item>/i).slice(1);
      const maxPerFeed = f.name.startsWith('Google News') ? Math.ceil(limit / 2) : 3;
      for (const it of items.slice(0, maxPerFeed)) {
        if (out.length >= limit) break;
        const title = clean(pickTag(it, 'title'), 140);
        let link = clean(pickTag(it, 'link'), 300);
        const srcUrl = (it.match(/<source[^>]*url=["']([^"']{12,300})["']/i) || [])[1] || '';
        if (/news\.google\.com\/rss\/articles/i.test(link) && srcUrl && isValidWebUrl(srcUrl)) link = srcUrl;
        if (!isValidWebUrl(link)) continue;
        let desc = clean(pickTag(it, 'description'), 280);
        if (!desc) desc = title;
        if (title) out.push({ title, url: link, snippet: desc, sourceType: 'news', date: clean(pickTag(it, 'pubDate'), 25), source: f.name });
      }
    } catch {}
  }
  return out.slice(0, limit);
}

// URL precisa ser link direto clicável: http(s), host público com ponto,
// sem scheme esquisito (javascript:/data:) e sem apontar p/ o próprio buscador.
// Desembrulha redirect DDG (`/l/?uddg=https://...`) antes de validar.
function unwrapSearchRedirect(raw: string): string {
  try {
    // DDG lite emite href protocol-relative: //duckduckgo.com/l/?uddg=https://...
    let s = (raw || '').trim();
    if (s.startsWith('//')) s = 'https:' + s;
    const u = new URL(s);
    if (/duckduckgo\.com$/i.test(u.hostname)) {
      const uddg = u.searchParams.get('uddg');
      if (uddg && /^https?:/i.test(uddg)) return uddg;
    }
    return s;
  } catch {
    return raw;
  }
}
export function isValidWebUrl(raw: string): boolean {
  try {
    const u = new URL(unwrapSearchRedirect(raw).trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    if (!h.includes('.')) return false;
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0|::)/.test(h)) return false;
    // news.google.com/rss/articles = redirect válido que abre a matéria — permitir.
    // Bloqueia só páginas do próprio buscador (search, homepage).
    if (/duckduckgo\.com|bing\.com|yahoo\.com/i.test(h)) return false;
    if (/google\./i.test(h) && !/^news\.google\.com$/i.test(h)) return false;
    return u.toString().length > 12;
  } catch {
    return false;
  }
}

export const webDebug: Record<string, string> = {};

async function fetchWithTimeout(url: string, ms: number, tag?: string): Promise<string | null> {
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), ms);
    const r = await fetch(url, {
      signal: ctl.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        Accept: 'text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    clearTimeout(to);
    if (!r.ok) {
      if (tag) webDebug[tag] = `http${r.status}`;
      return null;
    }
    const text = await r.text();
    if (tag) webDebug[tag] = `ok:${text.length}c`;
    return text;
  } catch (e: any) {
    if (tag) webDebug[tag] = `err:${String(e?.message || e).slice(0, 40)}`;
    return null;
  }
}

function parseYahooWeb(xml: string, limit: number): Snippet[] {
  const out: Snippet[] = [];
  const items = xml.split(/<item>/i).slice(1);
  for (const it of items.slice(0, limit)) {
    const link = clean(pickTag(it, 'link'), 300);
    if (!isValidWebUrl(link)) continue;
    const title = clean(pickTag(it, 'title'), 140);
    const desc = clean(pickTag(it, 'description'), 280);
    if (title) out.push({ title, url: link, snippet: desc || title, sourceType: 'blog', date: clean(pickTag(it, 'pubDate'), 25), source: 'Yahoo Web' });
  }
  return out;
}

export function parseDdgLite(html: string, limit: number): Snippet[] {
  // lite.duckduckgo.com: <a rel="nofollow" href="URL">Título</a> ... <td class="result-snippet">texto</td>
  // Tolerante à ordem dos atributos (rel pode vir depois de href) e a aspas simples.
  const out: Snippet[] = [];
  const re = /<a[^>]*href=(["'])([^"']{12,300})\1[^>]*>([\s\S]{1,220}?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while (out.length < limit && (m = re.exec(html)) !== null) {
    const link = unwrapSearchRedirect((m[2] || '').replace(/&amp;/g, '&'));
    if (!isValidWebUrl(link)) continue;
    const title = clean(m[3], 140);
    if (!title || title.length < 8) continue;
    // snippet obrigatório: primeiro result-snippet após o anchor.
    // Âncoras de navegação (sem snippet) são descartadas — evita lixo.
    const after = html.slice(m.index, m.index + 1500);
    const sm = after.match(/class=(["'])result-snippet\1[^>]*>([\s\S]{1,400}?)<\/td>/i);
    if (!sm) continue;
    const desc = clean(sm[2], 280);
    if (!desc || desc.length < 10) continue;
    out.push({ title, url: link, snippet: desc, sourceType: 'blog', date: '', source: 'DuckDuckGo' });
  }
  return out;
}

export function parseBing(html: string, limit: number): Snippet[] {
  // Bing nova estrutura: <a href="BING_REDIRECT"><strong>Título</strong></a>
  // A URL real está em base64 no parâmetro u=a1... do redirect.
  const out: Snippet[] = [];
  // Captura links Bing com <strong> (título real)
  const re = /href="(https?:\/\/www\.bing\.com\/ck\/a[^"]+)"[^>]*><strong>([\s\S]*?)<\/strong>/gi;
  let m: RegExpExecArray | null;
  while (out.length < limit && (m = re.exec(html)) !== null) {
    // Decodifica URL do redirect Bing
    const bingUrl = m[1].replace(/&amp;/g, '&');
    let realUrl = '';
    const uMatch = bingUrl.match(/[&?]u=([^&]+)/i);
    if (uMatch) {
      try {
        // Bing usa base64 com prefixo a1
        const raw = uMatch[1].replace(/^a1/, '');
        realUrl = Buffer.from(raw, 'base64').toString('utf-8');
      } catch {}
    }
    if (!realUrl || !isValidWebUrl(realUrl)) continue;
    const title = clean(m[2], 140);
    if (!title || title.length < 5) continue;
    // Busca snippet: parágrafo ou div após o link
    const after = html.slice(m.index, m.index + 2000);
    const snipMatch = after.match(/<(?:p|div|span)[^>]*class=(["'][^"']*(?:b_caption|b_lineclamp|b_algoSlug)[^"']*["'])[^>]*>([\s\S]{10,500}?)<\/(?:p|div|span)>/i)
      || after.match(/<p[^>]*>([\s\S]{10,500}?)<\/p>/i);
    const desc = snipMatch ? clean(snipMatch[snipMatch.length - 1], 280) : title;
    out.push({ title, url: realUrl, snippet: desc || title, sourceType: 'blog', date: '', source: 'Bing' });
  }
  // Fallback: padrão legado (<li class="b_algo"><h2><a href="URL">Título</a></h2>)
  const legacy = /<li class=(["'])b_algo[^>]*?\1[\s\S]*?<h2><a[^>]*href=(["'])([^"']{12,300})\2[^>]*>([\s\S]{1,220}?)<\/a>[\s\S]*?<(?:p|div)[^>]*>([\s\S]{1,500}?)<\/(?:p|div)>/gi;
  while (out.length < limit && (m = legacy.exec(html)) !== null) {
    const link = (m[3] || '').replace(/&amp;/g, '&');
    if (!isValidWebUrl(link)) continue;
    const title = clean(m[4], 140);
    if (!title || title.length < 8) continue;
    const desc = clean(m[5], 280);
    if (!desc || desc.length < 10) continue;
    out.push({ title, url: link, snippet: desc, sourceType: 'blog', date: '', source: 'Bing' });
  }
  return out;
}

function parseYahooSearch(html: string, limit: number): Snippet[] {
  // Yahoo Search HTML: resultados em <div class="algo-sr"> com <h3><a href="URL">Título</a></h3>
  const out: Snippet[] = [];
  const re = /<h3[^>]*class=(["'])[^"']*\1[^>]*><a[^>]*href=(["'])([^"']{12,300})\2[^>]*>([\s\S]{1,220}?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while (out.length < limit && (m = re.exec(html)) !== null) {
    const link = unwrapSearchRedirect((m[3] || '').replace(/&amp;/g, '&'));
    if (!isValidWebUrl(link)) continue;
    const title = clean(m[4], 140);
    if (!title || title.length < 8) continue;
    const after = html.slice(m.index, m.index + 2000);
    const snipMatch = after.match(/<(?:p|span)[^>]*class=(["'][^"']*(?:compText|fc-falcon)[^"']*["'])[^>]*>([\s\S]{10,500}?)<\/(?:p|span)>/i)
      || after.match(/<p[^>]*>([\s\S]{10,500}?)<\/p>/i);
    const desc = snipMatch ? clean(snipMatch[snipMatch.length - 1], 280) : title;
    out.push({ title, url: link, snippet: desc || title, sourceType: 'blog', date: '', source: 'Yahoo' });
  }
  return out;
}

function parseDdgHtml(html: string, limit: number): Snippet[] {
  // html.duckduckgo.com/html/: <a class="result__a" href="URL">Título</a> + result__snippet.
  // Fallback quando o lite muda ou bloqueia.
  const out: Snippet[] = [];
  const re = /<a[^>]*class=(["'])result__a\1[^>]*href=(["'])([^"']{12,300})\2[^>]*>([\s\S]{1,220}?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while (out.length < limit && (m = re.exec(html)) !== null) {
    const link = unwrapSearchRedirect((m[3] || '').replace(/&amp;/g, '&'));
    if (!isValidWebUrl(link)) continue;
    const title = clean(m[4], 140);
    if (!title || title.length < 8) continue;
    const after = html.slice(m.index, m.index + 1500);
    const sm = after.match(/class=(["'])result__snippet\1[^>]*>([\s\S]{1,400}?)<\/a>/i);
    if (!sm) continue;
    const desc = clean(sm[2], 280);
    if (!desc || desc.length < 10) continue;
    out.push({ title, url: link, snippet: desc, sourceType: 'blog', date: '', source: 'DuckDuckGo' });
  }
  return out;
}

function parseSearxJson(json: string, limit: number): Snippet[] {
  // SearXNG público: /search?q=&format=json → {results:[{title,url,content}]}.
  const out: Snippet[] = [];
  try {
    const j: any = JSON.parse(json);
    const results = Array.isArray(j?.results) ? j.results : [];
    for (const r of results.slice(0, limit * 2)) {
      if (out.length >= limit) break;
      const link = String(r?.url || '');
      if (!isValidWebUrl(link)) continue;
      const title = clean(String(r?.title || ''), 140);
      if (!title || title.length < 8) continue;
      const desc = clean(String(r?.content || ''), 280) || title;
      out.push({ title, url: link, snippet: desc, sourceType: 'blog', date: '', source: 'SearXNG' });
    }
  } catch {}
  return out;
}

async function fetchWeb(q: string, limit: number): Promise<Snippet[]> {
  // BUSCA WEB REAL (como no navegador) — DDG + Bing + Yahoo + SearxNG.
  // Google News fica no fetchNews (escopo noticias), não aqui.
  const enc = encodeURIComponent(q);
  for (const k of Object.keys(webDebug)) delete webDebug[k];

  // 1) DuckDuckGo Lite — POST (como o navegador faz), não GET.
  const ddgResults = await (async (): Promise<Snippet[]> => {
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 7000);
      const r = await fetch('https://lite.duckduckgo.com/lite/', {
        method: 'POST',
        signal: ctl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://lite.duckduckgo.com',
          'Referer': 'https://lite.duckduckgo.com/',
        },
        body: `q=${enc}&kl=br-pt`,
      });
      clearTimeout(to);
      if (!r.ok) { webDebug['ddg'] = `http${r.status}`; return []; }
      const html = await r.text();
      const items = parseDdgLite(html, limit);
      webDebug['ddg'] = items.length ? `ok:${items.length}` : `html:${html.length}c/0parse`;
      return items;
    } catch (e: any) { webDebug['ddg'] = `err:${(e?.message||'').slice(0,30)}`; return []; }
  })();

  // 2) Bing — GET com headers completos de navegador real.
  const bingResults = await (async (): Promise<Snippet[]> => {
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 7000);
      const r = await fetch(`https://www.bing.com/search?q=${enc}&count=15&setlang=pt-BR&cc=BR`, {
        signal: ctl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
        },
      });
      clearTimeout(to);
      if (!r.ok) { webDebug['bing'] = `http${r.status}`; return []; }
      const html = await r.text();
      const items = parseBing(html, limit);
      webDebug['bing'] = items.length ? `ok:${items.length}` : `html:${html.length}c/0parse`;
      return items;
    } catch (e: any) { webDebug['bing'] = `err:${(e?.message||'').slice(0,30)}`; return []; }
  })();

  // 3) Yahoo Search — HTML (não só RSS).
  const yahooResults = await (async (): Promise<Snippet[]> => {
    try {
      const ctl = new AbortController();
      const to = setTimeout(() => ctl.abort(), 7000);
      const r = await fetch(`https://search.yahoo.com/search?p=${enc}&ei=UTF-8`, {
        signal: ctl.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8',
        },
      });
      clearTimeout(to);
      if (!r.ok) { webDebug['yahoo'] = `http${r.status}`; return []; }
      const html = await r.text();
      // Tenta HTML search primeiro, depois RSS como fallback.
      const items = parseYahooSearch(html, limit);
      if (items.length) { webDebug['yahoo'] = `ok:${items.length}`; return items; }
      // Fallback: Yahoo RSS
      const rssR = await fetch(`https://rss.search.yahoo.com/rss?p=${enc}&ei=UTF-8`, {
        signal: ctl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36' },
      });
      if (rssR.ok) {
        const xml = await rssR.text();
        const rssItems = parseYahooWeb(xml, limit);
        webDebug['yahoo'] = rssItems.length ? `rss:${rssItems.length}` : 'empty';
        return rssItems;
      }
      webDebug['yahoo'] = 'empty';
      return [];
    } catch (e: any) { webDebug['yahoo'] = `err:${(e?.message||'').slice(0,30)}`; return []; }
  })();

  // 4) SearxNG — fallback: aggregation de múltiplos motores.
  const searxResults = await (async (): Promise<Snippet[]> => {
    const instances = [
      `https://searx.be/search?q=${enc}&format=json&language=pt-BR`,
      `https://search.bus-hit.me/search?q=${enc}&format=json&language=pt-BR`,
      `https://search.sapti.me/search?q=${enc}&format=json&language=pt-BR`,
      `https://searxng.site/search?q=${enc}&format=json&language=pt-BR`,
      `https://search.ononoki.org/search?q=${enc}&format=json&language=pt-BR`,
      `https://paulgo.io/search?q=${enc}&format=json&language=pt-BR`,
      `https://search.mdosch.de/search?q=${enc}&format=json&language=pt-BR`,
    ];
    try {
      const settled = await Promise.allSettled(instances.map((u) => fetchWithTimeout(u, 5000)));
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value) {
          const items = parseSearxJson(r.value, limit);
          if (items.length) { webDebug['searx'] = `ok:${items.length}`; return items; }
        }
      }
      webDebug['searx'] = 'all-failed';
      return [];
    } catch { webDebug['searx'] = 'err'; return []; }
  })();

  // Merge: DDG → Bing → Yahoo → SearxNG (ordem de prioridade web).
  // Cada um traz links reais de sites. Dedup por URL.
  const seen = new Set<string>();
  const out: Snippet[] = [];
  const push = (items: Snippet[]) => {
    for (const s of items) {
      if (out.length >= limit) break;
      const k = s.url.toLowerCase().split('#')[0].replace(/\/+$/, '');
      if (seen.has(k)) continue;
      if (!isValidWebUrl(s.url)) continue;
      seen.add(k);
      out.push(s);
    }
  };
  push(ddgResults);
  push(bingResults);
  push(yahooResults);
  push(searxResults);
  webDebug['counts'] = `ddg:${ddgResults.length}/bing:${bingResults.length}/yahoo:${yahooResults.length}/searx:${searxResults.length}`;
  return out.slice(0, limit);
}

const HANDLERS: Record<string, (q: string, l: number) => Promise<Snippet[]>> = {
  arxiv: fetchArxiv, semantic: fetchSemantic, openalex: fetchOpenAlex,
  pubmed: fetchPubMed, crossref: fetchCrossref, bdtd: fetchBdtd,
  news: fetchNews, web: fetchWeb,
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const source = String(req.query?.source || '').toLowerCase();
  const q = String(req.query?.q || '').slice(0, 120);
  const limit = Math.min(15, Math.max(1, parseInt(String(req.query?.limit || '10'), 10) || 10));
  const fn = HANDLERS[source];
  if (!fn || !q) return res.status(400).json({ ok: false, error: 'Use /api/research?source=arxiv|semantic|openalex|pubmed|crossref|news|web&q=...&limit=' });
  try {
    const items = await fn(q, limit);
    // Diagnóstico de motores: expõe quais engines funcionaram/falharam.
    // Útil para debug quando pesquisa retorna vazio (anti-bot blocking).
    const engines = source === 'web' ? { ...webDebug } : {};
    return res.status(200).json({ ok: true, items, engines });
  } catch (e: any) {
    return res.status(200).json({ ok: true, items: [], engines: {}, warning: String(e?.message || e).slice(0, 200) });
  }
}
