/**
 * Auditoria de chaves ("Testar tudo") + mapa de saúde persistido.
 *
 * - Lista TODAS as chaves configuradas (env pool + cofre + legado) por provider.
 * - Certifica cada uma com micro-call ("Responda apenas OK"), concorrência 3.
 * - Persiste `copymaster_keyhealth:v1` {provider, fp, ok, latency, at}.
 * - Leitores síncronos (localStorage puro) para uso no rank sem ciclos.
 *
 * Sem importar aiClient estaticamente (só dynamic) para não criar ciclo
 * com routerService -> aiClient.
 */

export interface KeyHealthEntry {
  provider: string;
  fp: string;
  ok: boolean;
  latency: number;
  at: number;
}

export interface KeyHealthMap {
  at: number;
  keys: KeyHealthEntry[];
}

export const KEYHEALTH_KEY = 'copymaster_keyhealth:v1';
// Mapa envelhece em 24h; falhas em produção o invalidam na hora (ver touchDead).
export const KEYHEALTH_TTL_MS = 24 * 3600 * 1000;
const CERT_CONCURRENCY = 3;

function safeGet(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}

// Mesmo mapa provider->env de aiClient.resolveEnvKey (espelho; sem importar).
const ENV_SINGLE: Record<string, string[]> = {
  gemini: ['API_KEY', 'GEMINI_API_KEY', 'VITE_GEMINI_API_KEY'],
  '9router': ['LITELLM_API_KEY_9ROUTER'],
  openrouter: ['LITELLM_API_KEY_OPENROUTER'],
  nvidia: ['NVIDIA_API'],
  polinai: ['POLINAI_API'],
  groq: ['GROQ_API'],
  grok: ['GROK_API'],
  mistral: ['MISTRAL_API'],
  openai: ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY'],
  deepseek: ['DEEPSEEK_API_KEY'],
  meta: ['META_API_KEY'],
  cohere: ['COHERE_API_KEY'],
  qwen: ['QWEN_API_KEY'],
  ernie: ['ERNIE_API_KEY'],
  moonshot: ['MOONSHOT_API_KEY'],
  yi: ['YI_API_KEY'],
  zhipu: ['ZHIPU_API_KEY'],
  zai: ['ZAI_API_KEY', 'ZHIPU_API_KEY'],
  hyperclova: ['HYPERCLOVA_API_KEY'],
  perplexity: ['PERPLEXITY_API_KEY'],
  huggingface: ['HUGGINGFACE_API_KEY', 'HF_API_KEY'],
  together: ['TOGETHER_API_KEY'],
  elevenlabs: ['ELEVENLABS_API_KEY'],
  stability: ['STABILITY_API_KEY'],
  runway: ['RUNWAY_API_KEY'],
  cerebras: ['CEREBRAS_API_KEY'],
  sambanova: ['SAMBANOVA_API_KEY'],
  chutes: ['CHUTES_API_KEY'],
  siliconflow: ['SILICONFLOW_API_KEY'],
  nebius: ['NEBIUS_API_KEY'],
  cloudflare: ['CLOUDFLARE_API_KEY'],
};

function readEnvVar(name: string): string {
  try {
    const v = (process.env as any)[name];
    return typeof v === 'string' ? v.trim() : '';
  } catch { return ''; }
}

