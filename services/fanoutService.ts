/**
 * Execução concorrente com teto + modo turbo (opt-in).
 *
 * - fanOut: N tasks independentes em janelas de até `max` (default 3).
 * - Turbo: quando ligado, a MESMA geração dispara nos 2 melhores providers
 *   e consome o primeiro sucesso (custo ≤2x — desligado por padrão no free).
 */

export const TURBO_KEY = 'turbo_mode';

export function isTurboMode(): boolean {
  try { return localStorage.getItem(TURBO_KEY) === '1'; } catch { return false; }
}

export function setTurboMode(on: boolean): void {
  try { localStorage.setItem(TURBO_KEY, on ? '1' : '0'); } catch {}
}

/** Roda tasks em janelas de `max` concorrentes; preserva a ordem dos resultados. */
export async function fanOut<T>(tasks: Array<() => Promise<T>>, max = 3): Promise<T[]> {
  const out: T[] = new Array(tasks.length) as T[];
  const queue = tasks.map((fn, i) => ({ fn, i }));
  const lanes = Math.min(Math.max(1, max), Math.max(1, queue.length));
  await Promise.all(Array.from({ length: lanes }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) break;
      out[item.i] = await item.fn();
    }
  }));
  return out;
}
