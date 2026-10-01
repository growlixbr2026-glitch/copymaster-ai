/**
 * Pool multi-chaves — 9Router / OpenRouter.
 *
 * Convenção (sem expor valores em log):
 *   LITELLM_API_KEY_9ROUTER, LITELLM_API_KEY_9ROUTER_2 ... _9
 *   LITELLM_API_KEY_OPENROUTER, LITELLM_API_KEY_OPENROUTER_2 ... _9
 * A UI (SettingsCenter) continua com 1 campo por provider; as chaves extras
 * vivem no `.env` (ou dashboard Vercel em produção) e entram na rotação aqui.
 */

// Máximo de sufixos varridos por provider (base + _2.._9 = até 9 chaves).
export const MAX_POOL_KEYS = 9;

// Mapa provider -> prefixos de env (ordem de prioridade). Generalizado p/ todos
// providers: cada chave suporta sufixos _2.._9 (ex.: GROQ_API_2) e lista _LIST.
// Aliases (_KEY variantes) são aceitos para compat (_KEY vs sem _KEY).
const POOL_ENV_PREFIX: Record<string, string[]> = {
  '9router': ['LITELLM_API_KEY_9ROUTER'],
  'openrouter': ['LITELLM_API_KEY_OPENROUTER', 'OPENROUTER_API_KEY'],
  'nvidia': ['NVIDIA_API'],
  'polinai': ['POLINAI_API'],
  'groq': ['GROQ_API'],
  'grok': ['GROK_API'],
  'mistral': ['MISTRAL_API'],
  'gemini': ['GEMINI_API_KEY', 'API_KEY', 'VITE_GEMINI_API_KEY'],
  'openai': ['OPENAI_API_KEY'],
  'anthropic': ['ANTHROPIC_API_KEY'],
  'deepseek': ['DEEPSEEK_API_KEY'],
  'cohere': ['COHERE_API_KEY'],
  'qwen': ['QWEN_API_KEY'],
  'ernie': ['ERNIE_API_KEY'],
  'moonshot': ['MOONSHOT_API_KEY'],
  'yi': ['YI_API_KEY'],
  'zhipu': ['ZHIPU_API_KEY'],
  'zai': ['ZAI_API_KEY', 'ZHIPU_API_KEY'],
  'hyperclova': ['HYPERCLOVA_API_KEY'],
  'perplexity': ['PERPLEXITY_API_KEY'],
  'huggingface': ['HUGGINGFACE_API_KEY', 'HF_API_KEY'],
  'together': ['TOGETHER_API_KEY'],
  'elevenlabs': ['ELEVENLABS_API_KEY'],
  'stability': ['STABILITY_API_KEY'],
  'runway': ['RUNWAY_API_KEY'],
  'meta': ['META_API_KEY'],
  'cerebras': ['CEREBRAS_API_KEY'],
  'sambanova': ['SAMBANOVA_API_KEY'],
  'chutes': ['CHUTES_API_KEY'],
  'siliconflow': ['SILICONFLOW_API_KEY'],
  'nebius': ['NEBIUS_API_KEY'],
  'cloudflare': ['CLOUDFLARE_API_KEY'],
};

function readEnv(name: string): string {
  try {
    const v = (process.env as any)[name];
    return typeof v === 'string' ? v.trim() : '';
  } catch { return ''; }
}

/** Lista de chaves do `.env`/build para o provider (base + _2.._N), deduplicada. */
export function getEnvKeyList(provider: string): string[] {
  const prefixes = POOL_ENV_PREFIX[provider];
  if (!prefixes) return [];
  // 1) Listas embarcadas pelo build (vite define *_LIST) — acumula de todos os aliases.
  const fromLists: string[] = [];
  for (const prefix of prefixes) {
    const listName = `${prefix}_LIST`;
    try {
      const raw = (process.env as any)[listName];
      if (typeof raw === 'string' && raw.startsWith('[')) {
        const arr = JSON.parse(raw) as unknown;
        if (Array.isArray(arr)) {
          for (const k of arr as unknown[]) if (typeof k === 'string' && k.trim().length >= 8) fromLists.push(k.trim());
        }
      }
    } catch { /* cai para varredura individual */ }
  }
  if (fromLists.length) return [...new Set(fromLists)];
  // 2) Varredura individual (base + _2.._N) — dev, testes e fallback.
  const out: string[] = [];
  for (const prefix of prefixes) {
    const base = readEnv(prefix);
    if (base) out.push(base);
    for (let i = 2; i <= MAX_POOL_KEYS; i++) {
      const v = readEnv(`${prefix}_${i}`);
      if (v) out.push(v);
    }
  }
  return [...new Set(out.filter(k => k.length >= 8))];
}

