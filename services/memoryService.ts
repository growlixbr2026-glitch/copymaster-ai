const HISTORY_KEY = 'copymaster_history:v2';
const PROFILE_KEY = 'copymaster_profile:v2';
const BRAIN_KEY = 'copymaster_brain:v2';
const MAX_HISTORY = 500;

// Debounce do rebuild do cérebro — evita reconstruir a cada chamada LLM.
// Com 4 chamadas Ideas paralelas, eram 4 reconstruções + 4 gravações
// localStorage em janela de <1s. Agora: UMA rebuild por 2s.
let _brainTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingProfile: UserProfile | null = null;
let _pendingHistory: HistoryEntry[] | null = null;

export interface HistoryEntry {
  id: string;
  ts: number;
  provider: string;
  taskType: 'text' | 'visual';
  promptPreview: string;
  responsePreview: string;
  personaId?: string;
  tones?: string[];
  methodology?: string;
  tokens?: number;
  success: boolean;
}

export interface UserProfile {
  toneCounts: Record<string, number>;
  methodCounts: Record<string, number>;
  providerCounts: Record<string, number>;
  totalInteractions: number;
  lastUpdated: number;
}

function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function safeSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

export function getHistory(limit = 50): HistoryEntry[] {
  const all = safeGet<HistoryEntry[]>(HISTORY_KEY, []);
  return all.slice(0, limit);
}

export function getProfile(): UserProfile {
  return safeGet<UserProfile>(PROFILE_KEY, { toneCounts: {}, methodCounts: {}, providerCounts: {}, totalInteractions: 0, lastUpdated: 0 });
}

export function getBrainContext(): string {
  if (typeof window === 'undefined') return '';
  try { return localStorage.getItem(BRAIN_KEY) || ''; } catch { return ''; }
}

export function setBrainContext(ctx: string) {
  try { localStorage.setItem(BRAIN_KEY, ctx); } catch {}
}

function buildBrainContext(profile: UserProfile, recent: HistoryEntry[]): string {
  const topTones = Object.entries(profile.toneCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join(', ') || 'não definido';
  const topMethods = Object.entries(profile.methodCounts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k]) => k).join(', ') || 'não definido';
  const topProviders = Object.entries(profile.providerCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k).join(', ') || 'gemini';
  const recentTopics = recent.slice(0, 5).map(r => r.promptPreview.slice(0, 80)).join(' | ');
  return `MEMÓRIA DO USUÁRIO (aprendizado contínuo): Tons preferidos: ${topTones}. Metodologias preferidas: ${topMethods}. Provedores mais usados: ${topProviders}. Total interações: ${profile.totalInteractions}. Tópicos recentes: ${recentTopics}`.trim();
}

export function addHistory(entry: Omit<HistoryEntry, 'id' | 'ts'> & Partial<Pick<HistoryEntry, 'id' | 'ts'>>) {
  const full: HistoryEntry = {
    id: entry.id || Math.random().toString(36).slice(2, 10),
    ts: entry.ts || Date.now(),
    provider: entry.provider,
    taskType: entry.taskType || 'text',
    promptPreview: (entry.promptPreview || '').slice(0, 400),
    responsePreview: (entry.responsePreview || '').slice(0, 600),
    personaId: entry.personaId,
    tones: entry.tones,
    methodology: entry.methodology,
    tokens: entry.tokens,
    success: entry.success ?? true,
  };
  const history = safeGet<HistoryEntry[]>(HISTORY_KEY, []);
  history.unshift(full);
  if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
  safeSet(HISTORY_KEY, history);

  const profile = getProfile();
  profile.totalInteractions += 1;
  profile.lastUpdated = Date.now();
  if (entry.tones) for (const t of entry.tones) profile.toneCounts[t] = (profile.toneCounts[t] || 0) + 1;
  if (entry.methodology) profile.methodCounts[entry.methodology] = (profile.methodCounts[entry.methodology] || 0) + 1;
  profile.providerCounts[entry.provider] = (profile.providerCounts[entry.provider] || 0) + 1;
  safeSet(PROFILE_KEY, profile);

  // Debounce: reconstrói o cérebro UMA vez a cada 2s (antes: 4× por chamadas paralelas).
  _pendingProfile = profile;
  _pendingHistory = history;
  if (_brainTimer) clearTimeout(_brainTimer);
  _brainTimer = setTimeout(() => {
    if (_pendingProfile && _pendingHistory) {
      setBrainContext(buildBrainContext(_pendingProfile, _pendingHistory));
    }
    _brainTimer = null; _pendingProfile = null; _pendingHistory = null;
  }, 2000);

  return full;
}

export function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY); localStorage.removeItem(PROFILE_KEY); localStorage.removeItem(BRAIN_KEY); } catch {}
}

export function exportHistoryJSON(): string {
  return JSON.stringify({ history: safeGet(HISTORY_KEY, []), profile: getProfile(), brain: getBrainContext() }, null, 2);
}
