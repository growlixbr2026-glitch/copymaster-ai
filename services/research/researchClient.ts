import type { SourceSnippet } from './providers/arxiv';

type SourceName = 'arxiv' | 'semantic' | 'openalex' | 'pubmed' | 'crossref' | 'bdtd' | 'news' | 'web';

export async function viaServer(source: SourceName, q: string, limit: number): Promise<SourceSnippet[] | null> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(`/api/research?source=${source}&q=${encodeURIComponent(q)}&limit=${limit}`, { signal: ctrl.signal });
    if (!r.ok) return null;
    const j = await r.json() as any;
    if (!j || j.ok !== true || !Array.isArray(j.items)) return null;
    return j.items as SourceSnippet[];
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

export async function fetchSource(source: SourceName, q: string, limit: number): Promise<SourceSnippet[]> {
  const server = await viaServer(source, q, limit);
  if (server && server.length) return server;
  try {
    switch (source) {
      case 'arxiv': {
        const { fetchArxiv } = await import('./providers/arxiv');
        return await fetchArxiv(q, limit);
      }
      case 'semantic': {
        const { fetchSemanticScholar } = await import('./providers/semanticscholar');
        return await fetchSemanticScholar(q, limit);
      }
      case 'openalex': {
        const { fetchOpenAlex } = await import('./providers/openalex');
        return await fetchOpenAlex(q, limit);
      }
      case 'pubmed': {
        const { fetchPubMed } = await import('./providers/pubmed');
        return await fetchPubMed(q, limit);
      }
      case 'crossref': {
        const { fetchScielo } = await import('./providers/scielo');
        return await fetchScielo(q, limit);
      }
      case 'news': {
        const { fetchNewsRss } = await import('./providers/newsRss');
        return await fetchNewsRss(q, limit);
      }
      case 'web': {
        // Fallback client: mesmo feed web do server (Yahoo Search RSS).
        const { fetchNewsRss } = await import('./providers/newsRss');
        const items = await fetchNewsRss(q, limit);
        return items.map((s) => ({ ...s, sourceType: 'blog' as const, source: 'Yahoo Web' }));
      }
      default:
        return server || [];
    }
  } catch {
    return server || [];
  }
}
