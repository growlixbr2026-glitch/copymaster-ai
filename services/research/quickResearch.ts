import type { SourceSnippet } from './providers/arxiv';
import { fetchSource, viaServer } from './researchClient';
import { getCachedResearch, setCachedResearch, dedupeSnippets } from './researchOrchestrator';

export interface RankedSnippet extends SourceSnippet {
  score: number;
}

export type QuickFilter = 'top' | 'recent' | 'papers' | 'news';

/** Escopo da Pesquisa Instantânea: onde o sistema procura. */
export type ResearchScope = 'auto' | 'geral' | 'noticias' | 'academico';

export const RESEARCH_SCOPE_STORAGE_KEY = 'copymaster_research_scope:v1';

// Config por escopo: fontes + timeout. `geral` = DDG/Bing/Yahoo (busca web,
// ~8s). `noticias` = Google News RSS + jornais (~3s). `academico` = 5 bancos
// de teses Brasil+mundo (~6s). `auto` = sistema escolhe.
const SCOPE_TIMEOUT: Record<ResearchScope, number> = {
  geral: 8000,
  noticias: 3000,
  academico: 6000,
  auto: 8000,
};

export function scopeTimeout(scope: ResearchScope): number {
  return SCOPE_TIMEOUT[scope] ?? SCOPE_TIMEOUT.auto;
}

const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas', 'para', 'pra',
  'com', 'sem', 'por', 'que', 'como', 'uma', 'uns', 'umas', 'se', 'sua', 'seu',
  'e', 'o', 'a', 'os', 'as', 'um', 'the', 'and', 'for', 'with', 'from', 'les',
]);

