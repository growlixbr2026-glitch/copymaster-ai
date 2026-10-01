export interface UsageRecord {
    timestamp: number;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost?: number;
  }
  
  export interface ProviderSettings {
    limit: number; 
    renewalDay: number; 
    costPer1kInput?: number;
    costPer1kOutput?: number;
  }
  
  const STORAGE_KEY_HISTORY = 'copymaster_usage_history';
  const STORAGE_KEY_SETTINGS = 'copymaster_usage_settings';
  
  export const DEFAULT_SETTINGS: Record<string, ProviderSettings> = {
    '9router': { limit: 1000000, renewalDay: 1 },
    nvidia: { limit: 500000, renewalDay: 1 },
    polinai: { limit: 500000, renewalDay: 1 },
    gemini: { limit: 1000000, renewalDay: 1 }, 
    openai: { limit: 500000, renewalDay: 1 },
    anthropic: { limit: 500000, renewalDay: 1 },
    deepseek: { limit: 500000, renewalDay: 1 },
    meta: { limit: 1000000, renewalDay: 1 },
    mistral: { limit: 500000, renewalDay: 1 },
    cohere: { limit: 500000, renewalDay: 1 },
    openrouter: { limit: 1000000, renewalDay: 1 },
    qwen: { limit: 500000, renewalDay: 1 },
    ernie: { limit: 500000, renewalDay: 1 },
    moonshot: { limit: 500000, renewalDay: 1 },
    yi: { limit: 500000, renewalDay: 1 },
    zhipu: { limit: 500000, renewalDay: 1 },
    grok: { limit: 500000, renewalDay: 1 },
    hyperclova: { limit: 500000, renewalDay: 1 },
    perplexity: { limit: 500000, renewalDay: 1 },
    huggingface: { limit: 500000, renewalDay: 1 },
    together: { limit: 500000, renewalDay: 1 },
    elevenlabs: { limit: 100000, renewalDay: 1 },
    stability: { limit: 1000, renewalDay: 1 },
    runway: { limit: 1000, renewalDay: 1 },
    groq: { limit: 1000000, renewalDay: 1 }
  };
  
  export const trackUsage = (
    provider: string,
    inputTokens: number,
    outputTokens: number
  ) => {
    if (typeof window === 'undefined') return;
  
    const record: UsageRecord = {
      timestamp: Date.now(),
      provider,
      inputTokens: inputTokens || 0,
      outputTokens: outputTokens || 0,
      totalTokens: (inputTokens || 0) + (outputTokens || 0)
    };
  
    const history = getUsageHistory();
    history.push(record);
    
    const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
    const filteredHistory = history.filter(r => r.timestamp > threeMonthsAgo);
  
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(filteredHistory));
    clearUsageCache();
  };
  
  let _usageCache: UsageRecord[] | null = null;
  let _usageCacheValid = false;
  export function clearUsageCache() { _usageCache = null; _usageCacheValid = false; }

  export const getUsageHistory = (): UsageRecord[] => {
    if (typeof window === 'undefined') return [];
    if (_usageCacheValid && _usageCache) return _usageCache;
    try {
      const data = localStorage.getItem(STORAGE_KEY_HISTORY);
      _usageCache = data ? JSON.parse(data) : [];
      _usageCacheValid = true;
      return _usageCache;
    } catch { _usageCache = []; _usageCacheValid = true; return _usageCache; }
  };
  
  export const getProviderSettings = (): Record<string, ProviderSettings> => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  };
  
  export const saveProviderSettings = (settings: Record<string, ProviderSettings>) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  };
  
  export const getCurrentCycleUsage = (provider: string) => {
    const history = getUsageHistory();
    const settings = getProviderSettings();
    const config = settings[provider] || { limit: 1000000, renewalDay: 1 };
    
    const now = new Date();
    let startOfCycle = new Date();
    
    if (now.getDate() >= config.renewalDay) {
        startOfCycle.setDate(config.renewalDay);
        startOfCycle.setHours(0,0,0,0);
    } else {
        startOfCycle.setMonth(startOfCycle.getMonth() - 1);
        startOfCycle.setDate(config.renewalDay);
        startOfCycle.setHours(0,0,0,0);
    }
  
    const cycleRecords = history.filter(r => 
      r.provider === provider && r.timestamp >= startOfCycle.getTime()
    );
  
    const totalInput = cycleRecords.reduce((acc, r) => acc + (r.inputTokens || 0), 0);
    const totalOutput = cycleRecords.reduce((acc, r) => acc + (r.outputTokens || 0), 0);
  
    const renewalDate = new Date(startOfCycle);
    renewalDate.setMonth(renewalDate.getMonth() + 1);

    return {
      totalInput,
      totalOutput,
      totalUsed: totalInput + totalOutput,
      limit: config.limit || 1000000,
      renewalDate: renewalDate,
      records: cycleRecords
    };
  };