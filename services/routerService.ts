import { PROVIDER_CONFIGS } from './core/aiClient';
import { getServerKeyMap } from './serverKeyService';
import { getCurrentCycleUsage } from './usageService';
import { hasVaultKey, listVaultProviders } from './vaultService';
import { readHealthMap, isHealthFresh } from './keyHealthService';

const healthCache = new Map<string, { latency: number; at: number }>();
const HEALTH_TTL = 60_000;

// Cache do ranking por 5s — evita re-escanear localStorage + 32× JSON.parse
// durante chamadas paralelas (ex.: Ideas com 4 callAI simultâneos).
let _rankCache: { result: string[]; at: number } | null = null;
const RANK_CACHE_TTL = 5_000;
export function invalidateRankCache() { _rankCache = null; }

function isProviderDead(provider: string, healthMap: any): boolean {
  if (!healthMap || !isHealthFresh(healthMap)) return false;
  const rows = healthMap.keys.filter((k: any) => k.provider === provider);
  if (!rows.length) return false;
  return rows.every((r: any) => !r.ok);
}

export function setHealth(provider: string, latency: number, keyHash?: string) {
  healthCache.set(keyHash ? `${provider}#${keyHash}` : provider, { latency, at: Date.now() });
}

export function getHealth(provider: string, keyHash?: string): number | null {
  const h = healthCache.get(keyHash ? `${provider}#${keyHash}` : provider);
  if (!h) return null;
  if (Date.now() - h.at > HEALTH_TTL) { healthCache.delete(keyHash ? `${provider}#${keyHash}` : provider); return null; }
  return h.latency;
}

const ENV_PROVIDERS = ['9router','openrouter','nvidia','polinai','groq','grok','mistral','gemini','openai','anthropic','deepseek','meta','cohere','qwen','ernie','moonshot','yi','zhipu','zai','hyperclova','perplexity','huggingface','together','elevenlabs','stability','runway','cerebras','sambanova','chutes','siliconflow','nebius','cloudflare'];
function hasEnvKey(p: string): boolean {
  // PROD: chaves do servidor (proxy /api/ai) contam como "tem chave" — sem
  // isso o ranking só veria cofre/legado (bundle sem segredos) e a cadeia de
  // fallback encolheria p/ 1 provider. Em dev o mapa fica null (gate fechado).
  try { if (getServerKeyMap()?.[p]) return true; } catch {}
  try {
    if (p === '9router') return !!((process.env as any).LITELLM_API_KEY_9ROUTER);
    if (p === 'openrouter') return !!((process.env as any).LITELLM_API_KEY_OPENROUTER || (process.env as any).OPENROUTER_API_KEY);
    if (p === 'nvidia') return !!((process.env as any).NVIDIA_API || (process.env as any).NVIDEA_API);
    if (p === 'polinai') return !!((process.env as any).POLINAI_API);
    if (p === 'groq') return !!((process.env as any).GROQ_API || (process.env as any).GROQ_API_KEY);
    if (p === 'grok') return !!((process.env as any).GROK_API || (process.env as any).GROK_API_KEY);
    if (p === 'mistral') return !!((process.env as any).MISTRAL_API || (process.env as any).MISTRAL_api);
    if (p === 'cerebras') return !!((process.env as any).CEREBRAS_API_KEY);
    if (p === 'sambanova') return !!((process.env as any).SAMBANOVA_API_KEY);
    if (p === 'chutes') return !!((process.env as any).CHUTES_API_KEY);
    if (p === 'siliconflow') return !!((process.env as any).SILICONFLOW_API_KEY);
    if (p === 'zai') return !!((process.env as any).ZAI_API_KEY || (process.env as any).ZHIPU_API_KEY);
    if (p === 'zhipu') return !!((process.env as any).ZHIPU_API_KEY);
    if (p === 'nebius') return !!((process.env as any).NEBIUS_API_KEY);
    if (p === 'deepseek') return !!((process.env as any).DEEPSEEK_API_KEY);
    if (p === 'meta') return !!((process.env as any).META_API_KEY);
    if (p === 'cohere') return !!((process.env as any).COHERE_API_KEY);
    if (p === 'cloudflare') return !!((process.env as any).CLOUDFLARE_API_KEY);
    if (p === 'gemini') return !!((process.env as any).API_KEY || (process.env as any).GEMINI_API_KEY || (process.env as any).VITE_GEMINI_API_KEY);
    if (p === 'openai') return !!((process.env as any).OPENAI_API_KEY);
    if (p === 'anthropic') return !!((process.env as any).ANTHROPIC_API_KEY);
    if (p === 'qwen') return !!((process.env as any).QWEN_API_KEY);
    if (p === 'ernie') return !!((process.env as any).ERNIE_API_KEY);
    if (p === 'moonshot') return !!((process.env as any).MOONSHOT_API_KEY);
    if (p === 'yi') return !!((process.env as any).YI_API_KEY);
    if (p === 'hyperclova') return !!((process.env as any).HYPERCLOVA_API_KEY);
    if (p === 'perplexity') return !!((process.env as any).PERPLEXITY_API_KEY);
    if (p === 'huggingface') return !!((process.env as any).HUGGINGFACE_API_KEY || (process.env as any).HF_API_KEY);
    if (p === 'together') return !!((process.env as any).TOGETHER_API_KEY);
    if (p === 'elevenlabs') return !!((process.env as any).ELEVENLABS_API_KEY);
    if (p === 'stability') return !!((process.env as any).STABILITY_API_KEY);
    if (p === 'runway') return !!((process.env as any).RUNWAY_API_KEY);
  } catch {}
  return false;
}