/** Todas as chaves configuradas: [{provider, key, source}]. Sem valores em log. */
export async function listConfiguredKeys(): Promise<Array<{ provider: string; key: string; source: string }>> {
  const out: Array<{ provider: string; key: string; source: string }> = [];
  const seen = new Set<string>();
  const push = (provider: string, key: string, source: string) => {
    const k = (key || '').trim();
    if (k.length < 8) return;
    const id = `${provider}#${k}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ provider, key: k, source });
  };
  // Pool env generalizado: todos os providers suportam _2.._9 (ex.: GROQ_API_2).
  try {
    const { getEnvKeyList } = await import('./keyPoolService');
    const poolProviders = ['9router','openrouter','nvidia','polinai','groq','grok','mistral','gemini','openai','anthropic','deepseek','cohere','qwen','ernie','moonshot','yi','zhipu','zai','hyperclova','perplexity','huggingface','together','elevenlabs','stability','runway','meta','cerebras','sambanova','chutes','siliconflow','nebius','cloudflare'];
    for (const p of poolProviders) {
      for (const k of getEnvKeyList(p)) push(p, k, 'env-pool');
    }
  } catch {}
  // Singles env.
  for (const [p, names] of Object.entries(ENV_SINGLE)) {
    for (const n of names) {
      const v = readEnvVar(n);
      if (v) push(p, v, 'env');
    }
  }
  // Cofre (multi: 1..N por provider, ex.: 3 OpenRouter de 3 e-mails).
  try {
    const { listVaultProvidersMulti, getVaultKeys } = await import('./vaultService');
    for (const p of listVaultProvidersMulti()) {
      try {
        const arr = await getVaultKeys(p);
        for (const v of arr) if (v) push(p, v, 'vault');
      } catch {}
    }
  } catch {}
  // Legado *_api_key (não migrado ainda).
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.endsWith('_api_key') && !k.includes('vault')) {
        const v = safeGet(k);
        if (v) push(k.replace(/_api_key$/, ''), v, 'legacy');
      }
    }
  } catch {}
  return out;
}

function fingerprint(key: string): string {
  const k = key || '';
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (Math.imul(h, 31) + k.charCodeAt(i)) | 0;
  return `${k.slice(0, 4)}…${k.length}c#${(h >>> 0).toString(16)}`;
}

/** Certifica todas as chaves (concorrência limitada). Persiste o mapa. */
export async function certifyAllKeys(
  onProgress?: (done: number, total: number, provider: string, ok: boolean) => void,
): Promise<KeyHealthMap> {
  const { testConnection } = await import('./core/aiClient');
  const listed = await listConfiguredKeys();
  const results: KeyHealthEntry[] = [];
  let done = 0;
  const queue = [...listed];
  const workers = Array.from({ length: Math.min(CERT_CONCURRENCY, Math.max(1, queue.length)) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) break;
      const t0 = Date.now();
      let ok = false;
      try {
        const r = await testConnection(item.provider, item.key);
        ok = !!(r && r.success);
      } catch { ok = false; }
      results.push({ provider: item.provider, fp: fingerprint(item.key), ok, latency: Date.now() - t0, at: Date.now() });
      done++;
      try { onProgress?.(done, listed.length, item.provider, ok); } catch {}
    }
  });
  await Promise.all(workers);
  const map: KeyHealthMap = { at: Date.now(), keys: results };
  try { localStorage.setItem(KEYHEALTH_KEY, JSON.stringify(map)); } catch {}
  return map;
}

/** Leitura síncrona do mapa (para rankProviders, sem async/ciclos). */
export function readHealthMap(): KeyHealthMap | null {
  try {
    const raw = safeGet(KEYHEALTH_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (!j || !Array.isArray(j.keys)) return null;
    return j as KeyHealthMap;
  } catch { return null; }
}

export function isHealthFresh(map: KeyHealthMap | null): boolean {
  if (!map) return false;
  return Date.now() - (map.at || 0) < KEYHEALTH_TTL_MS;
}

/** Status agregado do provider: 'ok' (≥1 chave ok fresca) | 'dead' (todas mortas frescas) | 'unknown'. */
export function providerKeyStatus(provider: string): { status: 'ok' | 'dead' | 'unknown'; latency: number | null; checked: number } {
  const map = readHealthMap();
  if (!isHealthFresh(map)) return { status: 'unknown', latency: null, checked: 0 };
  const rows = (map as KeyHealthMap).keys.filter((k) => k.provider === provider);
  if (!rows.length) return { status: 'unknown', latency: null, checked: 0 };
  const oks = rows.filter((r) => r.ok);
  if (!oks.length) return { status: 'dead', latency: Math.min(...rows.map((r) => r.latency)), checked: rows.length };
  return { status: 'ok', latency: Math.min(...oks.map((r) => r.latency)), checked: rows.length };
}

/** Marca provider como morto AGORA (falha em produção invalida o mapa na hora). */
export function touchDead(provider: string): void {
  try {
    const map = readHealthMap();
    if (!map) return;
    let changed = false;
    for (const k of map.keys) {
      if (k.provider === provider && k.ok) { k.ok = false; k.at = Date.now(); changed = true; }
    }
    if (changed) {
      map.at = Date.now();
      localStorage.setItem(KEYHEALTH_KEY, JSON.stringify(map));
    }
  } catch {}
}
