import type { SourceSnippet } from './arxiv';

export async function fetchPubMed(niche: string, limit=3): Promise<SourceSnippet[]> {
  const ctrl = new AbortController(); setTimeout(()=>ctrl.abort(), 7000);
  try {
    const es = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(niche)}&retmax=${limit}&sort=relevance&retmode=json`, { signal: ctrl.signal });
    if (!es.ok) return [];
    const ej = await es.json() as any;
    const ids: string[] = ej?.esearchresult?.idlist || [];
    if (ids.length===0) return [];
    const sum = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(',')}&retmode=json`, { signal: ctrl.signal });
    if (!sum.ok) return ids.map(id=>({ title: `PubMed ${id}`, url:`https://pubmed.ncbi.nlm.nih.gov/${id}/`, snippet:`PubMed artigo sobre ${niche}`, sourceType:'paper' as const, source:'PubMed'}));
    const sj = await sum.json() as any;
    const out: SourceSnippet[] = ids.map(id=>{
      const r = sj?.result?.[id];
      return {
        title: r?.title || `PubMed ${id}`,
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
        snippet: (r?.sortTitle || r?.title || `Artigo sobre ${niche}`).slice(0,280),
        sourceType: 'paper' as const,
        date: (r?.pubdate||'').slice(0,10),
        source: 'PubMed'
      };
    }).filter(x=>x.title);
    return out.slice(0, limit);
  } catch { return []; }
}
