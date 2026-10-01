import type { SourceSnippet } from './providers/arxiv';

export interface McpServerConfig {
  name: string;
  baseUrl: string;
  endpoints: Record<string, string>;
  headers?: Record<string, string>;
}

export const MCP_SERVERS = {
  exa: {
    name: 'Exa MCP',
    baseUrl: 'https://api.exa.ai/search',
    endpoints: {
      search: '/search',
      click: '/click',
    },
    headers: {
      'Authorization': 'Bearer EXA_API_KEY',
    },
  },
  firecrawl: {
    name: 'Firecrawl MCP',
    baseUrl: 'https://mcp.firecrawl.ai',
    endpoints: {
      crawl: '/v1/crawl',
      search: '/v1/search',
    },
    headers: {
      'Authorization': 'Bearer FIRECRAWL_API_KEY',
    },
  },
  tavily: {
    name: 'Tavily MCP',
    baseUrl: 'https://api.tavily.com/search',
    endpoints: {
      search: '/search',
    },
    headers: {
      'Authorization': 'Bearer TAVILY_API_KEY',
    },
  },
};

export async function fetchViaMcpMarkdown(url: string, server: keyof typeof MCP_SERVERS = 'exa', timeoutMs=7000): Promise<string | null> {
  const config = MCP_SERVERS[server];
  if (!config) return null;

  const ctrl = new AbortController(); setTimeout(()=>ctrl.abort(), timeoutMs);
  try {
    const fullUrl = new URL(config.endpoints.search, config.baseUrl).toString();
    const r = await fetch(fullUrl, { 
      signal: ctrl.signal, 
      headers: { 
        'Accept': 'text/html,*/*',
        ...config.headers 
      } 
    });
    if (!r.ok) return null;
    const html = await r.text();
    let text = html.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'');
    text = text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    return text.slice(0, 4000) || null;
  } catch { return null; }
}

export async function enrichWithMarkdown(snippets: SourceSnippet[], max=2, server: keyof typeof MCP_SERVERS = 'exa'): Promise<SourceSnippet[]> {
  const out = [...snippets];
  const candidates: number[] = [];
  for (let i = 0; i < out.length && candidates.length < max; i++) {
    if (out[i].url.startsWith('http')) candidates.push(i);
  }
  // Paralelo: busca max páginas simultaneamente (antes: sequencial, 2× mais lento).
  const results = await Promise.all(candidates.map(i => fetchViaMcpMarkdown(out[i].url, server)));
  for (let j = 0; j < candidates.length; j++) {
    if (results[j]) out[candidates[j]] = { ...out[candidates[j]], snippet: results[j]!.slice(0, 280) };
  }
  return out;
}
