// ═══════════════════════════════════════════════════════════════════════════
// PROMPT CACHE SERVICE — Cache de prompts para reduzir custos e latência
// Inspirado em: anthropics/claude-cookbooks (cost_optimization.ipynb)
// ═══════════════════════════════════════════════════════════════════════════

interface CacheEntry {
  prompt: string;
  response: string;
  timestamp: number;
  hits: number;
  provider: string;
  model: string;
}

const CACHE_KEY = 'copymaster_prompt_cache:v1';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos
const MAX_CACHE_SIZE = 100;

let _cache: Map<string, CacheEntry> | null = null;

function getCache(): Map<string, CacheEntry> {
  if (_cache) return _cache;
  try {
    const data = localStorage.getItem(CACHE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      _cache = new Map(Object.entries(parsed));
    } else {
      _cache = new Map();
    }
  } catch {
    _cache = new Map();
  }
  return _cache;
}

function saveCache(): void {
  if (!_cache) return;
  try {
    const obj = Object.fromEntries(_cache);
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    // Storage full — limpa cache
    _cache?.clear();
  }
}

function generateHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  estimatedSavings: number; // tokens economizados
}

export const promptCacheService = {
  /**
   * Busca no cache por um prompt idêntico
   */
  get(prompt: string, provider: string, model: string): string | null {
    const cache = getCache();
    const key = generateHash(`${provider}:${model}:${prompt}`);
    const entry = cache.get(key);
    
    if (!entry) return null;
    
    // Verifica TTL
    if (Date.now() - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
      saveCache();
      return null;
    }
    
    // Atualiza hits
    entry.hits++;
    saveCache();
    
    return entry.response;
  },

  /**
   * Armazena resposta no cache
   */
  set(prompt: string, response: string, provider: string, model: string): void {
    const cache = getCache();
    
    // Limpa cache se estiver cheio
    if (cache.size >= MAX_CACHE_SIZE) {
      const oldest = Array.from(cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) cache.delete(oldest[0]);
    }
    
    const key = generateHash(`${provider}:${model}:${prompt}`);
    cache.set(key, {
      prompt,
      response,
      timestamp: Date.now(),
      hits: 0,
      provider,
      model,
    });
    
    saveCache();
  },

  /**
   * Limpa todo o cache
   */
  clear(): void {
    _cache = new Map();
    localStorage.removeItem(CACHE_KEY);
  },

  /**
   * Estatísticas do cache
   */
  getStats(): CacheStats {
    const cache = getCache();
    let hits = 0;
    let misses = 0;
    let estimatedSavings = 0;
    
    cache.forEach((entry) => {
      hits += entry.hits;
      // Estimativa: cada hit economiza ~500 tokens (prompt + resposta)
      estimatedSavings += entry.hits * 500;
    });
    
    const total = hits + misses;
    return {
      size: cache.size,
      hits,
      misses,
      hitRate: total > 0 ? hits / total : 0,
      estimatedSavings,
    };
  },

  /**
   * Limpa entradas expiradas
   */
  cleanup(): number {
    const cache = getCache();
    let removed = 0;
    const now = Date.now();
    
    cache.forEach((entry, key) => {
      if (now - entry.timestamp > CACHE_TTL) {
        cache.delete(key);
        removed++;
      }
    });
    
    if (removed > 0) saveCache();
    return removed;
  },
};