function isClickableUrl(raw: string): boolean {
  try {
    const u = new URL((raw || '').trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    if (!h.includes('.')) return false;
    if (/duckduckgo\.com|bing\.com|yahoo\.com/i.test(h)) return false;
    if (/google\./i.test(h) && !/^news\.google\.com$/i.test(h)) return false;
    return true;
  } catch {
    return false;
  }
}

function cleanHtml(text: string): string {
  // Ordem importa: decodifica entities PRIMEIRO, depois stripa tags (2ª passada
  // pega tags reveladas pelo decode), senão sobra `a href="https://..."` literal.
  const decoded = (text || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, ' ')
    .replace(/&nbsp;|&hellip;/gi, ' ');
  const stripped = decoded.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (/href\s*=\s*["']?https?:/i.test(stripped)) return '';
  return stripped;
}

function tokens(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function recencyBoost(date?: string): number {
  if (!date) return 0;
  const t = Date.parse(date);
  if (isNaN(t)) return 0;
  const years = (Date.now() - t) / (365 * 24 * 3600 * 1000);
  if (years < 0) return 0;
  if (years <= 1) return 1.5;
  if (years <= 3) return 0.5;
  return 0;
}

function typeBoost(t: SourceSnippet['sourceType']): number {
  if (t === 'news') return 2;
  if (t === 'blog') return 1;
  return 0;
}

/**
 * HyDE (Hypothetical Document Embedding) — técnica do Prompt-Engineering-Guide.
 * Gera um documento hipotético a partir da query para melhorar a recuperação.
 * Em vez de buscar pela query original, buscamos por um documento que responderia à query.
 */
export function generateHypotheticalDocument(query: string, language: string): string {
  // Simplificação: cria um documento hipotético baseado na query
  // Em produção, isso seria feito com um LLM
  const templates: Record<string, string> = {
    pt: `Este documento aborda ${query}. Apresenta informações detalhadas sobre o tema, incluindo conceitos fundamentais, aplicações práticas e tendências atuais. O conteúdo é estruturado para fornecer uma visão abrangente e atualizada do assunto.`,
    en: `This document covers ${query}. It presents detailed information on the topic, including fundamental concepts, practical applications, and current trends. The content is structured to provide a comprehensive and up-to-date overview of the subject.`,
    es: `Este documento aborda ${query}. Presenta información detallada sobre el tema, incluyendo conceptos fundamentales, aplicaciones prácticas y tendencias actuales. El contenido está estructurado para proporcionar una visión completa y actualizada del tema.`,
  };
  return templates[language] || templates.pt;
}

/**
 * Re-ranking com diversidade — evita resultados muito similares entre si.
 * Inspirado em técnicas de RAG do Prompt-Engineering-Guide.
 */
export function diversifyResults(snippets: SourceSnippet[], maxResults: number = 10): SourceSnippet[] {
  if (snippets.length <= maxResults) return snippets;
  
  const selected: SourceSnippet[] = [];
  const usedTitles = new Set<string>();
  
  // Primeiro: pega os top resultados com títulos diferentes
  for (const snippet of snippets) {
    if (selected.length >= maxResults) break;
    
    // Normaliza título para comparação
    const normalizedTitle = snippet.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isDuplicate = Array.from(usedTitles).some(t => 
      t.includes(normalizedTitle) || normalizedTitle.includes(t)
    );
    
    if (!isDuplicate) {
      selected.push(snippet);
      usedTitles.add(normalizedTitle);
    }
  }
  
  // Se não tem suficientes, preenche com os restantes
  if (selected.length < maxResults) {
    for (const snippet of snippets) {
      if (selected.length >= maxResults) break;
      if (!selected.includes(snippet)) {
        selected.push(snippet);
      }
    }
  }
  
  return selected;
}

// Intenção comercial/prospecção/social: teses acadêmicas (SciELO/Crossref/PubMed)
// quase nunca são aderentes — ex.: "prospecção no LinkedIn" caía em tese de
// "prospecção tecnológica do concreto". Detecta para despriorizar essas fontes.
const COMMERCIAL_HINTS = new Set([
  'linkedin', 'prospeccao', 'prospecção', 'prospect', 'outreach', 'lead', 'leads',
  'vendas', 'venda', 'vender', 'funil', 'copywriting', 'trafego', 'tráfego',
  'social', 'selling', 'cold', 'crm', 'follow', 'cadencia', 'cadência',
  'marketing', 'dentista', 'dentistas', 'odontologia', 'odontologico',
  'clinica', 'clinicas', 'clinico', 'medico', 'medicos', 'medicina',
  'advocacia', 'advogado', 'contabil', 'imobiliaria', 'estetica',
]);

export function detectCommercialIntent(niche: string): boolean {
  const toks = tokens(niche);
  return toks.some((t) => COMMERCIAL_HINTS.has(t));
}

function commercialPenalty(s: SourceSnippet, isCommercial: boolean): number {
  if (!isCommercial) return 0;
  // Tese acadêmica nunca é boa resposta para prospecção/vendas.
  if (s.sourceType === 'thesis') return -5;
  // Paper vindo de fonte acadêmica (SciELO/PubMed/Crossref) também penaliza.
  if (s.sourceType === 'paper' && /scielo|crossref|pubmed/i.test(s.source || '')) return -5;
  return 0;
}

function termHit(term: string, toks: string[]): boolean {
  // Mesmo fuzzy do rank: radical de 5 chars (dentistas casa dentista).
  return toks.some((t) => t === term || (term.length > 4 && t.startsWith(term.slice(0, 5))));
}

/** Cobertura: fração dos termos do nicho presentes no título/corpo. */
export function coverageOf(snippets: Pick<SourceSnippet, 'title' | 'snippet'>, niche: string): number {
  const terms = tokens(niche);
  if (!terms.length) return 0;
  const titleToks = tokens(snippets.title);
  const bodyToks = tokens(snippets.snippet);
  const hit = terms.filter((term) => termHit(term, titleToks) || termHit(term, bodyToks)).length;
  return hit / terms.length;
}

/**
 * Fase 1 (instantânea, custo 0): coleta paralela limitada com timeout global —
 * retorna o que chegou (parcial ok), sem enriquecimento HTML.
 * Reaproveita o cache de 6h do orchestrator (chave inclui o escopo).
 * `geral` = news + web em paralelo (Google-like, ~3-5s);
 * `noticias` = 1 fonte (news) via server-only, ~2-3s.
 */
export async function quickResearch(
  niche: string,
  language: string,
  opts?: { maxPerType?: number; timeoutMs?: number; scope?: ResearchScope }
): Promise<SourceSnippet[]> {
  const q = (niche || '').trim();
  if (!q) return [];
  const scope = opts?.scope ?? 'auto';
  const cached = getCachedResearch(q, language, scope);
  if (cached && cached.length) return cached;

  // Fast-path: via server-only, sem fallback client (sem 2º round de fetch
  // nem DOMParser). `noticias` = 1 fonte (news); `geral` = news + web em
  // paralelo (blogs, guias, landing pages — Google-like).
  if (scope === 'noticias') {
    try {
      const items = await Promise.race([
        viaServer('news', q, 6),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), opts?.timeoutMs ?? scopeTimeout(scope))),
      ]);
      const merged = (items || [])
        .filter((s) => s && s.title && s.snippet)
        .map((s) => ({ ...s, title: cleanHtml(s.title).slice(0, 140), snippet: cleanHtml(s.snippet).slice(0, 500) }))
        .slice(0, 6);
      if (merged.length) setCachedResearch(q, language, merged, scope);
      return merged;
    } catch {
      return [];
    }
  }
  if (scope === 'geral') {
    // WEB-ONLY: DDG + Bing + Yahoo + SearxNG (como no navegador).
    // Google News fica no escopo `noticias`.
    try {
      const budget = opts?.timeoutMs ?? scopeTimeout(scope);
      const webItems = await Promise.race([
        viaServer('web', q, 15),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), budget)),
      ]);
      let lists = [...(webItems || [])];
      // Fallback: se web somou <3, tenta新闻 como backup (DDG/Bing podem estar bloqueados).
      if (lists.length < 3) {
        try {
          const extraNews = await Promise.race([
            viaServer('news', q, 8),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
          ]);
          if (extraNews && extraNews.length) lists = [...lists, ...extraNews];
        } catch {}
      }
      const merged = dedupeSnippets(
        lists
          .filter((s) => s && s.title && s.snippet && isClickableUrl(s.url))
          .map((s) => ({ ...s, title: cleanHtml(s.title).slice(0, 140), snippet: cleanHtml(s.snippet).slice(0, 500) }))
      ).slice(0, 15);
      // Não cacheia migalha (0-1): evita travar retry em stale de 6h.
      if (merged.length >= 2) setCachedResearch(q, language, merged, scope);
      return merged;
    } catch {
      return [];
    }
  }

  const limit = opts?.maxPerType ?? 2;
  const collected: SourceSnippet[][] = [];
  if (scope === 'academico') {
    // Teses/TCC/monografias Brasil + mundo: 6 fontes acadêmicas.
    // Brasil: BDTD (teses brasileiras), SciELO/Crossref.
    // Mundo: Semantic Scholar, OpenAlex, arXiv, PubMed.
    const jobs = [
      fetchSource('semantic', q, limit),
      fetchSource('openalex', q, limit),
      fetchSource('arxiv', q, limit),
      fetchSource('pubmed', q, 2),
      fetchSource('crossref', q, 2),
      viaServer('bdtd', q, limit).then((r) => r || []),
    ].map((p) =>
      p.then((r) => { collected.push(r); }).catch(() => {})
    );
    await Promise.race([
      Promise.allSettled(jobs),
      new Promise((resolve) => setTimeout(resolve, opts?.timeoutMs ?? scopeTimeout(scope))),
    ]);
  } else {
    // auto: comportamento atual — query comercial pula teses e PubMed.
    const isCommercial = detectCommercialIntent(q);
    const jobs = [
      fetchSource('news', q, 4),
      fetchSource('semantic', q, limit),
      fetchSource('arxiv', q, limit),
      fetchSource('openalex', q, limit),
      ...(isCommercial ? [] : [fetchSource('pubmed', q, 2), fetchSource('crossref', q, 2)]),
    ].map((p) =>
      p.then((r) => { collected.push(r); }).catch(() => {})
    );
    await Promise.race([
      Promise.allSettled(jobs),
      new Promise((resolve) => setTimeout(resolve, opts?.timeoutMs ?? scopeTimeout(scope))),
    ]);
  }
  const merged = dedupeSnippets(
    collected
      .flat()
      .filter((s) => s && s.title && s.snippet)
      .map((s) => ({ ...s, title: cleanHtml(s.title).slice(0, 140), snippet: cleanHtml(s.snippet).slice(0, 500) }))
  ).slice(0, 12);
  if (merged.length) setCachedResearch(q, language, merged, scope);
  return merged;
}

