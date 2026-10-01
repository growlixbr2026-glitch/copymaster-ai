import type { SourceSnippet } from './providers/arxiv';
import { fetchSource } from './researchClient';
import { enrichWithMarkdown, MCP_SERVERS } from './mcpFetchAdapter';

const CACHE_PREFIX = 'copymaster_research:v2:';
const CACHE_TTL = 6 * 60 * 60 * 1000;

function cacheKey(niche: string, language: string, scope?: string) { return `${CACHE_PREFIX}${language}${scope ? ':' + scope : ''}:${niche.toLowerCase().trim().slice(0,80)}`; }
function getCached(niche: string, language: string, scope?: string): SourceSnippet[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKey(niche, language, scope));
    if (!raw) return null;
    const { at, data } = JSON.parse(raw);
    if (Date.now() - at > CACHE_TTL) { localStorage.removeItem(cacheKey(niche, language, scope)); return null; }
    return data as SourceSnippet[];
  } catch { return null; }
}
function setCached(niche: string, language: string, data: SourceSnippet[], scope?: string) {
  try { localStorage.setItem(cacheKey(niche, language, scope), JSON.stringify({ at: Date.now(), data })); } catch {}
}

function dedup(snippets: SourceSnippet[]): SourceSnippet[] {
  const seen = new Set<string>();
  const out: SourceSnippet[] = [];
  for (const s of snippets) {
    const k = (s.url || '').toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

export function getCachedResearch(niche: string, language: string, scope?: string): SourceSnippet[] | null {
  return getCached(niche, language, scope);
}

export function setCachedResearch(niche: string, language: string, data: SourceSnippet[], scope?: string): void {
  setCached(niche, language, data, scope);
}

export function dedupeSnippets(snippets: SourceSnippet[]): SourceSnippet[] {
  return dedup(snippets);
}

export async function gatherResearch(niche: string, language: string, opts?: { maxPerType?: number, server?: keyof typeof MCP_SERVERS }): Promise<SourceSnippet[]> {
  const cached = getCached(niche, language);
  if (cached && cached.length) return cached;

  const limit = opts?.maxPerType ?? 4;
  const server = opts?.server ?? 'exa';
  const tasks: Promise<SourceSnippet[]>[] = [
    fetchSource('semantic', niche, Math.min(limit, 4)),
    fetchSource('arxiv', niche, Math.min(limit, 3)),
    fetchSource('openalex', niche, Math.min(limit, 3)),
    fetchSource('pubmed', niche, 2),
    fetchSource('crossref', niche, 2),
    fetchSource('news', niche, 4),
  ];

  const settled = await Promise.allSettled(tasks);
  const flat: SourceSnippet[] = [];
  for (const r of settled) if (r.status === 'fulfilled') flat.push(...r.value);

  let merged = dedup(flat.filter(s => s.title && s.snippet));
  if (merged.length === 0) return [];
  merged = merged.slice(0, 12);
  if (merged.length > 1) try { merged = await enrichWithMarkdown(merged, 1, server); } catch {}
  setCached(niche, language, merged);
  return merged;
}

export function snippetsToGroundingBlock(snippets: SourceSnippet[]): string {
  if (!snippets.length) return '';
  const lines = snippets.map((s, i) => `[FONTE ${i+1} | ${s.source} | ${s.sourceType.toUpperCase()}] ${s.title} — ${s.snippet.slice(0,180)} — ${s.url}`);
  return `\n\nFONTES VERIFICADAS (GRATUITAS, USE PARA CITAR E NÃO INVENTAR LINKS):\n${lines.join('\n')}\n`;
}

export function citingInstructions(): string {
  return `⚠️ CITE AS FONTES REAIS ACIMA QUANDO AFIRMAR FATOS. LINKS DEVEM SER EXATAMENTE OS LISTADOS. SE NÃO HOUVER FONTE PARA UM FATO, USE [INSERIR DADO] OU [FONTE NÃO INFORMADA] (Item 14/32 da Constituição).`;
}
