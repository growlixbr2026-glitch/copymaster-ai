import React, { useState } from 'react';
import { Swords, Home, Lock, Unlock, Target } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { useSharedContext } from '../contexts/SharedContext';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { generateCompetitorService } from '../services/modules/strategy/competitor';
import { CREWAI_MARKETING_PERSONAS } from '../data/crewai-personas';
import { OutputKindBadge } from './ToolLayout';
import { SectionHelp } from './SectionHelp';
import { RefinementToolbar } from './RefinementToolbar';
import { splitNotaBlock } from '../utils/stripCopyFormat';

const FOCUS_CRITERIA = ['all', 'price', 'features', 'ux', 'support'];

export default function CompetitorStudio({ language }: { language: string }) {
  const { t } = useTranslation(language);
  const { setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream, setError } = useAIGenerator();

  const [result, setResult] = useState('');
  const [note, setNote] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [crewPersona, setCrewPersona] = useState('');

  const [params, setParams] = useState({
    productName: '',
    productBrief: '',
    competitors: '',
    focusCriteria: 'all',
  });

  const competitorPersonas = CREWAI_MARKETING_PERSONAS.filter(p => p.bestFor.includes('copy'));

  const handleGenerate = () => {
    if (!params.productName.trim() || !params.competitors.trim()) {
      setError('Insira o nome do produto e os concorrentes.');
      return;
    }

    setResult('');
    setNote('');

    generateStream(
      (onChunk) => generateCompetitorService({
        ...params,
        language,
        crewPersona: crewPersona || undefined,
      }, onChunk),
      (streamedText) => {
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
            <h2 className="text-xl font-black flex items-center gap-2 text-red-400 uppercase tracking-tighter">
              <Swords className="w-6 h-6" /> Competitor Analysis
              <OutputKindBadge kind="text" />
              <SectionHelp title="Competitor Alternatives" description="Analise concorrentes e alternativas. Inclui matriz de comparação, pontos fortes/fracos, gaps de mercado, SWOT e posicionamento recomendado." sessionId="competitor" />
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setAppActiveTab('home')} title="Voltar para o Início" aria-label="Voltar para o Início" className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-all"><Home className="w-4 h-4" /></button>
              <button onClick={() => setIsLocked(!isLocked)} title={isLocked ? "Desbloquear edição" : "Bloquear edição"} aria-label={isLocked ? "Desbloquear edição" : "Bloquear edição"} className={`p-2 rounded-lg transition-all border ${isLocked ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>{isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}</button>
            </div>
          </div>

          <div className={`space-y-4 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nome do Produto *</label>
              <input aria-label="Nome do Produto" type="text" placeholder="ex: MeuApp de Gestão" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-red-500" value={params.productName} onChange={e => setParams({...params, productName: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Descrição do Produto</label>
              <textarea aria-label="Descrição do Produto" placeholder="Breve descrição do que seu produto faz..." className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-red-500 h-20 resize-none" value={params.productBrief} onChange={e => setParams({...params, productBrief: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Concorrentes *</label>
              <textarea aria-label="Concorrentes" placeholder="Liste 2-5 concorrentes (nomes ou URLs, separados por vírgula)" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-red-500 h-20 resize-none" value={params.competitors} onChange={e => setParams({...params, competitors: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Critérios de Foco</label>
              <select aria-label="Critérios de Foco" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-red-500" value={params.focusCriteria} onChange={e => setParams({...params, focusCriteria: e.target.value})}>
                {FOCUS_CRITERIA.map(c => <option key={c} value={c}>{c === 'all' ? 'Todos' : c}</option>)}
              </select>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5 ml-1">
                <Target className="w-3.5 h-3.5 text-purple-400" /> Persona CrewAI
              </label>
              <select aria-label="Persona CrewAI" className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-purple-500" value={crewPersona} onChange={e => setCrewPersona(e.target.value)} disabled={loading}>
                <option value="">✨ Sem persona (padrão)</option>
                {competitorPersonas.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || !params.productName.trim() || !params.competitors.trim()}
              className="w-full py-4 bg-red-600 hover:bg-red-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-red-500/20 disabled:shadow-none"
            >
              {loading ? 'Analisando...' : 'Analisar Concorrentes'}
            </button>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="lg:col-span-8 flex flex-col h-full">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Swords className="w-5 h-5 text-red-400" />
              Análise Competitiva
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
                  <Swords className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Configure os parâmetros e clique em Analisar Concorrentes</p>
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
