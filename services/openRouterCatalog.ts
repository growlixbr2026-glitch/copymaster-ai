/**
 * Catálogo de modelos OpenRouter com filtro de gratuitos + pool de rotação.
 * Fonte: GET https://openrouter.ai/api/v1/models (sem chave), cache 24h em
 * localStorage. Fallback: lista curada embutida (sem rede).
 */

export interface FreeModel {
  id: string;
  context: number;
  tags: string[];
}

const CATALOG_CACHE_KEY = 'openrouter_catalog:v1';
const POOL_KEY = 'openrouter_free_pool';
const LAST_MODEL_KEY = 'openrouter_last_model';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Lista curada (fallback offline) — só texto/chat, gratuitos estáveis.
export const CURATED_FREE: FreeModel[] = [
  { id: 'qwen/qwen3.8-27b:free', context: 262144, tags: ['texto'] },
  { id: 'google/gemma-4-26b-a4b-it:free', context: 262144, tags: ['texto'] },
  { id: 'google/gemma-4-31b-it:free', context: 262144, tags: ['texto'] },
  { id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', context: 256000, tags: ['texto', 'raciocínio'] },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', context: 262144, tags: ['texto'] },
  { id: 'cohere/north-mini-code:free', context: 256000, tags: ['texto', 'código'] },
  { id: 'z-ai/glm-5.2:free', context: 32768, tags: ['texto'] },
  { id: 'dots-studio/dots-3-note-preview:free', context: 512000, tags: ['texto'] },
  { id: 'poolside/laguna-s-2.1:free', context: 262144, tags: ['texto', 'código'] },
  { id: 'thinkingmachines/inkling-small:free', context: 1048576, tags: ['texto'] },
  { id: 'inclusionai/ling-3.0-flash-vl:free', context: 262144, tags: ['texto', 'visão'] },
  { id: 'liquid/lfm-2.5-2.6b:free', context: 65536, tags: ['texto', 'rápido'] },
];

function tagModel(id: string): string[] {
  const low = id.toLowerCase();
  const tags: string[] = ['texto'];
  if (/lyria|tts|whisper|audio/.test(low)) tags.push('áudio');
  if (/-vl\b|vision|image/i.test(id)) tags.push('visão');
  if (/reasoning|think|qwq|deepseek-r1/i.test(low)) tags.push('raciocínio');
  if (/code|coder|codestral|laguna|poolside|north/i.test(low)) tags.push('código');
  if (/flash|nano|small|mini|2\.6b|xs/i.test(low)) tags.push('rápido');
  return [...new Set(tags)];
}

function isFree(m: any): boolean {
  try {
    return parseFloat(m?.pricing?.prompt ?? '1') === 0;
  } catch {
    return false;
  }
}

export async function fetchCatalog(): Promise<{ models: FreeModel[]; fromCache: boolean }> {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      if (cached && Date.now() - cached.at < CACHE_TTL_MS && Array.isArray(cached.models) && cached.models.length > 0) {
        return { models: cached.models, fromCache: true };
      }
    }
  } catch { /* sem cache: busca rede */ }
  const res = await fetch('https://openrouter.ai/api/v1/models');
  if (!res.ok) throw new Error(`Catálogo HTTP ${res.status}`);
  const json = await res.json();
  const models: FreeModel[] = ((json.data || []) as any[])
    .filter(isFree)
    .map((m) => ({ id: String(m.id), context: Number(m.context_length) || 0, tags: tagModel(String(m.id)) }))
    .filter((m) => m.id.endsWith(':free'));
  if (models.length === 0) throw new Error('Catálogo vazio');
  try {
    localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({ at: Date.now(), models }));
  } catch { /* quota: segue sem cache */ }
  return { models, fromCache: false };
}

/** Pool de rotação: seleção do usuário ou curadoria padrão. */
export function getSelectedPool(fallbackDefault: string): string[] {
  try {
    const raw = localStorage.getItem(POOL_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        const clean = [...new Set(arr.filter((x: any) => typeof x === 'string' && x.trim().length > 3))];
        if (clean.length > 0) return clean;
      }
    }
  } catch { /* usa padrão */ }
  const curated = CURATED_FREE.slice(0, 6).map((m) => m.id);
  if (fallbackDefault && !curated.includes(fallbackDefault)) curated.unshift(fallbackDefault);
  return [...new Set(curated)];
}

export function setSelectedPool(ids: string[]): void {
  try {
    localStorage.setItem(POOL_KEY, JSON.stringify([...new Set(ids)]));
  } catch { /* quota: ignora */ }
}

export function getLastModel(): string | null {
  try {
    return localStorage.getItem(LAST_MODEL_KEY);
  } catch {
    return null;
  }
}

export function setLastModel(id: string): void {
  try {
    localStorage.setItem(LAST_MODEL_KEY, id);
  } catch { /* quota: ignora */ }
}

export function shortName(id: string): string {
  const base = id.replace(/:free$/, '');
  const parts = base.split('/');
  return parts.length > 1 ? parts.slice(1).join('/') : base;
}
