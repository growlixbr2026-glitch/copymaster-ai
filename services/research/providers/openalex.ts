import type { SourceSnippet } from './arxiv';

export async function fetchOpenAlex(niche: string, limit=4): Promise<SourceSnippet[]> {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(niche)}&per_page=${limit}&sort=cited_by_count:desc`;
  const ctrl = new AbortController(); setTimeout(()=>ctrl.abort(), 6000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) return [];
    const j = await r.json() as any;
    const results: SourceSnippet[] = (j.results||[]).map((w:any)=>({
      title: w.title || w.display_name || '',
      url: w.id?.startsWith('https://openalex.org/') ? `https://openalex.org/${w.id.split('/').pop()}` : (w.doi ? `https://doi.org/${String(w.doi).replace('https://doi.org/','')}` : w.id || ''),
      snippet: (w.abstract_inverted_index ? Object.keys(w.abstract_inverted_index).slice(0,40).join(' ') : '').slice(0,280) || w.title || '',
      sourceType: 'paper' as const,
      date: (w.publication_date || '').slice(0,10),
      source: 'OpenAlex'
    })).filter((x:SourceSnippet)=>x.title && x.url);
    return results.slice(0, limit);
  } catch { return []; }
}
