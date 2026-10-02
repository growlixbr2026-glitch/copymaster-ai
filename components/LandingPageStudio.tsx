import React, { useState, useEffect } from 'react';
import { LayoutTemplate, Wand2, Link2, Monitor, MousePointerClick, Zap, Gift, Code2, Terminal, Palette, Layers, Cpu, AlertCircle, CheckCircle2, RefreshCw, Brain } from 'lucide-react';
import { getLocalizedLists, VIBE_CODING_PLATFORMS } from '../constants';
import { CREWAI_MARKETING_PERSONAS } from '../data/crewai-personas';
import { generateLandingPageService, generateLandingPageTechPromptService } from '../services/geminiService';
import { splitNotaBlock } from '../utils/stripCopyFormat';
import { runCrewWorkflow } from '../services/modules/copy/crewaiWorkflowService';
import { useTranslation } from '../hooks/useTranslation';
import { SectionHelp } from './SectionHelp';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { RefinementToolbar } from './RefinementToolbar';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { ToolLayout } from './ToolLayout';

interface LandingPageStudioProps {
  language: string;
}

const LandingPageStudio: React.FC<LandingPageStudioProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  const [result, setResult] = useState({ content: '', note: '' });
  const [isLocked, setIsLocked] = useState(false);
  const { t, langCode } = useTranslation(language);
  
  const { lpTypes, lpStyles, lpFrameworks, lpTechFrameworks } = getLocalizedLists(langCode);

  // ESTADO LOCAL ISOLADO
  const [localContext, setLocalContext] = useState('');
  const [mode, setMode] = useState<'content' | 'tech'>('content');

  const [params, setParams] = useState({
    type: lpTypes[0],
    style: lpStyles[0],
    framework: lpFrameworks[0],
    productName: '',
    promise: '',
    offer: '', 
    targetAudience: '',
    targetPlatform: VIBE_CODING_PLATFORMS[0]
  });

  const [techParams, setTechParams] = useState({
      visualStyle: '',
      sections: '',
      interactivity: ''
  });

  // CrewAI: persona especialista (prompts.chat) + pipeline sequencial
  const [crewPersona, setCrewPersona] = useState('');
  const [useCrewAI, setUseCrewAI] = useState(false);
  const lpPersonas = CREWAI_MARKETING_PERSONAS.filter(p => p.bestFor.includes('landing'));

  const lpHelpDescription = `
O que é o Estúdio de Landing Pages:
Este é o arquiteto mestre da sua presença online. Ele opera em dois níveis: Estratégico (Copy) e Técnico (Vibe Coding).
`;

  useEffect(() => {
      setParams(p => ({
          ...p,
          type: lpTypes[0],
          style: lpStyles[0],
          framework: mode === 'content' ? lpFrameworks[0] : lpTechFrameworks[0],
          targetPlatform: VIBE_CODING_PLATFORMS[0]
      }));
  }, [langCode, lpTypes, lpStyles, lpFrameworks, lpTechFrameworks, mode]);

  const handleImportGlobal = () => {
    setLocalContext(sharedContext);
  };

  const handleGenerate = async () => {
    if (!params.productName) {
        alert("Preencha pelo menos o Nome do Produto.");
        return;
    }
    
    setResult({ content: '', note: '' });
    
    if (mode === 'content') {
        const enrichedContext = `${localContext}\nSPECIFIC OFFER/LEAD MAGNET: ${params.offer}`;
        const crewContext = { ...params, context: enrichedContext, language, crewPersona: crewPersona || '' };
        generateStream(
            (onChunk) => useCrewAI
              // Pipeline CrewAI real: wireframe → copy (2 chamadas encadeadas)
              ? runCrewWorkflow('landing', crewContext, onChunk)
              : generateLandingPageService({ ...params, context: enrichedContext, language, crewPersona: crewPersona || undefined }, onChunk),
            (streamedText) => {
                const { content, note } = splitNotaBlock(streamedText);
                setResult({ content, note });
            }
        );
    } else {
        generateStream(
            (onChunk) => generateLandingPageTechPromptService({ ...params, ...techParams, context: localContext, language: language }, onChunk),
            (streamedText) => {
                setResult({ content: streamedText, note: '' });
            }
        );
    }
  };

  const handleVoiceInput = (text: string) => {
    setLocalContext(prev => prev ? prev + ' ' + text : text);
  };

  const sidebarContent = (
    <>
      <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-700 mb-4">
          <button onClick={() => setMode('content')} disabled={loading} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'content' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}> <LayoutTemplate className="w-3 h-3" /> Wireframe & Copy </button>
          <button onClick={() => setMode('tech')} disabled={loading} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'tech' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}> <Code2 className="w-3 h-3" /> Vibe Coding / Tech </button>
      </div>

      <div className="relative mb-4">
          <div className="absolute right-2 top-0 z-10 flex gap-2">
            {sharedContext && (
                <button onClick={handleImportGlobal} className="p-2 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/30 hover:bg-violet-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                    <Brain className="w-4 h-4" />
                </button>
            )}
            {!loading && !isLocked && <SpeechInput onTranscript={handleVoiceInput} language={language} />}
          </div>
          <div className="flex justify-between items-center mt-1 mb-1"><label className="text-sm font-medium text-slate-300 block">{t('label_context')}</label><div className="flex items-center gap-1 text-xs text-violet-400"><Link2 className="w-3 h-3" /> Sessão Isolada</div></div>
          <textarea aria-label={t('placeholder_context')} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-violet-500 outline-none text-sm pr-10 text-slate-200" placeholder={t('placeholder_context')} value={localContext} onChange={(e) => setLocalContext(e.target.value)} disabled={loading || isLocked}></textarea>
      </div>

      {mode === 'tech' ? (
          <div className="animate-in fade-in slide-in-from-top-2 space-y-4">
              <div>
                  <label className="text-sm font-medium text-slate-300 block mb-1">IA de Destino</label>
                  <select aria-label="IA de Destino" className="w-full bg-slate-900 border border-violet-500/50 rounded-lg p-3 text-white focus:ring-1 focus:ring-violet-500 outline-none text-sm font-mono" value={params.targetPlatform} onChange={(e) => setParams({...params, targetPlatform: e.target.value})} disabled={loading || isLocked}>
                      {VIBE_CODING_PLATFORMS.map(p => ( <option key={p} value={p}>{p}</option> ))}
                  </select>
              </div>
              <div className="grid grid-cols-1 gap-3 bg-slate-900/50 p-4 rounded-lg border border-violet-500/20">
                  <div><label className="text-xs text-slate-300 block mb-1 uppercase font-bold">{t('lp_product')}</label><input aria-label={t('lp_product')} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-violet-500 outline-none" value={params.productName} onChange={(e) => setParams({...params, productName: e.target.value})} placeholder="Ex: Curso Start Marketing" disabled={loading || isLocked} /></div>
                  <div><label className="text-xs text-slate-300 block mb-1 uppercase font-bold flex items-center gap-1"><Palette className="w-3 h-3 text-pink-400"/> Identidade Visual</label><input aria-label="Identidade Visual" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-violet-500 outline-none" value={techParams.visualStyle} onChange={(e) => setTechParams({...techParams, visualStyle: e.target.value})} placeholder="Ex: Dark Mode Moderno..." disabled={loading || isLocked} /></div>
                  <div><label className="text-xs text-slate-300 block mb-1 uppercase font-bold">Seções / Componentes</label><input aria-label="Seções do site" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-violet-500 outline-none" value={techParams.sections} onChange={(e) => setTechParams({...techParams, sections: e.target.value})} placeholder="Ex: Nav, Hero, Prova social, Preços, FAQ, Footer" disabled={loading || isLocked} /></div>
                  <div><label className="text-xs text-slate-300 block mb-1 uppercase font-bold">Interatividade</label><input aria-label="Interatividade" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-violet-500 outline-none" value={techParams.interactivity} onChange={(e) => setTechParams({...techParams, interactivity: e.target.value})} placeholder="Ex: form → webhook, FAQ accordion, GA4" disabled={loading || isLocked} /></div>
              </div>
          </div>
      ) : (
          <div className="animate-in fade-in space-y-4">
              <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('lp_type')}</label><select aria-label={t('lp_type')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-violet-500 outline-none text-sm" value={params.type} onChange={(e) => setParams({...params, type: e.target.value})} disabled={loading || isLocked}>{lpTypes.map(f => ( <option key={f} value={f}>{f}</option> ))}</select></div>
              <div className="grid grid-cols-1 gap-3 bg-slate-900 p-4 rounded-lg border border-slate-800">
                  <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">{t('lp_product')}</label><input aria-label={t('lp_product')} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-violet-500 outline-none" value={params.productName} onChange={(e) => setParams({...params, productName: e.target.value})} disabled={loading || isLocked} /></div>
                  <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400"/> {t('lp_promise')}</label><textarea aria-label="Ex: Dobre seus leads..." className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-violet-500 outline-none resize-none h-16" placeholder="Ex: Dobre seus leads..." value={params.promise} onChange={(e) => setParams({...params, promise: e.target.value})} disabled={loading || isLocked}></textarea></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">{t('lp_style')}</label><select aria-label={t('lp_style')} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-violet-500 outline-none" value={params.style} onChange={(e) => setParams({...params, style: e.target.value})} disabled={loading || isLocked}>{lpStyles.map(s => (<option key={s} value={s}>{s}</option>))}</select></div>
                    <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">Framework</label><select aria-label="Framework" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-violet-500 outline-none" value={params.framework} onChange={(e) => setParams({...params, framework: e.target.value})} disabled={loading || isLocked}>{lpFrameworks.map(f => (<option key={f} value={f}>{f}</option>))}</select></div>
                  </div>
                  <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">Oferta / Isca</label><input aria-label="Oferta" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-violet-500 outline-none" placeholder="Ex: ebook grátis + cupom" value={params.offer} onChange={(e) => setParams({...params, offer: e.target.value})} disabled={loading || isLocked} /></div>
                  <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">Público-Alvo</label><input aria-label="Público-Alvo" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-violet-500 outline-none" placeholder="Ex: donos de petshop" value={params.targetAudience} onChange={(e) => setParams({...params, targetAudience: e.target.value})} disabled={loading || isLocked} /></div>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-1">
                      <Brain className="w-3.5 h-3.5 text-purple-400" /> Persona CrewAI
                  </label>
                  <select aria-label="Persona CrewAI" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-purple-500 outline-none" value={crewPersona} onChange={(e) => setCrewPersona(e.target.value)} disabled={loading || isLocked}>
                      <option value="">✨ Sem persona (padrão)</option>
                      {lpPersonas.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
                  </select>
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                      <input type="checkbox" checked={useCrewAI} onChange={(e) => setUseCrewAI(e.target.checked)} disabled={loading || isLocked} className="accent-purple-500" />
                      Modo CrewAI (wireframe → copy em 2 etapas)
                  </label>
              </div>
          </div>
      )}
    </>
  );

  const actions = (
      <button onClick={handleGenerate} disabled={loading || isLocked || !params.productName} className="w-full bg-violet-600 hover:bg-violet-500 hover:shadow-violet-500/20 active:scale-95 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg uppercase tracking-widest disabled:opacity-40">
        {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : (mode === 'content' ? <Monitor className="w-5 h-5" /> : <Terminal className="w-5 h-5" />)}
        {loading ? 'Gerando...' : (mode === 'content' ? 'Arquitetar Página' : 'Gerar Prompt Tech')}
      </button>
  );

  const mainContent = (
      <>
        {result.content ? (
            <>
              <div className="bg-slate-900/50 p-4 border-b border-slate-800 rounded-t-xl flex items-center justify-between text-violet-400 font-semibold">
                  <div className="flex items-center gap-2"> {mode === 'content' ? <LayoutTemplate className="w-5 h-5" /> : <Terminal className="w-5 h-5" />} {mode === 'content' ? 'Wireframe & Copy' : 'Prompt Vibe Coding'} </div>
              </div>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6 lg:p-10">
                  <div className={`whitespace-pre-wrap font-sans text-base lg:text-lg text-slate-300 leading-relaxed ${mode === 'tech' ? 'font-mono text-sm bg-slate-900 p-4 rounded-lg border border-slate-800' : ''}`}>{result.content}</div>
                  {loading && <span className="inline-block w-2 h-4 bg-violet-500 animate-pulse ml-1 align-middle"></span>}
                  {mode === 'content' && result.note && (
                    <div className="mt-8 p-4 bg-slate-800/50 border-l-4 border-yellow-400 rounded-r-lg animate-in fade-in">
                        <h4 className="text-sm font-bold text-yellow-400 flex items-center gap-2"><Wand2 className="w-4 h-4" /> NOTA DO ESTRATEGISTA:</h4>
                        <p className="text-slate-300 italic mt-2 text-sm whitespace-pre-wrap">{result.note.replace(/NOTA DO ESTRATEGISTA:/i, '')}</p>
                    </div>
                  )}
              </div>
              {mode === 'content' ? (
                  <RefinementToolbar text={result.content} onTextUpdate={(newText) => setResult(prev => ({...prev, content: newText}))} language={language} titleForPDF={`LP - ${params.productName}`} />
              ) : (
                  <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-xl sticky bottom-0">
                    <button onClick={() => navigator.clipboard.writeText(result.content)} className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg uppercase tracking-widest"> <CheckCircle2 className="w-4 h-4" /> {t('btn_copy')} </button>
                  </div>
              )}
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 min-h-[200px] p-6">
               {loading ? <Wand2 className="w-16 h-16 mb-4 animate-pulse text-violet-500" /> : <LayoutTemplate className="w-16 h-16 mb-4 opacity-20" />}
               <p className="text-center text-slate-400">{loading ? 'Arquitetando...' : t('msg_wait_desc')}</p>
            </div>
        )}
      </>
  );

  return (
    <ToolLayout
      title={t('lp_title')}
      icon={LayoutTemplate}
      iconColorClass="text-violet-400"
      description={lpHelpDescription}
      loading={loading}
      error={error}
      isLocked={isLocked}
      onToggleLock={() => setIsLocked(!isLocked)}
      sidebarContent={sidebarContent}
      actions={actions}
      mainContent={mainContent}
      hasResults={!!result.content}
      sessionId="landing"
    />
  );
};

export default LandingPageStudio;