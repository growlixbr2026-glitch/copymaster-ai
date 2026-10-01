import React, { useState, useEffect } from 'react';
import { 
  Settings, Save, Trash2, Bot, Palette, Cpu, Database, Home, ShieldCheck, 
  Info, Link2, Eye, EyeOff, X, Loader2, CheckCircle2, 
  Terminal, Sparkles, Video, Globe, Lock, FlaskConical, Download
} from 'lucide-react';
import { PROVIDER_CONFIGS, GOLDEN_SYSTEM_INSTRUCTIONS } from '../services/core/aiClient';
import { useSharedContext } from '../contexts/SharedContext';
import { setVaultKey, getVaultKey, hasVaultKey, migrateLegacyKeys, getVaultKeys, addVaultKey, removeVaultKey, getAllVaultKeysMap } from '../services/vaultService';
import { testConnection } from '../services/core/aiClient';
import { fetchCatalog, getSelectedPool, setSelectedPool, getLastModel, shortName } from '../services/openRouterCatalog';
import type { FreeModel } from '../services/openRouterCatalog';

// §8 "nunca expor chave em erro/UI" + §5 "nunca JSON cru": o `details` de
// testConnection é o corpo bruto do provider (às vezes ecoa a própria chave
// num 401 ou devolve JSON inteiro). Aqui ele vira texto legível e sem segredo.
const sanitizeDetails = (d?: string): string => {
  if (!d) return '';
  let s = String(d);
  if (s.includes('{')) {
    try {
      const j = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
      s = j?.error?.message || j?.message || j?.error?.type || '';
    } catch { s = ''; }
    if (!s) return 'detalhe técnico não traduzível';
  }
  s = s.replace(/[A-Za-z0-9_\-]{20,}/g, '***');
  return s.replace(/\s+/g, ' ').slice(0, 140);
};

