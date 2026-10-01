import type { SourceSnippet } from './arxiv';

export async function fetchSemanticScholar(niche: string, limit=4): Promise<SourceSnippet[]> {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(niche)}&limit=${limit}&fields=title,abstract,url,year,authors,citationCount,openAccessPdf`;
  const ctrl = new AbortController(); setTimeout(()=>ctrl.abort(), 7000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
    if (!r.ok) return [];
    const j = await r.json() as any;
    const out: SourceSnippet[] = ((j.data||[]) as any[]).map((p:any)=>({
      title: String(p.title || '').slice(0, 140),
      url: p.url || (p.openAccessPdf?.url) || (p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : ''),
      snippet: String(p.abstract || p.title || '').slice(0, 280),
      sourceType: 'paper' as const,
      date: p.year ? String(p.year) : '',
      source: 'Semantic Scholar'
    })).filter(x=>x.title && x.url);
    return out.slice(0, limit);
  } catch { return []; }
}
