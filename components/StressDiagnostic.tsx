import React, { useState, useEffect } from 'react';
import { 
    Stethoscope, Activity, ShieldCheck, AlertTriangle, Terminal, RefreshCw, 
    CheckCircle2, XCircle, Home, Zap, X, Eye, ShieldAlert, Cpu, Layers, 
    ChevronRight, Search, Lock, Unlock, ClipboardCheck, BarChart3, Target, Info,
    LayoutGrid, ListChecks, FileWarning, SearchCode, Database, Share2, Palette
} from 'lucide-react';
import { runStressTestService, AUDIT_MODULE_IDS, AUDIT_CATEGORIES, StressTestResult, AuditCriterion } from '../services/modules/tools/diagnostic';
import { useSharedContext } from '../contexts/SharedContext';
import { SectionHelp } from './SectionHelp';

export default function StressDiagnostic({ language }: { language: string }) {
    const { setActiveTab } = useSharedContext();
    const [isRunning, setIsRunning] = useState(false);
    const [currentModuleId, setCurrentModuleId] = useState<string | null>(null);
    const [results, setResults] = useState<StressTestResult[]>([]);
    const [selectedOutput, setSelectedOutput] = useState<StressTestResult | null>(null);
    const [repairing, setRepairing] = useState(false);
    const [auditMode, setAuditMode] = useState<'rapida' | 'completa'>('rapida');

    // Lista viva do diagnostic.ts — nunca hardcoded (senão módulos novos ficam fora da varredura).
    const modules = AUDIT_MODULE_IDS;

    const runFullAudit = async () => {
        setIsRunning(true);
        setResults([]);

        for (const modId of modules) {
            setCurrentModuleId(modId);
            const res = await runStressTestService(modId, language, auditMode);
            setResults(prev => [...prev, res]);
            // Pequeno delay para efeito visual de escaneamento em cascata
            await new Promise(r => setTimeout(r, 600));
        }

        setIsRunning(false);
        setCurrentModuleId(null);
    };

    // Reparo honesto: re-testa apenas os módulos reprovados em vez de
    // alegar purificação. Se todos passaram, apenas limpa o painel.
    const handleRepair = async () => {
        const failed = results.filter(r => r.complianceScore < 100).map(r => r.module);
        if (failed.length === 0) {
            setResults([]);
            return;
        }
        setRepairing(true);
        for (const modId of failed) {
            setCurrentModuleId(modId);
            const res = await runStressTestService(modId, language, auditMode);
            setResults(prev => prev.map(p => (p.module === modId ? res : p)));
            await new Promise(r => setTimeout(r, 600));
        }
        setRepairing(false);
        setCurrentModuleId(null);
    };

    const categories = AUDIT_CATEGORIES;

    return (
        <div className="max-w-7xl mx-auto p-4 animate-in fade-in duration-500 pb-40">
            {/* CABEÇALHO FORENSE */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                <div>
                    <h2 className="text-4xl font-black text-white flex items-center gap-3 tracking-tighter">
                        <Stethoscope className="w-12 h-12 text-emerald-400" /> AUDITORIA V{AUDIT_MODULE_IDS.length}
                        <span className="bg-emerald-500/10 text-emerald-500 text-[10px] px-3 py-1 rounded-full border border-emerald-500/20 font-black uppercase tracking-widest ml-4">Full Scan Mode</span>
                    </h2>
                    <p className="text-slate-400 text-[11px] uppercase tracking-[0.4em] font-black mt-3 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Monitoramento em Tempo Real de {AUDIT_MODULE_IDS.length} Módulos
                    </p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={runFullAudit} 
                        disabled={isRunning || repairing} 
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-black py-4 px-10 rounded-2xl shadow-xl transition-all flex items-center gap-3 uppercase tracking-widest text-xs active:scale-95"
                    >
                        {isRunning ? <RefreshCw className="w-5 h-5 animate-spin" /> : <SearchCode className="w-5 h-5" />} 
                        {isRunning ? `Escaneando: ${currentModuleId}` : "Iniciar Varredura Forense"}
                    </button>
                    <div className="flex bg-slate-900 border border-slate-800 rounded-2xl p-1" role="group" aria-label="Modo de auditoria">
                        <button
                            onClick={() => setAuditMode('rapida')}
                            disabled={isRunning || repairing}
                            title={`${AUDIT_MODULE_IDS.length} chamadas: testa cada serviço real com asserts determinísticos`}
                            className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${auditMode === 'rapida' ? 'bg-emerald-600 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                        >
                            Rápida ({AUDIT_MODULE_IDS.length} calls)
                        </button>
                        <button
                            onClick={() => setAuditMode('completa')}
                            disabled={isRunning || repairing}
                            title={`${AUDIT_MODULE_IDS.length * 2} chamadas: rápida + juiz LLM por módulo`}
                            className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${auditMode === 'completa' ? 'bg-emerald-600 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                        >
                            Completa ({AUDIT_MODULE_IDS.length * 2} calls)
                        </button>
                    </div>
                    <button onClick={() => setActiveTab('home')} title="Voltar para o Início" aria-label="Voltar para o Início" className="p-4 bg-slate-900 hover:bg-slate-800 rounded-2xl text-slate-400 border border-slate-800 shadow-lg"><Home className="w-6 h-6"/></button>
                </div>
            </div>

            {/* STATUS GLOBAL & REPARO */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
                <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldCheck className="w-40 h-40" /></div>
                    <div className="relative z-10 flex flex-col sm:flex-row items-center gap-8">
                        <div className="text-center sm:text-left">
                            <h3 className="text-xl font-black text-white mb-2 uppercase tracking-tight">Status de Integridade Global</h3>
                            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">Cada módulo executa seu serviço real com briefing de prova e asserts determinísticos (seletor, formato, divisores).</p>
                        </div>
                        <div className="flex-1 flex gap-4 w-full sm:w-auto">
                            <div className="flex-1 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center">
                                <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Média Compliance</div>
                                <div className="text-2xl font-black text-emerald-400">{results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.complianceScore, 0) / results.length) : '--'}%</div>
                            </div>
                            <div className="flex-1 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-center">
                                <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Auditados</div>
                                <div className="text-2xl font-black text-white">{results.length}/{modules.length}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center text-center shadow-inner group">
                    {results.some(r => r.complianceScore < 100) && !isRunning ? (
                        <div className="animate-in zoom-in-95 w-full">
                            <p className="text-[10px] text-red-500 font-black uppercase mb-4 animate-pulse tracking-widest flex items-center justify-center gap-2"><FileWarning className="w-3 h-3" /> Falhas Detectadas</p>
                            <button onClick={handleRepair} disabled={repairing || isRunning} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs active:scale-95">
                                {repairing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />} {repairing ? 'Re-testando...' : 'Re-testar Reprovados'}
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Integridade de Dados</div>
                            <div className="w-20 h-20 rounded-full border-4 border-slate-900 flex items-center justify-center relative">
                                <div className="absolute inset-0 border-4 border-emerald-500/30 rounded-full animate-ping"></div>
                                <ShieldCheck className="w-8 h-8 text-emerald-500" />
                            </div>
                            <p className="text-[9px] text-slate-400 uppercase font-bold mt-4">Sistema Operando em Elite</p>
                        </>
                    )}
                </div>
            </div>

            {/* VARREDURA EM CASCATA */}
            <div className="space-y-12">
                {categories.map(cat => {
                    const catResults = results.filter(r => r.category === cat);
                    if (catResults.length === 0 && !isRunning) return null;

                    return (
                        <div key={cat} className="animate-in fade-in duration-700">
                            <div className="flex items-center gap-4 mb-6">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] border-l-4 border-indigo-500 pl-4">{cat} Studio Audit</h3>
                                <div className="flex-1 h-[1px] bg-slate-800"></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {results.filter(r => r.category === cat).map((res, i) => (
                                    <div key={i} className={`bg-slate-900 border rounded-3xl overflow-hidden shadow-xl transition-all hover:border-slate-700 ${res.status === 'passed' ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                                        <div className="p-5 flex justify-between items-center bg-slate-950/40 border-b border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${res.status === 'passed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    <Target className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-black text-white uppercase tracking-tight">{res.moduleLabel}</span>
                                            </div>
                                            <div className={`text-sm font-black ${res.complianceScore === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>{res.complianceScore}%</div>
                                        </div>

                                        <div className="p-6 space-y-4">
                                            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/50">
                                                <div className="text-[9px] font-black text-slate-400 uppercase mb-2 flex items-center gap-2"><ClipboardCheck className="w-3 h-3"/> Propósito Auditado:</div>
                                                <p className="text-[11px] text-slate-300 font-medium leading-relaxed">{res.purposeValidation.intended}</p>
                                            </div>

                                            <div className="space-y-2">
                                                {res.criteria.map(c => (
                                                    <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-black/20 border border-slate-800/30 group">
                                                        <div className="flex items-center gap-2">
                                                            {c.passed ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                                                            <span className={`text-[9px] font-bold ${c.passed ? 'text-slate-400' : 'text-red-400'}`}>{c.label}</span>
                                                        </div>
                                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bg-slate-800 text-[8px] p-2 rounded shadow-2xl z-20 pointer-events-none -translate-y-8">{c.details}</div>
                                                        <span className="text-[8px] font-black text-slate-400 uppercase">{c.passed ? 'PASS' : 'FAIL'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="p-4 bg-slate-950/40 border-t border-slate-800 flex justify-end">
                                            <button onClick={() => setSelectedOutput(res)} className="text-[10px] font-black text-indigo-400 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors">
                                                <Eye className="w-3.5 h-3.5" /> Inspecionar RAW
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {isRunning && currentModuleId && modules.indexOf(currentModuleId) >= 0 && results.filter(r => r.category === cat).length < modules.filter(m => m === currentModuleId).length && (
                                     <div className="p-12 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-4 bg-slate-900/10 animate-pulse">
                                        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest text-center">Auditando Sessão...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MODAL DE INSPEÇÃO RAW DATA */}
            {selectedOutput && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/98 backdrop-blur-2xl animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl flex flex-col max-h-[92vh] shadow-2xl overflow-hidden">
                        <div className="p-8 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-white flex items-center gap-3 tracking-tighter uppercase"> 
                                    <Terminal className="w-8 h-8 text-indigo-500" /> Auditoria Raw Data: {selectedOutput.moduleLabel}
                                </h3>
                                <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Análise Forense de Saída sem Tratamento</p>
                            </div>
                            <button onClick={() => setSelectedOutput(null)} className="text-slate-500 hover:text-white p-3 hover:bg-slate-800 rounded-xl transition-all active:scale-90"><X className="w-8 h-8" /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black p-10 font-mono text-xs leading-relaxed text-indigo-100 whitespace-pre-wrap selection:bg-indigo-500 selection:text-white">
                            <div className="mb-8 p-4 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-[10px] text-indigo-300/70">
                                // PROTOCOLO DE AUDITORIA V24 - LOG DE SAÍDA REAL TIME<br/>
                                // CATEGORIA: {selectedOutput.category.toUpperCase()}<br/>
                                // LATÊNCIA: {selectedOutput.latency}ms<br/>
                                // STATUS: {selectedOutput.complianceScore === 100 ? 'Íntegro' : 'Derivado'}
                            </div>
                            {selectedOutput.rawOutput || "// Falha na captura de buffer."}
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex justify-end items-center gap-4">
                            <div className="flex gap-10 mr-auto ml-4">
                                <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Duração: {(selectedOutput.latency / 1000).toFixed(2)}s</div>
                                <div className={`text-[10px] uppercase font-black tracking-widest ${selectedOutput.complianceScore < 100 ? 'text-red-500' : 'text-emerald-500'}`}>Score Compliance: {selectedOutput.complianceScore}/100</div>
                            </div>
                            <button onClick={() => setSelectedOutput(null)} className="px-12 py-4 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-700 transition-all uppercase text-xs tracking-widest border border-slate-700 active:scale-95 shadow-xl">Encerrar Inspeção</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
