// Chaves do SERVIDOR — ponte do cliente com o proxy /api/ai.
// Existe só para o modo PROD: o bundle de produção não tem mais segredos
// (H1 fechado no `define` do vite.config.ts), então o cliente pergunta ao
// servidor quais providers têm chave (GET /api/env, mesmo shape mascarado do
// Centro de Comando) e usa o sentinel SERVER_KEY em `callAI` — a autenticação
// real é injetada server-side e nunca toca o browser.
//
// Em dev o gate fica fechado (useServerKeys() === false): ensureServerKeys()
// devolve {} sem rede nenhuma → comportamento idêntico ao de sempre (specs
// determinísticas continuam verdes, 0 quota).
import { PROVIDER_CONFIGS } from './providerConfig';

/** Sentinel: quando `callAI` vê esta string, a chamada vai por /api/ai. */
export const SERVER_KEY = '__copymaster_proxy__';

// Fora do proxy: gateway local (servidor não alcança o localhost do usuário)
// e endpoints que não são chat LLM (TTS/imagem/vazio — a suíte não os usa via callAI).
const NOT_PROXYABLE = new Set(['9router', 'huggingface', 'runway', 'elevenlabs', 'stability']);

const TTL_MS = 60_000;
const NEGATIVE_TTL_MS = 10_000;

let cache: { at: number; map: Record<string, boolean> } | null = null;
let inflight: Promise<Record<string, boolean>> | null = null;

export const isServerKey = (k: string | null | undefined): boolean => k === SERVER_KEY;
export const getServerKeyMap = (): Record<string, boolean> | null => (cache ? cache.map : null);

/**
 * Gate de uso do proxy: produção (bundle sem segredos) OU seam de teste
 * `localStorage copymaster_server_keys = '1'` (força) / `'0'` (bloqueia).
 * Dev sem flag → false → nada de rede, nada muda.
 */
export function useServerKeys(): boolean {
  try {
    const flag = localStorage.getItem('copymaster_server_keys');
    if (flag === '1') return true;
    if (flag === '0') return false;
  } catch {}
  return !!((import.meta as any).env && (import.meta as any).env.PROD);
}

/**
 * Busca/retém o mapa {provider: tem-chave-no-servidor} por 60s. Falha (sem
 * /api/env, offline) grava cache negativo de 10s — nesse caso o `callAI`
 * segue o caminho local de sempre (cofre/legado/erro amigável).
 */
export async function ensureServerKeys(): Promise<Record<string, boolean>> {
  if (!useServerKeys()) return {};
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), 4000);
      const r = await fetch('/api/env', { signal: ac.signal });
      clearTimeout(to);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const map: Record<string, boolean> = {};
      for (const [p, v] of Object.entries<any>(j?.keys || {})) {
        if (!v?.has || NOT_PROXYABLE.has(p)) continue;
        const cfg: any = (PROVIDER_CONFIGS as any)[p];
        if (!cfg) continue;
        if (!cfg.url && p !== 'gemini') continue; // endpoint vazio não roda via callAI
        map[p] = true;
      }
      cache = { at: Date.now(), map };
      return map;
    } catch {
      cache = { at: Date.now() - (TTL_MS - NEGATIVE_TTL_MS), map: {} };
      return {};
    } finally { inflight = null; }
  })();
  return inflight;
}
