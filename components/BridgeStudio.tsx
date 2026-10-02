import React, { useState } from 'react';
import { Globe, Home, Lock, Unlock, Cpu } from 'lucide-react';
import { CREWAI_MARKETING_PERSONAS } from '../data/crewai-personas';
import { OutputKindBadge } from './ToolLayout';
import { SectionHelp } from './SectionHelp';
import { RefinementToolbar } from './RefinementToolbar';
import { useSharedContext } from '../contexts/SharedContext';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { splitNotaBlock } from '../utils/stripCopyFormat';

export interface BridgeField {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'textarea' | 'select';
  options?: string[];
  required?: boolean;
}

export interface BridgeConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  description: string;
  fields: BridgeField[];
  requiredKey: string;
  requiredError: string;
  generate: (params: any, onChunk?: (text: string) => void) => Promise<any>;
  personaTag?: string;
  sessionId?: string; // Para guia F1 detalhado
}

/** Componente genérico que paira por cima de todos os serviços bridge (Growth/RevOps/B2B Sales). */
export default function BridgeStudio({ language, config }: { language: string; config: BridgeConfig }) {
  const { setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream, setError } = useAIGenerator();

  const [result, setResult] = useState('');
  const [note, setNote] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [crewPersona, setCrewPersona] = useState('');

  const initial: Record<string, string> = {};
  config.fields.forEach(f => { initial[f.key] = f.type === 'select' && f.options ? f.options[0] : ''; });
  const [params, setParams] = useState<Record<string, string>>(initial);

  const personas = config.personaTag
    ? CREWAI_MARKETING_PERSONAS.filter(p => p.bestFor.includes(config.personaTag))
    : CREWAI_MARKETING_PERSONAS;

  const handleGenerate = () => {
    if (!params[config.requiredKey]?.trim()) {
      setError(config.requiredError);
      return;
    }
    setResult('');
    setNote('');

    generateStream(
      (onChunk) => config.generate({ ...params, language, crewPersona: crewPersona || undefined }, onChunk),
      (streamedText) => {
        // Nota apos o ULTIMO |||NOTA_DIVIDER|||; todas as secoes ficam no
        // entregavel (divisores EMAIL/LAUNCH viram regua visivel, nunca cru).
        const { content, note } = splitNotaBlock(streamedText);
        setResult(content);
        setNote(note);
      },
      (finalText) => {
        if (!finalText || finalText.trim().length < 50) {
          setError('O modelo retornou uma resposta vazia. Tente novamente.');
        }
      }
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-y-auto custom-scrollbar">
      {/* SIDEBAR */}
      <div className="lg:col-span-4 flex flex-col h-full">
        <div className={`bg-slate-900 border p-6 rounded-2xl mb-6 flex-shrink-0 transition-all ${isLocked ? 'border-indigo-500/30 bg-slate-900/80 relative' : 'border-slate-800 shadow-2xl'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-black flex items-center gap-2 uppercase tracking-tighter ${config.colorClass}`}>
              {config.icon} {config.title}
              <OutputKindBadge kind="text" />
              <SectionHelp title={config.title} description={config.description} sessionId={config.sessionId} />
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setAppActiveTab('home')} title="Voltar ao Início" aria-label="Voltar ao Início" className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-all"><Home className="w-4 h-4" /></button>
              <button onClick={() => setIsLocked(!isLocked)} title={isLocked ? "Desbloquear edição" : "Bloquear edição"} aria-label={isLocked ? "Desbloquear edição" : "Bloquear edição"} className={`p-2 rounded-lg transition-all border ${isLocked ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>{isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}</button>
            </div>
          </div>

          <div className={`space-y-4 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            {config.fields.map(f => (
              <div className="space-y-1" key={f.key}>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  {f.label}{f.required ? ' *' : ''}
                </label>
                {f.type === 'textarea' ? (
                  <textarea aria-label={f.label} placeholder={f.placeholder} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-indigo-500 h-20 resize-none" value={params[f.key]} onChange={e => setParams({ ...params, [f.key]: e.target.value })} />
                ) : f.type === 'select' ? (
                  <select aria-label={f.label} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-indigo-500" value={params[f.key]} onChange={e => setParams({ ...params, [f.key]: e.target.value })}>
                    {f.options!.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input aria-label={f.label} type="text" placeholder={f.placeholder} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-indigo-500" value={params[f.key]} onChange={e => setParams({ ...params, [f.key]: e.target.value })} />
                )}
              </div>
            ))}

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5 ml-1">
                <Globe className="w-3.5 h-3.5 text-purple-400" /> Persona CrewAI
              </label>
              <select aria-label="Persona CrewAI" className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-purple-500" value={crewPersona} onChange={e => setCrewPersona(e.target.value)} disabled={loading}>
                <option value="">— Sem persona (padrão)</option>
                {personas.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
              </select>
            </div>

            <button onClick={handleGenerate} disabled={loading || !params[config.requiredKey]?.trim()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:shadow-none">
              {loading ? 'Gerando...' : 'Gerar'}
            </button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="lg:col-span-8 flex flex-col h-full">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              {config.icon}
              Resultado
            </h3>
            {result && <RefinementToolbar text={result} onTextUpdate={setResult} language={language} />}
          </div>

          {error && (
            <div className="bg-red-950/50 border border-red-500/30 rounded-xl p-4 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {result ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-slate-300 text-sm font-mono leading-relaxed">{result}</pre>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Cpu className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Configure os parâmetros e clique em Gerar</p>
                </div>
              </div>
            )}
          </div>

          {note && (
            <div className="mt-4 bg-amber-950/30 border border-amber-500/20 rounded-xl p-4">
              <p className="text-amber-400 text-xs font-black uppercase tracking-wider mb-2">Nota do Estrategista</p>
              <p className="text-amber-200/80 text-sm whitespace-pre-wrap">{note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