/** Quantidade de chaves configuradas via env (para UI mascarada — nunca valores). */
export function countEnvKeys(provider: string): number {
  return getEnvKeyList(provider).length;
}

/**
 * Todas as chaves utilizáveis do provider: pool do env + chave do cofre (UI).
 * Ordem: env (pool) primeiro, cofre por último — o loop de fallback tenta
 * sequencialmente, então qualquer chave válida garante funcionamento.
 */
export async function getApiKeys(provider: string): Promise<string[]> {
  const keys = getEnvKeyList(provider);
  try {
    const { getVaultKeys } = await import('./vaultService');
    const vaultKeys = await getVaultKeys(provider);
    for (const k of vaultKeys) if (k && k.trim().length >= 8) keys.push(k.trim());
  } catch { /* sem cofre: segue só com env */ }
  return [...new Set(keys)];
}

export async function countVaultKeys(provider: string): Promise<number> {
  try {
    const { getVaultKeys } = await import('./vaultService');
    return (await getVaultKeys(provider)).length;
  } catch { return 0; }
}

/**
 * Impressão digital curta e não-reversível para mapas de saúde/throttle.
 * Nunca logar a chave completa.
 */
export function keyFingerprint(key: string): string {
  const k = key || '';
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (Math.imul(h, 31) + k.charCodeAt(i)) | 0;
  return `${k.slice(0, 4)}…${k.length}c#${(h >>> 0).toString(16)}`;
}

/**
 * Classifica se o erro deve tentar a PRÓXIMA CHAVE do pool.
 * Inclui 403 tier_not_allowed/forbidden (antes era erro fatal — causa da
 * tela vermelha "This model is not available in your subscription tier").
 */
export function isRetriableError(status: number, bodyText: string): boolean {
  const low = (bodyText || '').toLowerCase();
  // 401 sempre gira o pool: uma chave inválida/expirada não pode matar a
  // requisição quando existem outras chaves (ex.: "User not found").
  // 5xx: instabilidade transitória do gateway NÃO pode abortar a cadeia de
  // fallback (§2 "expande pool … em 429/5xx"). Sem isto, um único 502/503 do
  // primário derrubava a chamada inteira sem girar chave/modelo nem provider.
  if (status >= 500) return true;
  if (status === 401 || status === 429 || status === 402 || status === 404 || status === 400 || status === 410 || status === 403) return true;
  return (
    low.includes('tier_not_allowed') ||
    low.includes('tier not allowed') ||
    low.includes('not available in your subscription') ||
    low.includes('forbidden') ||
    low.includes('insufficient_quota') ||
    low.includes('insufficient quota') ||
    low.includes('quota') ||
    low.includes('rate') ||
    low.includes('no active credentials') ||
    low.includes('model_not_found') ||
    low.includes('not found') ||
    low.includes('end of life') ||
    low.includes('gone') ||
    low.includes('does not exist') ||
    low.includes('no models match') ||
    low.includes('invalid_api_key') ||
    low.includes('invalid api key') ||
    low.includes('unauthorized')
  );
}

// Throttle por chave: evita esgotar o pool em rajada (mínimo entre tentativas).
const MIN_KEY_INTERVAL_MS = 2500;
const lastUse = new Map<string, number>();

export async function waitKeySlot(provider: string, key: string): Promise<void> {
  const fp = `${provider}#${keyFingerprint(key)}`;
  const last = lastUse.get(fp) || 0;
  const wait = MIN_KEY_INTERVAL_MS - (Date.now() - last);
  lastUse.set(fp, Date.now() + Math.max(0, wait));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
}

export function markKeyUsed(provider: string, key: string): void {
  lastUse.set(`${provider}#${keyFingerprint(key)}`, Date.now());
}
