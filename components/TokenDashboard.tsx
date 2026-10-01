import React, { useEffect, useState } from 'react';
import { getCurrentCycleUsage, getProviderSettings, saveProviderSettings, ProviderSettings } from '../services/usageService';
import { 
  PieChart, Calendar, Activity, Settings, Save, Sparkles, Bot, Brain, 
  Search, CheckCircle2, AlertTriangle, Loader2, Server, Wifi, XCircle, 
  Home, Stethoscope, RefreshCw, Cpu, Database, Globe, Zap, Infinity, Wind,
  CloudLightning, Library, Star, Atom, Headphones, Palette, Video, Globe2
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { testConnection, DiagnosticResult, PROVIDER_CONFIGS } from '../services/core/aiClient';
import { useSharedContext } from '../contexts/SharedContext';

interface TokenDashboardProps {
    language: string;
}

const TokenDashboard: React.FC<TokenDashboardProps> = ({ language }) => {
    const { t } = useTranslation(language);
    const { setActiveTab } = useSharedContext();
    const [usageData, setUsageData] = useState<any>({});
    const [settings, setSettings] = useState<Record<string, ProviderSettings>>({});
    const [activeProvider, setActiveProvider] = useState(() => localStorage.getItem('primary_text_provider') || 'openrouter');
    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<DiagnosticResult | null>(null);
    const [testProvider, setTestProvider] = useState(() => localStorage.getItem('primary_text_provider') || 'openrouter');

    const getIcon = (id: string) => {
        switch(id) {
            case 'gemini': return Sparkles;
            case 'openai': return Bot;
            case 'anthropic': return Brain;
            case 'deepseek': return Database;
            case 'meta': return Infinity;
            case 'mistral': return Wind;
            case 'openrouter': return Globe;
            case 'qwen': return CloudLightning;
            case 'ernie': return Library;
            case 'moonshot': return Star;
            case 'zhipu': return Atom;
            case 'grok': return Zap;
            case 'elevenlabs': return Headphones;
            case 'stability': return Palette;
            case 'runway': return Video;
            default: return Server;
        }
    };

    const getColor = (id: string) => {
        switch(id) {
            case 'gemini': return 'text-blue-400';
            case 'openai': return 'text-emerald-400';
            case 'anthropic': return 'text-amber-400';
            case 'deepseek': return 'text-indigo-400';
            case 'meta': return 'text-blue-500';
            case 'mistral': return 'text-orange-400';
            case 'openrouter': return 'text-violet-400';
            case 'grok': return 'text-purple-400';
            default: return 'text-slate-400';
        }
    };

    useEffect(() => { 
        loadData(); 
        const interval = setInterval(loadData, 15000); 
        return () => clearInterval(interval); 
    }, []);

    useEffect(() => { 
        setTestProvider(activeProvider);
        setTestResult(null); 
    }, [activeProvider]);

    const loadData = () => { 
        setSettings(getProviderSettings()); 
        const usage: any = {}; 
        Object.keys(PROVIDER_CONFIGS).forEach(id => { usage[id] = getCurrentCycleUsage(id); }); 
        setUsageData(usage); 
    };

    const handleSaveSettings = () => { 
        saveProviderSettings(settings); 
        alert("Configurações de custos gravadas com sucesso!");
        loadData(); 
    };

    const handleTestApi = async () => {
        setTesting(true); 
        setTestResult(null);
        const envMap: Record<string,string> = { '9router': (process.env as any).LITELLM_API_KEY_9ROUTER || '', 'openrouter': (process.env as any).LITELLM_API_KEY_OPENROUTER || '', 'nvidia': (process.env as any).NVIDIA_API || '', 'polinai': (process.env as any).POLINAI_API || '', 'groq': (process.env as any).GROQ_API || '', 'grok': (process.env as any).GROK_API || '', 'mistral': (process.env as any).MISTRAL_API || '', 'gemini': (process.env as any).API_KEY || '' };
        const apiKey = envMap[testProvider] || localStorage.getItem(`${testProvider}_api_key`) || '';
        
        if (!apiKey) { 
            setTestResult({ success: false, message: "Chave ausente.", latency: 0 }); 
            setTesting(false); 
            return; 
        }
        
        const result = await testConnection(testProvider, apiKey);
        setTestResult(result); 
        setTesting(false);
    };

    const currentUsage = usageData[activeProvider] || { totalUsed: 0, limit: 1000000, totalInput: 0, totalOutput: 0, renewalDate: new Date() };
    const percent = Math.min(100, Math.round((currentUsage.totalUsed / currentUsage.limit) * 100));
    let strokeColor = percent > 90 ? '#ef4444' : percent > 75 ? '#eab308' : '#10b981';

    return (
        <div className="max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar p-6 pb-20">
            {/* HEADER */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Activity className="w-8 h-8 text-blue-400" />
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">Controle de Custos</h2>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Monitoramento de Recursos Globais</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setActiveTab('home')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 transition-all">
                        <Home className="w-3 h-3" /> Início
                    </button>
                    <button onClick={handleSaveSettings} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-black text-xs shadow-lg flex items-center gap-2 transition-all active:scale-95">
                        <Save className="w-3 h-3" /> Salvar
                    </button>
                </div>
            </div>

            {/* SELEÇÃO DE PROVEDORES */}
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 mb-8">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-2">Motores Ativos no Sistema</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                    {Object.keys(PROVIDER_CONFIGS).map(id => {
                        const Icon = getIcon(id);
                        const envHasKey = (id==='9router'&&(process.env as any).LITELLM_API_KEY_9ROUTER)||(id==='openrouter'&&(process.env as any).LITELLM_API_KEY_OPENROUTER)||(id==='nvidia'&&(process.env as any).NVIDIA_API)||(id==='polinai'&&(process.env as any).POLINAI_API)||(id==='groq'&&(process.env as any).GROQ_API)||(id==='grok'&&(process.env as any).GROK_API)||(id==='mistral'&&(process.env as any).MISTRAL_API)||(id==='gemini'&&(process.env as any).API_KEY);
                        const hasKey = !!envHasKey || (localStorage.getItem(`${id}_api_key`)?.length || 0) > 5;
                        return (
                            <button 
                                key={id} 
                                onClick={() => setActiveProvider(id)} 
                                className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 relative group ${activeProvider === id ? 'bg-slate-900 border-blue-500/50 shadow-xl' : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'} ${!hasKey ? 'opacity-60 grayscale' : ''}`}
                            >
                                <Icon className={`w-4 h-4 ${activeProvider === id ? getColor(id) : 'text-slate-600'}`} />
                                <span className={`font-bold text-[9px] uppercase tracking-tighter truncate w-full text-center ${activeProvider === id ? 'text-white' : 'text-slate-300'}`}>{PROVIDER_CONFIGS[id].name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* CICLO ATUAL */}
                <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800 rounded-3xl p-10 flex flex-col items-center justify-center shadow-2xl h-full min-h-[450px]">
                    <div className="flex items-center gap-2 mb-10">
                        <RefreshCw className="w-4 h-4 text-slate-600" />
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ciclo Atual</h3>
                    </div>
                    
                    <div className="relative w-56 h-56 mb-8">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="50%" cy="50%" r="42%" stroke="#020617" strokeWidth="12" fill="transparent" />
                            <circle 
                                cx="50%" cy="50%" r="42%" 
                                stroke={strokeColor} 
                                strokeWidth="12" 
                                fill="transparent" 
                                strokeDasharray={`${2 * Math.PI * 42 * 0.01 * percent} ${2 * Math.PI * 42}`} 
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out" 
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-5xl font-black text-emerald-400">{percent}%</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase mt-1">usado</span>
                        </div>
                    </div>

                    <div className="text-center">
                        <div className="text-3xl font-black text-white tracking-tight">{currentUsage.totalUsed.toLocaleString()}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">tokens consumidos</div>
                    </div>
                </div>

                {/* CONFIG E DIAGNOSTICO */}
                <div className="lg:col-span-8 space-y-6">
                    
                    {/* LIMITES FORM */}
                    <div className="bg-slate-900/60 border border-indigo-500/10 rounded-2xl p-8 shadow-xl">
                        <h3 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                             <Settings className="w-4 h-4" /> Configurar Limites: {PROVIDER_CONFIGS[activeProvider]?.name}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Meta Mensal (Tokens)</label>
                                <input aria-label="Meta Mensal (Tokens)" 
                                    type="number" 
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white font-bold outline-none focus:border-indigo-500 text-sm" 
                                    value={settings[activeProvider]?.limit || 0}
                                    onChange={(e) => setSettings({...settings, [activeProvider]: { ...settings[activeProvider], limit: parseInt(e.target.value) }})}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1">Dia da Renovação</label>
                                <input aria-label="Dia da Renovação" 
                                    type="number" min="1" max="31"
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white font-bold outline-none focus:border-indigo-500 text-sm" 
                                    value={settings[activeProvider]?.renewalDay || 1}
                                    onChange={(e) => setSettings({...settings, [activeProvider]: { ...settings[activeProvider], renewalDay: parseInt(e.target.value) }})}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button onClick={handleSaveSettings} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 px-10 rounded-xl shadow-lg transition-all flex items-center gap-2 text-xs uppercase tracking-widest active:scale-95">
                                <Save className="w-4 h-4" /> Aplicar Alterações
                            </button>
                        </div>
                    </div>

                    {/* DIAGNOSTICO DE CONEXAO */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                            <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                <Wifi className="w-4 h-4 text-blue-400" /> DIAGNÓSTICO DE CONEXÃO
                            </h3>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <select 
                                    aria-label="Provedor para diagnóstico de conexão"
                                    className="bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-4 text-xs text-white font-bold outline-none focus:border-blue-500 min-w-[200px]"
                                    value={testProvider}
                                    onChange={(e) => setTestProvider(e.target.value)}
                                >
                                    {Object.keys(PROVIDER_CONFIGS).map(id => (
                                        <option key={id} value={id}>{PROVIDER_CONFIGS[id].name}</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={handleTestApi} 
                                    disabled={testing} 
                                    className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black py-2.5 px-8 rounded-lg flex items-center gap-2 transition-all shadow-lg active:scale-95"
                                >
                                    {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wifi className="w-3.5 h-3.5" />} 
                                    {testing ? 'Pingando...' : 'Verificar'}
                                </button>
                            </div>
                        </div>

                        <div className="bg-slate-950 border border-slate-800 rounded-lg p-6 min-h-[80px] flex items-center justify-center">
                            {testResult ? (
                                <div className={`flex items-center gap-4 w-full animate-in slide-in-from-top-2 ${testResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {testResult.success ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                                    <div>
                                        <p className="font-black uppercase tracking-widest text-sm">{testResult.message}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Latência: {testResult.latency}ms | Node: {testProvider.toUpperCase()}</p>
                                    </div>
                                </div>
                            ) : (
                                                                        <p className="text-[11px] text-slate-400 italic text-center">Selecione qualquer um dos motores mundiais e clique em verificar.</p>
                            )}
                        </div>
                    </div>

                    {/* ENTRADA / SAÍDA CARDS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">ENTRADA (Contexto)</div>
                            <div className="text-2xl font-black text-blue-400">{currentUsage.totalInput.toLocaleString()}</div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">SAÍDA (Geração)</div>
                            <div className="text-2xl font-black text-fuchsia-400">{currentUsage.totalOutput.toLocaleString()}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TokenDashboard;