/** Ordena por aderência ao nicho (TF local título×3 + snippet + boost tipo + recentismo). */
export function rankSnippets(snippets: SourceSnippet[], niche: string, opts?: { scope?: ResearchScope }): RankedSnippet[] {
  const terms = tokens(niche);
  // No escopo acadêmico o usuário pediu teses de propósito — sem penalidade.
  const isCommercial = opts?.scope !== 'academico' && detectCommercialIntent(niche);
  const ranked = snippets.map((s) => {
    const titleToks = tokens(s.title);
    const bodyToks = tokens(s.snippet);
    let score = 0;
    for (const term of terms) {
      const inTitle = titleToks.filter((t) => t === term || (term.length > 4 && t.startsWith(term.slice(0, 5)))).length;
      const inBody = bodyToks.filter((t) => t === term || (term.length > 4 && t.startsWith(term.slice(0, 5)))).length;
      score += inTitle * 3 + inBody;
    }
    // Cobertura: fração dos termos do nicho presentes (fuzzy, igual coverageOf)
    const hit = terms.filter((term) => termHit(term, titleToks) || termHit(term, bodyToks)).length;
    if (terms.length) score += (hit / terms.length) * 4;
    score += typeBoost(s.sourceType) + recencyBoost(s.date) + commercialPenalty(s, isCommercial);
    return { ...s, score: Math.round(score * 10) / 10 };
  });
  return ranked.sort((a, b) => b.score - a.score);
}

