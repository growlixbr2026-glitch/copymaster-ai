import React, { useState, useEffect } from 'react';
import { Video, Wand2, Link2, Play, ShieldCheck, Target, AlertTriangle, RefreshCw, Brain } from 'lucide-react';
import { getLocalizedLists } from '../constants';
import { CREWAI_MARKETING_PERSONAS } from '../data/crewai-personas';
import { generateVSLService } from '../services/geminiService';
import { runCrewWorkflow } from '../services/modules/copy/crewaiWorkflowService';
import { useTranslation } from '../hooks/useTranslation';
import { SectionHelp } from './SectionHelp';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { RefinementToolbar } from './RefinementToolbar';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { ToolLayout } from './ToolLayout';
import { sanitizeTeleprompter } from '../utils/outputGuard';
import { splitNotaBlock } from '../utils/stripCopyFormat';

interface VSLStudioProps {
  language: string;
}

const VSLStudio: React.FC<VSLStudioProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  const [result, setResult] = useState({ content: '', note: '' });
  const [isLocked, setIsLocked] = useState(false);
  const { t, langCode } = useTranslation(language);
  
  const { vslFrameworks } = getLocalizedLists(langCode);

  // ESTADO LOCAL ISOLADO
  const [localContext, setLocalContext] = useState('');

  const [params, setParams] = useState({
    framework: vslFrameworks[0], productName: '', mainPain: '',
    uniqueMechanism: '', offer: '', guarantee: ''
  });

  // CrewAI: persona especialista (prompts.chat) + modo estruturado
  const [crewPersona, setCrewPersona] = useState('');
  const [useCrewAI, setUseCrewAI] = useState(false);
  const vslPersonas = CREWAI_MARKETING_PERSONAS.filter(p => p.bestFor.includes('vsl'));

  const vslHelpDescription = `
O que é o Roteirista Profissional de VSL:
O VSL (Video Sales Letter) é um dos ativos mais caros e poderosos do marketing digital.
`;

  useEffect(() => { setParams(p => ({ ...p, framework: vslFrameworks[0] })); }, [langCode, vslFrameworks]);

  const handleImportGlobal = () => {
    setLocalContext(sharedContext);
  };

  const handleGenerate = async () => {
    if (!localContext || !params.productName) { alert("Preencha o Nome do Produto e o Contexto."); return; }
    setResult({ content: '', note: '' });

    const crewContext = {
      ...params,
      context: localContext,
      language,
      crewPersona: crewPersona || '',
    };

    generateStream(
        (onChunk) => useCrewAI
          // Pipeline CrewAI real: pesquisa → estrutura → roteiro → revisão (4 chamadas)
          ? runCrewWorkflow('vsl', crewContext, onChunk)
          // Modo padrão: 1 chamada com persona opcional
          : generateVSLService({ ...params, context: localContext, language, crewPersona: crewPersona || undefined }, onChunk),
        (streamedText) => {
            // Texto puro (tradicional) ou workflow CrewAI recomposto: a nota
            // começa no ÚLTIMO |||NOTA_DIVIDER||| e todo o resto fica no script.
            const { content, note } = splitNotaBlock(streamedText);
            // Sanitização de teleprompter: travessões viram pausa simples.
            setResult({ content: sanitizeTeleprompter(content).trim(), note });
        }
    );
  };

  const handleVoiceInput = (text: string) => { setLocalContext(prev => prev ? prev + ' ' + text : text); };

  const sidebarContent = (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-300 block mb-1">{t('vsl_framework')}</label>
        <select aria-label={t('vsl_framework')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-red-500 outline-none text-sm" value={params.framework} onChange={(e) => setParams({...params, framework: e.target.value})} disabled={loading || isLocked}>{vslFrameworks.map(f => (<option key={f} value={f}>{f}</option>))}</select>
      </div>
      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
        <label className="text-sm font-medium text-slate-300 flex items-center gap-1">
          <Brain className="w-3.5 h-3.5 text-purple-400" /> Persona CrewAI
        </label>
        <select aria-label="Persona CrewAI" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-purple-500 outline-none" value={crewPersona} onChange={(e) => setCrewPersona(e.target.value)} disabled={loading || isLocked}>
          <option value="">✨ Sem persona (padrão)</option>
          {vslPersonas.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
        </select>
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
          <input type="checkbox" checked={useCrewAI} onChange={(e) => setUseCrewAI(e.target.checked)} disabled={loading || isLocked} className="accent-purple-500" />
          Modo CrewAI (pipeline em etapas: pesquisa → estrutura → roteiro → revisão)
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 bg-slate-900 p-4 rounded-lg border border-slate-800">
          <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">{t('vsl_product')}</label><input aria-label={t('vsl_product')} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-red-500 outline-none" value={params.productName} onChange={(e) => setParams({...params, productName: e.target.value})} disabled={loading || isLocked} /></div>
          <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-red-400"/> {t('vsl_pain')}</label><textarea aria-label={t('vsl_pain')} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-red-500 outline-none resize-none h-16" value={params.mainPain} onChange={(e) => setParams({...params, mainPain: e.target.value})} disabled={loading || isLocked}></textarea></div>
          <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold flex items-center gap-1"><Target className="w-3 h-3 text-emerald-400"/> {t('vsl_mechanism')}</label><input aria-label="Ex: O Método 3X..." className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-red-500 outline-none" placeholder="Ex: O Método 3X..." value={params.uniqueMechanism} onChange={(e) => setParams({...params, uniqueMechanism: e.target.value})} disabled={loading || isLocked} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">{t('vsl_offer')}</label><input aria-label={t('vsl_offer')} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-red-500 outline-none" placeholder="Ex: 12x R$97" value={params.offer} onChange={(e) => setParams({...params, offer: e.target.value})} disabled={loading || isLocked} /></div>
            <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">{t('vsl_guarantee')}</label><input aria-label={t('vsl_guarantee')} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-red-500 outline-none" placeholder="Ex: 7 dias" value={params.guarantee} onChange={(e) => setParams({...params, guarantee: e.target.value})} disabled={loading || isLocked} /></div>
          </div>
      </div>
      <div className="relative">
          <div className="absolute right-2 top-8 z-10 flex gap-2">
            {sharedContext && (
                <button onClick={handleImportGlobal} className="p-2 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                    <Brain className="w-4 h-4" />
                </button>
            )}
            {!loading && !isLocked && <SpeechInput onTranscript={handleVoiceInput} language={language} />}
          </div>
         <div className="flex justify-between items-center mt-1 mb-1"><label className="text-sm font-medium text-slate-300 block">{t('vsl_context')}</label><div className="flex items-center gap-1 text-xs text-red-400"><Link2 className="w-3 h-3" /> Sessão Isolada</div></div>
        <textarea aria-label={t('placeholder_context')} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-red-500 outline-none text-sm pr-10 text-slate-200" placeholder={t('placeholder_context')} value={localContext} onChange={(e) => setLocalContext(e.target.value)} disabled={loading || isLocked}></textarea>
      </div>
    </div>
  );

  const actions = (
      <button onClick={handleGenerate} disabled={loading || !localContext || !params.productName || isLocked} className="w-full bg-red-600 hover:bg-red-500 hover:shadow-red-500/20 active:scale-95 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg uppercase tracking-widest">
        {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
        {loading ? 'Escrevendo...' : t('vsl_btn')}
      </button>
  );

  const mainContent = (
      <>
        {result.content ? (
            <>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6 lg:p-10"><div className="whitespace-pre-wrap font-sans text-base lg:text-lg text-slate-300 leading-relaxed">{result.content}</div>{loading && <span className="inline-block w-2 h-4 bg-red-500 animate-pulse ml-1 align-middle"></span>}{result.note && (<div className="mt-8 p-4 bg-slate-800/50 border-l-4 border-yellow-400 rounded-r-lg animate-in fade-in"><h4 className="text-sm font-bold text-yellow-400 flex items-center gap-2"><Wand2 className="w-4 h-4" /> NOTA DO ESTRATEGISTA:</h4><p className="text-slate-300 italic mt-2 text-sm whitespace-pre-wrap">{result.note}</p></div>)}</div>
              <RefinementToolbar text={result.content} onTextUpdate={(newText) => setResult(prev => ({...prev, content: newText}))} language={language} titleForPDF={`VSL - ${params.productName}`} />
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 min-h-[200px] p-6">{loading ? <Wand2 className="w-16 h-16 mb-4 animate-pulse text-red-500" /> : <Video className="w-16 h-16 mb-4 opacity-20" />}<p className="text-center text-slate-400">{loading ? 'Escrevendo...' : t('msg_wait_desc')}</p></div>
        )}
      </>
  );
  
  return (
    <ToolLayout
      title={t('vsl_title')}
      icon={Video}
      iconColorClass="text-red-500"
      description={vslHelpDescription}
      loading={loading}
      error={error}
      isLocked={isLocked}
      onToggleLock={() => setIsLocked(!isLocked)}
      sidebarContent={sidebarContent}
      actions={actions}
      mainContent={mainContent}
      hasResults={!!result.content}
      sessionId="vsl"
    />
  );
};

export default VSLStudio;