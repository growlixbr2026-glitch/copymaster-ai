import type { SourceSnippet } from './arxiv';

export async function fetchScielo(niche: string, limit=3): Promise<SourceSnippet[]> {
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(niche)}&filter=container-title:SciELO&rows=${limit}`;
  const ctrl = new AbortController(); setTimeout(()=>ctrl.abort(), 5000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { 'Accept': 'application/json' } });
    if (!r.ok) return [];
    const j = await r.json() as any;
    const items: SourceSnippet[] = (j.message?.items||[]).map((it:any)=>({
      title: (it.title?.[0]||'').slice(0,120),
      url: it.URL || (it.DOI ? `https://doi.org/${it.DOI}` : ''),
      snippet: (it.abstract || it.title?.[0] || '').replace(/<[^>]*>/g,'').slice(0,280),
      sourceType: 'thesis' as const,
      date: (it.created?.['date-parts']?.[0]?.join('-')||'').slice(0,10),
      source: 'SciELO/Crossref'
    })).filter((x:SourceSnippet)=>x.title && x.url);
    return items.slice(0, limit);
  } catch { return []; }
}
