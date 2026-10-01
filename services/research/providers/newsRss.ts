import type { SourceSnippet } from './arxiv';

function parseRssXml(xml: string, sourceName: string): SourceSnippet[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const items = Array.from(doc.getElementsByTagName('item'));
  return items.map(it=>{
    const t = it.getElementsByTagName('title')[0]?.textContent?.trim() || '';
    const link = it.getElementsByTagName('link')[0]?.textContent?.trim() || '';
    const desc = it.getElementsByTagName('description')[0]?.textContent?.trim().replace(/<[^>]*>/g,'').slice(0,280) || '';
    const date = it.getElementsByTagName('pubDate')[0]?.textContent?.trim() || '';
    return { title: t, url: link, snippet: desc, sourceType: 'news' as const, date: date.slice(0,25), source: sourceName };
  }).filter(x=>x.title && x.url);
}

export async function fetchNewsRss(niche: string, limit=6): Promise<SourceSnippet[]> {
  const feeds = [
    { url: `https://news.google.com/rss/search?q=${encodeURIComponent(niche)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`, name: 'Google News' },
    { url: `https://rss.search.yahoo.com/rss?fr=ynews&ei=UTF-8&p=${encodeURIComponent(niche)}`, name: 'Yahoo News' },
  ];
  const out: SourceSnippet[] = [];
  for (const f of feeds) {
    if (out.length >= limit) break;
    const ctrl = new AbortController(); setTimeout(()=>ctrl.abort(), 5000);
    try {
      const r = await fetch(f.url, { signal: ctrl.signal });
      if (!r.ok) continue;
      const xml = await r.text();
      const parsed = parseRssXml(xml, f.name);
      out.push(...parsed.slice(0, 3));
    } catch {}
  }
  return out.slice(0, limit);
}