/**
 * Gate de irrelevância: remove resultados com aderência baixa em vez de
 * exibir tese sem relação como "Mais aderente". Default calibrado no caso
 * "prospecção no LinkedIn" (teses com 1-2/7 termos caem fora) sem afetar
 * queries científicas curtas (1 termo com hit = cobertura 1.0).
 */
export function filterByRelevance(
  snippets: RankedSnippet[],
  niche: string,
  opts?: { minScore?: number; minCoverage?: number; scope?: ResearchScope }
): RankedSnippet[] {
  // Geral é Google-like: gate relaxado (mostra top mesmo com aderência
  // parcial; a UI avisa). Demais escopos mantêm o gate estrito.
  const relaxed = opts?.scope === 'geral';
  const minScore = opts?.minScore ?? (relaxed ? 2 : 4);
  const minCoverage = opts?.minCoverage ?? (relaxed ? 0.2 : 0.3);
  return snippets.filter((s) => s.score >= minScore && coverageOf(s, niche) >= minCoverage);
}

export function filterSnippets(snippets: RankedSnippet[], filter: QuickFilter): RankedSnippet[] {
  switch (filter) {
    case 'papers':
      return snippets.filter((s) => s.sourceType === 'paper' || s.sourceType === 'thesis');
    case 'news':
      return snippets.filter((s) => s.sourceType === 'news' || s.sourceType === 'blog');
    case 'recent': {
      const withDate = snippets.filter((s) => s.date && !isNaN(Date.parse(s.date)));
      const undated = snippets.filter((s) => !s.date || isNaN(Date.parse(s.date as string)));
      withDate.sort((a, b) => Date.parse(b.date as string) - Date.parse(a.date as string));
      return [...withDate, ...undated];
    }
    case 'top':
    default:
      return [...snippets].sort((a, b) => b.score - a.score);
  }
}