const SettingsCenter: React.FC<{ language: string }> = ({ language }) => {
  const { setActiveTab } = useSharedContext();
  
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [envKeys, setEnvKeys] = useState<Record<string, { has: boolean; masked: string; envKey: string; count?: number }>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latency?: number; details?: string }>>({});
  const [vaultKeysMap, setVaultKeysMap] = useState<Record<string, string[]>>({});
  const [vaultLoaded, setVaultLoaded] = useState(false);
  
  const [helpModal, setHelpModal] = useState<{ id: string, title: string, desc: string, how: string } | null>(null);
  const [showConstitution, setShowConstitution] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveSummary, setSaveSummary] = useState<string | null>(null);
  const [freeModels, setFreeModels] = useState<FreeModel[]>([]);
  const [freePool, setFreePool] = useState<string[]>(() => getSelectedPool('cohere/north-mini-code:free'));
  const [catalogState, setCatalogState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [lastModel, setLastModelState] = useState<string | null>(() => getLastModel());
  const [auditing, setAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState<string | null>(null);
  const [keyHealth, setKeyHealth] = useState(() => {
    try { return JSON.parse(localStorage.getItem('copymaster_keyhealth:v1') || 'null'); } catch { return null; }
  });
  const [turbo, setTurbo] = useState(() => { try { return localStorage.getItem('turbo_mode') === '1'; } catch { return false; } });

  const handleAuditAll = async () => {
    setAuditing(true);
    setAuditProgress('Listando chaves...');
    try {
      const { certifyAllKeys } = await import('../services/keyHealthService');
      const map = await certifyAllKeys((done, total, provider, ok) => {
        setAuditProgress(`${done}/${total} • ${provider}: ${ok ? 'OK' : 'falhou'}`);
      });
      setKeyHealth(map);
      const ok = map.keys.filter((k: any) => k.ok).length;
      setAuditProgress(`Concluído: ${ok}/${map.keys.length} chaves OK.`);
    } catch (e: any) {
      setAuditProgress('Falha na auditoria: ' + (e?.message || e));
    } finally {
      setAuditing(false);
    }
  };

  const handleTurbo = async (on: boolean) => {
    setTurbo(on);
    try {
      const { setTurboMode } = await import('../services/fanoutService');
      setTurboMode(on);
    } catch {}
  };

  const loadFreeModels = async () => {
    setCatalogState('loading');
    try {
      const { models } = await fetchCatalog();
      setFreeModels(models);
      setCatalogState('ok');
    } catch {
      const { CURATED_FREE } = await import('../services/openRouterCatalog');
      setFreeModels(CURATED_FREE);
      setCatalogState('error');
    }
    setLastModelState(getLastModel());
  };

  const toggleFreeModel = (id: string) => {
    setFreePool((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      setSelectedPool(next);
      return next;
    });
  };

  const loadEnvKeys = async () => {
    try {
      const r = await fetch('/api/env');
      if (r.ok) {
        const j = await r.json() as any;
        if (j.ok && j.keys) setEnvKeys(j.keys);
      }
    } catch {}
  };

  const isMaskedPlaceholder = (v: string) => {
    if (!v) return false;
    const t = v.trim();
    return t.includes('•') || /\*{4,}/.test(t);
  };

  const maskShort = (v: string) => {
    const t = (v || '').trim();
    if (!t || t.length < 8) return '********';
    return t.slice(0, 4) + '*'.repeat(Math.max(6, t.length - 8)) + t.slice(-4);
  };
  const refreshVaultMap = async () => {
    try {
      const map = await getAllVaultKeysMap();
      setVaultKeysMap(map);
      setVaultLoaded(true);
    } catch { setVaultLoaded(true); }
  };
  useEffect(() => {
    migrateLegacyKeys();
    loadEnvKeys();
    refreshVaultMap();
    (async () => {
      const loaded: Record<string, string> = {};
      for (const id of Object.keys(PROVIDER_CONFIGS)) {
        if (hasVaultKey(id)) {
          try { 
            const v = await getVaultKey(id);
            if (v && v.length > 20) loaded[id] = '****************';
            else if (v) loaded[id] = v;
          } catch { loaded[id] = '****************'; }
        } else loaded[id] = '';
      }
      setKeys(loaded);
    })();
  }, []);

  const handleSave = async () => {
    setSaveState('saving');
    setSaveSummary(null);
    let added = 0, failed = 0, envFailed = 0;
    for (const [id, val] of Object.entries(keys)) {
      const v = ((val as string) || '').trim();
      if (!v || isMaskedPlaceholder(v)) continue;
      let t: any = null;
      try { t = await testConnection(id, v); } catch (e: any) { t = { success: false, message: e?.message || 'falha no teste' }; }
      if (!t || !t.success) { failed++; continue; }
      try { await addVaultKey(id, v); added++; } catch { failed++; }
      try {
        const resp = await fetch('/api/env', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: id, apiKey: v }) });
        const j = await resp.json() as any;
        if (!j.ok) throw new Error(j.error || 'falha ao gravar .env');
      } catch { envFailed++; }  // §8: sem erro silencioso — o resumo do botão conta a falha do .env
    }
    await refreshVaultMap();
    await loadEnvKeys();
    const parts: string[] = [];
    if (added > 0) parts.push(`${added} chave(s) adicionada(s) no cofre`);
    if (failed > 0) parts.push(`${failed} recusada(s) no teste`);
    if (envFailed > 0) parts.push(`${envFailed} não gravada(s) no .env (só no cofre)`);
    setSaveSummary(parts.length > 0 ? parts.join(' • ') : 'Nada alterado. Cole uma nova chave e salve.');
    setKeys(prev => { const n = { ...prev }; for (const k of Object.keys(n)) n[k] = ''; return n; });

    setTimeout(() => {
      setSaveState('saved');
      setTimeout(() => { setSaveState('idle'); }, 2000);
    }, 500);
  };

  const handleTest = async (id: string) => {
    const raw = (keys[id] || '').trim();
    const apiKey = raw && !isMaskedPlaceholder(raw) ? raw : '';
    const effectiveKey = apiKey || (() => {
      const map: Record<string,string> = {
        '9router': (process.env as any).LITELLM_API_KEY_9ROUTER || '',
        'openrouter': (process.env as any).LITELLM_API_KEY_OPENROUTER || (process.env as any).OPENROUTER_API_KEY || '',
        'nvidia': (process.env as any).NVIDIA_API || (process.env as any).NVIDEA_API || '',
        'polinai': (process.env as any).POLINAI_API || '',
        'groq': (process.env as any).GROQ_API || (process.env as any).GROQ_API_KEY || '',
        'grok': (process.env as any).GROK_API || (process.env as any).GROK_API_KEY || '',
        'mistral': (process.env as any).MISTRAL_API || (process.env as any).MISTRAL_api || '',
        'deepseek': (process.env as any).DEEPSEEK_API_KEY || '',
        'meta': (process.env as any).META_API_KEY || '',
        'cohere': (process.env as any).COHERE_API_KEY || '',
        'gemini': (process.env as any).API_KEY || (process.env as any).GEMINI_API_KEY || (process.env as any).VITE_GEMINI_API_KEY || '',
        'openai': (process.env as any).OPENAI_API_KEY || '',
        'anthropic': (process.env as any).ANTHROPIC_API_KEY || '',
        'qwen': (process.env as any).QWEN_API_KEY || '',
        'ernie': (process.env as any).ERNIE_API_KEY || '',
        'moonshot': (process.env as any).MOONSHOT_API_KEY || '',
        'yi': (process.env as any).YI_API_KEY || '',
        'zhipu': (process.env as any).ZHIPU_API_KEY || '',
        'zai': (process.env as any).ZAI_API_KEY || (process.env as any).ZHIPU_API_KEY || '',
        'hyperclova': (process.env as any).HYPERCLOVA_API_KEY || '',
        'perplexity': (process.env as any).PERPLEXITY_API_KEY || '',
        'huggingface': (process.env as any).HUGGINGFACE_API_KEY || (process.env as any).HF_API_KEY || '',
        'together': (process.env as any).TOGETHER_API_KEY || '',
        'elevenlabs': (process.env as any).ELEVENLABS_API_KEY || '',
        'stability': (process.env as any).STABILITY_API_KEY || '',
        'runway': (process.env as any).RUNWAY_API_KEY || '',
        'cerebras': (process.env as any).CEREBRAS_API_KEY || '',
        'sambanova': (process.env as any).SAMBANOVA_API_KEY || '',
        'chutes': (process.env as any).CHUTES_API_KEY || '',
        'siliconflow': (process.env as any).SILICONFLOW_API_KEY || '',
        'nebius': (process.env as any).NEBIUS_API_KEY || '',
        'cloudflare': (process.env as any).CLOUDFLARE_API_KEY || '',
      };
      return map[id] || '';
    })();
    const vaultFirst = (vaultKeysMap[id] && vaultKeysMap[id][0]) || '';
    const keyToTest = effectiveKey || vaultFirst || (await (async () => { try { return await getVaultKey(id) || ''; } catch { return ''; } })()) || apiKey;
    if (!keyToTest) {
      setTestResults(prev => ({ ...prev, [id]: { success: false, message: 'Chave vazia — cole sua API key e clique Testar.' } }));
      return;
    }
    setTesting(prev => ({ ...prev, [id]: true }));
    setTestResults(prev => ({ ...prev, [id]: undefined as any }));
    try {
      const res = await testConnection(id, keyToTest);
      setTestResults(prev => ({ ...prev, [id]: { success: res.success, message: res.message, latency: res.latency, details: sanitizeDetails((res as any).details) } }));
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [id]: { success: false, message: e.message } }));
    } finally {
      setTesting(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleAddKey = async (id: string) => {
    const raw = (keys[id] || '').trim();
    if (!raw || isMaskedPlaceholder(raw)) {
      setTestResults(prev => ({ ...prev, [id]: { success: false, message: 'Cole uma chave nova antes de adicionar' } }));
      return;
    }
    setTesting(prev => ({ ...prev, [id]: true }));
    try {
      const res = await testConnection(id, raw);
      if (!res.success) {
        setTestResults(prev => ({ ...prev, [id]: { success: false, message: 'Teste falhou: ' + res.message + (res.details ? ' — ' + sanitizeDetails(res.details) : '') } }));
        setTesting(prev => ({ ...prev, [id]: false }));
        return;
      }
      await addVaultKey(id, raw);
      await refreshVaultMap();
      try {
        const resp = await fetch('/api/env', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: id, apiKey: raw }) });
        const j = await resp.json() as any;
        if (j.ok) await loadEnvKeys();
      } catch {}
      const count = (vaultKeysMap[id]?.length || 0) + 1;
      setTestResults(prev => ({ ...prev, [id]: { success: true, message: `Chave adicionada (${count} no cofre) — ${res.message}`, latency: res.latency } }));
      setKeys(prev => ({ ...prev, [id]: '' }));
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [id]: { success: false, message: e.message } }));
    } finally {
      setTesting(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleRemoveVaultKey = async (id: string, keyVal: string) => {
    if (!confirm(`Remover esta chave de ${PROVIDER_CONFIGS[id]?.name || id}?`)) return;
    await removeVaultKey(id, keyVal);
    await refreshVaultMap();
    setTestResults(prev => ({ ...prev, [id]: { success: true, message: 'Chave removida do cofre.' } }));
  };

  const renderProviderCard = (id: string, Icon: any) => {
    const cfg = PROVIDER_CONFIGS[id];
    if (!cfg) return null;
    const envHas = !!envKeys[id]?.has;
    const envCount = envKeys[id]?.count || (envHas ? 1 : 0);
    const vaultList = vaultKeysMap[id] || [];
    const vaultCount = vaultList.length;
    const hasVault = vaultCount > 0 || hasVaultKey(id);
    const buildEnvHas = (() => {
      if (id === '9router') return !!((process.env as any).LITELLM_API_KEY_9ROUTER);
      if (id === 'openrouter') return !!((process.env as any).LITELLM_API_KEY_OPENROUTER || (process.env as any).OPENROUTER_API_KEY);
      if (id === 'nvidia') return !!((process.env as any).NVIDIA_API || (process.env as any).NVIDEA_API);
      if (id === 'polinai') return !!((process.env as any).POLINAI_API);
      if (id === 'groq') return !!((process.env as any).GROQ_API || (process.env as any).GROQ_API_KEY);
      if (id === 'grok') return !!((process.env as any).GROK_API || (process.env as any).GROK_API_KEY);
      if (id === 'mistral') return !!((process.env as any).MISTRAL_API || (process.env as any).MISTRAL_api);
      if (id === 'deepseek') return !!((process.env as any).DEEPSEEK_API_KEY);
      if (id === 'meta') return !!((process.env as any).META_API_KEY);
      if (id === 'cohere') return !!((process.env as any).COHERE_API_KEY);
      if (id === 'gemini') return !!((process.env as any).API_KEY || (process.env as any).GEMINI_API_KEY || (process.env as any).VITE_GEMINI_API_KEY);
      if (id === 'openai') return !!((process.env as any).OPENAI_API_KEY);
      if (id === 'anthropic') return !!((process.env as any).ANTHROPIC_API_KEY);
      if (id === 'qwen') return !!((process.env as any).QWEN_API_KEY);
      if (id === 'ernie') return !!((process.env as any).ERNIE_API_KEY);
      if (id === 'moonshot') return !!((process.env as any).MOONSHOT_API_KEY);
      if (id === 'yi') return !!((process.env as any).YI_API_KEY);
      if (id === 'zhipu') return !!((process.env as any).ZHIPU_API_KEY);
      if (id === 'zai') return !!((process.env as any).ZAI_API_KEY || (process.env as any).ZHIPU_API_KEY);
      if (id === 'hyperclova') return !!((process.env as any).HYPERCLOVA_API_KEY);
      if (id === 'perplexity') return !!((process.env as any).PERPLEXITY_API_KEY);
      if (id === 'huggingface') return !!((process.env as any).HUGGINGFACE_API_KEY || (process.env as any).HF_API_KEY);
      if (id === 'together') return !!((process.env as any).TOGETHER_API_KEY);
      if (id === 'elevenlabs') return !!((process.env as any).ELEVENLABS_API_KEY);
      if (id === 'stability') return !!((process.env as any).STABILITY_API_KEY);
      if (id === 'runway') return !!((process.env as any).RUNWAY_API_KEY);
      if (id === 'cerebras') return !!((process.env as any).CEREBRAS_API_KEY);
      if (id === 'sambanova') return !!((process.env as any).SAMBANOVA_API_KEY);
      if (id === 'chutes') return !!((process.env as any).CHUTES_API_KEY);
      if (id === 'siliconflow') return !!((process.env as any).SILICONFLOW_API_KEY);
      if (id === 'nebius') return !!((process.env as any).NEBIUS_API_KEY);
      if (id === 'cloudflare') return !!((process.env as any).CLOUDFLARE_API_KEY);
      return false;
    })();
    const hasKey = envHas || hasVault || buildEnvHas;
    const testingNow = !!testing[id];
    const result = testResults[id];
    const healthDot = (() => {
      try {
        const rows = (keyHealth?.keys || []).filter((k: any) => k.provider === id);
        if (!rows.length) return null;
        const ok = rows.some((r: any) => r.ok);
        const lat = Math.min(...rows.map((r: any) => Number(r.latency) || 99999));
        return { ok, lat, n: rows.length };
      } catch { return null; }
    })();

    return (
      <div key={id} className={`bg-slate-900/50 border rounded-xl p-4 transition-all duration-300 group flex flex-col ${hasKey ? 'border-emerald-500/30' : 'border-slate-800 hover:border-slate-700'}`}>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-slate-400" />
            {healthDot && (
              <span
                title={healthDot.ok ? `Certificada OK (${healthDot.n} chave(s), ${healthDot.lat}ms)` : `Chave morta na auditoria (${healthDot.n} testada(s))`}
                className={`w-2 h-2 rounded-full ${healthDot.ok ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]'}`}
              />
            )}
            <span className="text-xs font-bold text-slate-200 truncate max-w-[110px]">{cfg.name}</span>
            {hasKey && <span className={`text-[7px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest ${envHas || buildEnvHas ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-emerald-500/20 text-emerald-400'}`}>{envHas || buildEnvHas ? '.env' : 'Cofre'}</span>}
            {(envCount > 1 || vaultCount > 1) && <span className="text-[7px] px-1.5 py-0.5 rounded font-black bg-indigo-500/30 text-indigo-300 border border-indigo-500/30">{Math.max(envCount, vaultCount)} chaves</span>}
          </div>
          <button onClick={() => setHelpModal({ id, title: cfg.name, desc: cfg.description, how: cfg.howTo })} title={`Ajuda ${cfg.name}`} aria-label={`Ajuda ${cfg.name}`} className="text-slate-600 hover:text-indigo-400"><Info className="w-3.5 h-3.5"/></button>
        </div>

        {envHas && <div className="text-[9px] font-mono text-sky-300/70 truncate mb-1" title={envKeys[id].envKey}>{envKeys[id].envKey}: {envKeys[id].masked}{envCount>1 ? ` +${envCount-1}`:''}</div>}
        {vaultCount > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {vaultList.map((k) => (
              <span key={k.slice(0,8)+k.length} className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5 text-[9px] font-mono text-emerald-300">
                {maskShort(k)}
                <button onClick={() => handleRemoveVaultKey(id, k)} className="ml-1 text-emerald-400 hover:text-red-400" title="Remover"><X className="w-2.5 h-2.5"/></button>
              </span>
            ))}
          </div>
        )}

        <div className="relative h-[42px]">
          <input 
            aria-label={`Chave API ${id}`}
            type={showKey[id] ? 'text' : 'password'} 
            className="w-full h-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 pr-10 text-slate-300 font-mono text-[10px] outline-none focus:border-indigo-500" 
            value={keys[id] || ''} 
            onChange={(e) => setKeys({...keys, [id]: e.target.value})}
            placeholder={hasKey ? "Adicionar outra chave..." : "Chave API..."}
          />
          <button onClick={() => setShowKey({...showKey, [id]: !showKey[id]})} title={showKey[id] ? "Ocultar chave" : "Mostrar chave"} aria-label={showKey[id] ? "Ocultar chave" : "Mostrar chave"} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-600 hover:text-slate-300 transition-colors">{showKey[id] ? <EyeOff className="w-3 h-3"/> : <Eye className="w-3 h-3"/>}</button>
        </div>

        <div className="flex items-center justify-between mt-2">
          <a href={cfg.link} target="_blank" rel="noreferrer" className="text-[9px] font-bold text-slate-400 hover:text-indigo-400 flex items-center gap-1 uppercase tracking-widest transition-colors"><Link2 className="w-2.5 h-2.5"/> Pegar Chave</a>
          {cfg.corsWarning && <span className="text-[7px] text-amber-500 font-bold uppercase flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5"/> Proxy</span>}
        </div>

        {id === 'cloudflare' && (
          <div className="mt-2">
            <input
              aria-label="Cloudflare Account ID"
              type="text"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-300 font-mono text-[10px] outline-none focus:border-indigo-500"
              defaultValue={(() => { try { return localStorage.getItem('cloudflare_account_id') || ''; } catch { return ''; } })()}
              onChange={(e) => { try { localStorage.setItem('cloudflare_account_id', e.target.value.trim()); } catch {} }}
              placeholder="Account ID (dash.cloudflare.com)"
            />
          </div>
        )}

        <div className="flex gap-1.5 mt-3">
          <button onClick={() => handleTest(id)} disabled={testingNow} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-50">
            {testingNow ? <Loader2 className="w-3 h-3 animate-spin"/> : <FlaskConical className="w-3 h-3"/>} Testar
          </button>
          <button onClick={() => handleAddKey(id)} disabled={testingNow} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50">
            <Download className="w-3 h-3"/> Adicionar
          </button>
        </div>
        {vaultCount > 0 && <p className="mt-1 text-[9px] text-slate-500">{vaultCount} chave(s) no cofre — o sistema gira todas em 401/429 automaticamente. Adicione _2.._9 no .env para pool por e-mail.</p>}
        {result && (
          <div className={`mt-2 text-[10px] font-bold px-2 py-1.5 rounded-lg border ${result.success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
            {result.success ? <CheckCircle2 className="w-3 h-3 inline mr-1"/> : <X className="w-3 h-3 inline mr-1"/>}
            {result.message}{result.latency ? ` • ${result.latency}ms` : ''}{result.details && !result.success ? ` — ${result.details.slice(0,90)}` : ''}
          </div>
        )}
      </div>
    );
  };

  const mainLLMs = ['9router', 'openrouter', 'gemini', 'openai', 'anthropic', 'deepseek', 'meta', 'mistral', 'cohere', 'grok', 'perplexity'];
  const otherLLMs = ['qwen', 'ernie', 'moonshot', 'yi', 'zhipu', 'hyperclova', 'huggingface', 'together', 'groq', 'nvidia', 'polinai', 'cerebras', 'sambanova', 'chutes', 'siliconflow', 'zai', 'nebius', 'cloudflare'];
  const mediaEngines = ['elevenlabs', 'stability', 'runway'];

  const envCount = Object.values(envKeys).filter(v => v.has).length;
  const [routerAlive, setRouterAlive] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 2000);
      try {
        await fetch('http://localhost:20128/v1/models', { signal: ctrl.signal });
        if (!cancelled) setRouterAlive(true);
      } catch {
        if (!cancelled) setRouterAlive(false);
      } finally { clearTimeout(to); }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar p-6 pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-black text-white flex items-center gap-3"> <Settings className="w-8 h-8 text-indigo-500" /> CENTRO DE COMANDO</h2>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-black">Infraestrutura e Protocolos Globais de IA</p>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400 bg-indigo-950/30 border border-indigo-500/20 rounded-lg px-3 py-2 max-w-2xl"><span className="text-white font-black">Seleção Automática</span> {routerAlive === null ? <span className="text-slate-400">(verificando...)</span> : routerAlive ? <span className="text-emerald-400 font-bold">● 9Router online</span> : <span className="text-sky-400 font-bold">● OpenRouter direto</span>} — o sistema escolhe o melhor motor entre suas chaves {envCount > 0 && <span className="text-emerald-400 font-bold">({envCount} provedores com chave)</span>}. {Object.values(vaultKeysMap).flat().length > 0 && <span className="text-indigo-300 font-bold">{Object.values(vaultKeysMap).flat().length} chaves no cofre</span>} • Fallback 1..N automático (401/429 gira chaves). Modelos <b>:free</b> primeiro (ex.: <span className="font-mono text-emerald-300">cohere/north-mini-code:free</span>). Cada card aceita <b>N chaves</b> (e-mails diferentes) — clique <b>Adicionar</b> para empilhar.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowConstitution(true)} className="flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black text-amber-400 hover:text-white bg-amber-950/20 border border-amber-500/30 transition-all uppercase tracking-widest shadow-lg active:scale-95">
                <ShieldCheck className="w-4 h-4" /> Constituição IA V20
            </button>
            <button onClick={() => setActiveTab('home')} title="Voltar para o Início" aria-label="Voltar para o Início" className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 border border-slate-800"><Home className="w-5 h-5"/></button>
        </div>
      </div>

      <div className="bg-slate-950/50 border border-indigo-500/20 rounded-2xl p-6 shadow-xl mb-12">
        <h3 className="text-xs font-black text-indigo-300 mb-2 flex items-center gap-2 uppercase tracking-[0.2em]"><Bot className="w-4 h-4"/> Seleção Automática de Motor</h3>
        <p className="text-[11px] leading-relaxed text-slate-400">O usuário não escolhe mais Motor Primário — o sistema ranqueia por <b>cota restante + latência + saúde da chave</b> (<span className="font-mono text-slate-300">rankProviders</span>) e distribui as 4 seções da Sessão de Ideias em round-robin (<span className="font-mono text-slate-300">getTopProviders(4)</span>). Fallback gira todas as chaves do provider (<span className="font-mono text-slate-300">base + _2.._9</span> + cofre) e todos os modelos <span className="font-mono text-slate-300">:free</span> antes de trocar de motor. Use <b>Testar todas as chaves</b> para certificar e excluir mortas.</p>
      </div>

      <div className="bg-slate-950/50 border border-amber-500/20 rounded-2xl p-6 shadow-xl mb-12">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h3 className="text-xs font-black text-amber-400 flex items-center gap-2 uppercase tracking-[0.2em]"> <ShieldCheck className="w-4 h-4" /> Fallback Automático e Chaves</h3>
              <div className="flex gap-2">
                <button
                    onClick={handleAuditAll}
                    disabled={auditing}
                    className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 flex items-center gap-2"
                >
                    {auditing ? <Loader2 className="w-3 h-3 animate-spin"/> : <FlaskConical className="w-3 h-3"/>} {auditing ? 'Auditando...' : 'Testar todas as chaves'}
                </button>
                <button
                    onClick={() => handleTurbo(!turbo)}
                    title="Turbo: dispara nos 2 melhores motores e usa o 1º que responder (custa até 2x de quota)"
                    aria-pressed={turbo}
                    className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${turbo ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}
                >
                    Turbo {turbo ? 'ON' : 'OFF'}
                </button>
              </div>
          </div>
          <p className="text-[11px] text-slate-400 mb-2">
              A auditoria testa cada chave configurada (micro-call, ~50 tokens) e o sistema passa a decidir sozinho quantas usar: chaves mortas são excluídas da rota, trabalho independente é distribuído entre as vivas e a troca em falha é automática. Semáforo verde/vermelho aparece no card de cada motor. Turbo usa 2 motores em paralelo (resposta mais rápida, ~2x quota) — desligado por padrão no plano gratuito.
          </p>
          {auditProgress && <p className="text-[11px] font-bold text-amber-300">{auditProgress}</p>}
          {keyHealth && Array.isArray(keyHealth.keys) && (
            <p className="text-[11px] text-slate-400 mt-1">
              Mapa: {keyHealth.keys.filter((k: any) => k.ok).length}/{keyHealth.keys.length} chaves OK
              {keyHealth.keys.filter((k: any) => !k.ok).slice(0, 6).map((k: any) => ` • ${k.provider} morta`).join('')}
            </p>
          )}
      </div>

      <div className="bg-slate-950/50 border border-emerald-500/20 rounded-2xl p-6 shadow-xl mb-12">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h3 className="text-xs font-black text-emerald-400 flex items-center gap-2 uppercase tracking-[0.2em]"> <Sparkles className="w-4 h-4" /> Modelos Gratuitos OpenRouter ({freePool.length} na rotação)</h3>
              <button
                  onClick={loadFreeModels}
                  disabled={catalogState === 'loading'}
                  className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-50"
              >
                  {catalogState === 'loading' ? 'Mapeando...' : freeModels.length > 0 ? 'Atualizar catálogo' : 'Mapear modelos grátis'}
              </button>
          </div>
          <p className="text-[11px] text-slate-400 mb-4">
              Somente modelos com custo zero entram na rotação — em 429/erro o sistema gira para o próximo marcado.
              {lastModel && (<span className="text-emerald-300 font-bold"> Último usado: {shortName(lastModel)}</span>)}
              {catalogState === 'error' && (<span className="text-amber-400 font-bold"> Catálogo offline — lista curada.</span>)}
          </p>
          {freeModels.length === 0 && catalogState !== 'loading' && (
              <p className="text-xs text-slate-500">Clique em “Mapear modelos grátis” para listar as IAs gratuitas disponíveis.</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
              {freeModels.map((m) => {
                  const on = freePool.includes(m.id);
                  return (
                      <button
                          key={m.id}
                          onClick={() => toggleFreeModel(m.id)}
                          title={m.id}
                          className={`text-left px-3 py-2 rounded-lg border transition-all ${on ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
                      >
                          <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full border flex-shrink-0 ${on ? 'bg-emerald-400 border-emerald-300' : 'border-slate-600'}`} />
                              <span className={`text-xs font-bold truncate ${on ? 'text-white' : 'text-slate-400'}`}>{shortName(m.id)}</span>
                          </div>
                          <div className="mt-1 text-[10px] text-slate-500 truncate">
                              {m.context > 0 ? `${Math.round(m.context / 1000)}k ctx` : 'ctx ?'}{m.tags.length > 0 ? ` • ${m.tags.join(', ')}` : ''}
                          </div>
                      </button>
                  );
              })}
          </div>
      </div>

      <div className="bg-slate-950/30 border border-slate-800 p-8 rounded-2xl space-y-12">
        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2"> <Cpu className="w-3 h-3"/> MÁQUINAS DE ELITE (MOTORES PRINCIPAIS) </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {mainLLMs.map(id => renderProviderCard(id, Sparkles))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2"> <Database className="w-3 h-3"/> MOTORES AUXILIARES & CLOUD HUB </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {otherLLMs.map(id => renderProviderCard(id, Globe))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2"> <Palette className="w-3 h-3"/> MULTIMÍDIA, VÍDEO & ÁUDIO </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {mediaEngines.map(id => renderProviderCard(id, Video))}
          </div>
        </section>
      </div>

      <div className="mt-12 flex items-center justify-between gap-4">
          <button 
              onClick={() => { if (confirm("Isso limpará TODAS as chaves de API e configurações salvas localmente. Deseja continuar?")) { localStorage.clear(); window.location.reload(); } }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800/50 text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50"
              disabled={saveState !== 'idle'}
          >
              <Trash2 className="w-4 h-4"/> Resetar Cache
          </button>
          
          <button 
              onClick={handleSave} 
              disabled={saveState !== 'idle'}
              className={`flex items-center gap-3 px-8 py-4 font-black rounded-2xl shadow-lg transition-all text-sm uppercase tracking-wider active:scale-95 disabled:opacity-50 ${saveState === 'saved' ? 'bg-emerald-500 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'}`}
          >
              {saveState === 'saving' ? <Loader2 className="w-5 h-5 animate-spin"/> : saveState === 'saved' ? <CheckCircle2 className="w-5 h-5"/> : <Save className="w-5 h-5"/>} 
              {saveState === 'saving' ? 'Salvando...' : saveState === 'saved' ? 'Salvo!' : 'Salvar Chaves'}
          </button>
      </div>
      {saveSummary && (
          <p className="mt-3 text-[11px] font-bold text-slate-300 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2">{saveSummary}</p>
      )}

      {helpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setHelpModal(null)}>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-black text-white">{helpModal.title}</h3>
              <button onClick={() => setHelpModal(null)} className="text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            <p className="text-sm text-slate-400 mb-4">{helpModal.desc}</p>
            <p className="text-xs text-slate-500 bg-slate-950 p-3 rounded-lg border border-slate-800">{helpModal.how}</p>
          </div>
        </div>
      )}

      {showConstitution && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in" onClick={() => setShowConstitution(false)}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                    <div className="flex items-center gap-4"><Terminal className="w-8 h-8 text-amber-500" /><div><h3 className="text-xl font-black text-white uppercase tracking-tighter">CONSTITUIÇÃO IA — V20 BLINDADA</h3><p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Protocolo de Segurança e Eficácia Máxima</p></div></div>
                    <button onClick={() => setShowConstitution(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-all"><X className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-black p-8 font-mono text-xs leading-relaxed text-slate-300 selection:bg-amber-500 selection:text-black">{GOLDEN_SYSTEM_INSTRUCTIONS}</div>
                <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end"><button onClick={() => setShowConstitution(false)} className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-black rounded-xl transition-all uppercase text-[10px] tracking-[0.2em] active:scale-95">Confirmar Leitura</button></div>
            </div>
        </div>
      )}
    </div>
  );
};

export default SettingsCenter;
