export interface SourceSnippet { title: string; url: string; snippet: string; sourceType: 'paper' | 'news' | 'thesis' | 'blog'; date?: string; source: string; }

function parseArxivXml(xml: string): SourceSnippet[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const entries = Array.from(doc.getElementsByTagName('entry'));
  return entries.map(e => {
    const t = e.getElementsByTagName('title')[0]?.textContent?.trim().replace(/\s+/g,' ') || '';
    const s = e.getElementsByTagName('summary')[0]?.textContent?.trim().slice(0,280) || '';
    const id = e.getElementsByTagName('id')[0]?.textContent?.trim() || '';
    const published = e.getElementsByTagName('published')[0]?.textContent?.trim() || '';
    return { title: t, url: id, snippet: s, sourceType: 'paper' as const, date: published.slice(0,10), source: 'arXiv' };
  }).filter(x=>x.title && x.url);
}

export async function fetchArxiv(niche: string, limit=4): Promise<SourceSnippet[]> {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(niche)}&start=0&max_results=${limit}&sortBy=submittedDate&sortOrder=descending`;
  const ctrl = new AbortController(); setTimeout(()=>ctrl.abort(), 6000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return [];
    const xml = await r.text();
    return parseArxivXml(xml).slice(0, limit);
  } catch { return []; }
}