export function rankProviders(taskType: 'text' | 'visual' = 'text'): string[] {
  // Cache de 5s: chamadas paralelas (Ideas 4×) reusam o mesmo ranking.
  if (_rankCache && Date.now() - _rankCache.at < RANK_CACHE_TTL) return _rankCache.result;

  const fromVault = listVaultProviders().filter(p => PROVIDER_CONFIGS[p] && (PROVIDER_CONFIGS[p].url !== '' || p === 'gemini'));
  const fromEnv = ENV_PROVIDERS.filter(p => hasEnvKey(p) && PROVIDER_CONFIGS[p]);
  // Chaves legadas (*_api_key ainda não migradas): entram na cadeia também —
  // sem isso, usuário só-legado cai sempre em chain unitária sem fallback.
  const fromLegacy: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.endsWith('_api_key') && !k.includes('vault')) {
        const p = k.replace(/_api_key$/, '');
        if (PROVIDER_CONFIGS[p] && (PROVIDER_CONFIGS[p].url !== '' || p === 'gemini')) fromLegacy.push(p);
      }
    }
  } catch {}
  const combined = [...new Set([...fromEnv, ...fromVault, ...fromLegacy])];
  if (combined.length === 0) {
    if (PROVIDER_CONFIGS['openrouter'] && hasEnvKey('openrouter')) return ['openrouter'];
    const fallbackGemini = hasVaultKey('gemini') || hasEnvKey('gemini') ? ['gemini'] : [];
    if (fallbackGemini.length) return fallbackGemini;
    return PROVIDER_CONFIGS['openrouter'] ? ['openrouter'] : (PROVIDER_CONFIGS['gemini'] ? ['gemini'] : []);
  }
  // Health map lida UMA vez — evita32× JSON.parse do mesmo objeto.
  const healthMap = readHealthMap();
  const scored = combined.map(p => {
    let baseRemaining = 0;
    try {
      const u = getCurrentCycleUsage(p);
      baseRemaining = Math.max(0, u.limit - u.totalUsed);
    } catch { baseRemaining = 0; }
    const isEmpty = baseRemaining <= 0;
    let remaining = baseRemaining;
    if (p === 'openrouter' && hasEnvKey('openrouter')) remaining += 1_000_000;
    if (p === '9router' && hasEnvKey('9router')) remaining += 500_000;
    const latency = getHealth(p) ?? 9999;
    const hasKey = hasVaultKey(p) || hasEnvKey(p);
    const keyDead = isProviderDead(p, healthMap);
    return { provider: p, remaining, baseRemaining, isEmpty, latency, hasKey, keyDead };
    }).filter(s => s.hasKey && !s.keyDead);
    // No browser, provedores com corsWarning (sem CORS no endpoint) sempre
    // falham com "Failed to fetch" — vão para o fim da fila, nunca primeiro.
    const isBrowser = typeof window !== 'undefined' && typeof (window as any).fetch === 'function';
    const DEAD_LATENCY = 999999;
    scored.sort((a, b) => {
      const aDeadLocal = a.latency >= DEAD_LATENCY ? 1 : 0;
      const bDeadLocal = b.latency >= DEAD_LATENCY ? 1 : 0;
      if (aDeadLocal !== bDeadLocal) return aDeadLocal - bDeadLocal;
      if (isBrowser) {
        const aCors = PROVIDER_CONFIGS[a.provider]?.corsWarning ? 1 : 0;
        const bCors = PROVIDER_CONFIGS[b.provider]?.corsWarning ? 1 : 0;
        if (aCors !== bCors) return aCors - bCors;
      }
      // Saldo zerado afunda (short-circuit: esgotado não é tentado primeiro).
      const aEmpty = (a as any).isEmpty ? 1 : 0;
      const bEmpty = (b as any).isEmpty ? 1 : 0;
      if (aEmpty !== bEmpty) return aEmpty - bEmpty;
      if (b.remaining !== a.remaining) return b.remaining - a.remaining;
      return a.latency - b.latency;
    });
  const result = scored.map(s => s.provider);
  _rankCache = { result, at: Date.now() };
  return result;
}

export function getBestProvider(taskType: 'text' | 'visual' = 'text', preferred?: string): string {
  const ranked = rankProviders(taskType);
  if (preferred && ranked.includes(preferred)) {
    const pUsage = (() => { try { return getCurrentCycleUsage(preferred); } catch { return null; } })();
    const pRemaining = pUsage ? Math.max(0, pUsage.limit - pUsage.totalUsed) : 0;
    if (pRemaining > 0) return preferred;
  }
  return ranked[0] || preferred || 'openrouter';
}

export function getFallbackChain(taskType: 'text' | 'visual' = 'text', start?: string): string[] {
  const ranked = rankProviders(taskType);
  if (!start) return ranked;
  const idx = ranked.indexOf(start);
  // idx === -1: `start` fora do ranking (ex.: chave recém-digitada no Centro,
  // ainda sem registro de saúde). Devolver só o ranking DESCARTAVA o provider
  // pedido → testConnection testava OUTRO provedor e dava resultado falso
  // ("Caminho Liberado" em chave nunca testada). idx === 0 já é a cabeça.
  if (idx === -1) return [start, ...ranked.filter(p => p !== start)];
  if (idx === 0) return ranked;
  const head = ranked.slice(idx);
  const tail = ranked.slice(0, idx);
  return [...head, ...tail];
}

/** Top-N providers saudáveis (round-robin de carga). Vazio = 1 provider só. */
export function getTopProviders(n: number, taskType: 'text' | 'visual' = 'text'): string[] {
  try {
    return rankProviders(taskType).slice(0, Math.max(1, n));
  } catch { return []; }
}
