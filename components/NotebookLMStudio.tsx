import React, { useState, useEffect } from 'react';
import { generateNotebookLMService } from '../services/geminiService';
import { downloadPDF } from '../services/pdfService';
import { Notebook, Wand2, Link2, Copy, FileText, Mic, Info, FileQuestion, Layers, Download, Video, BrainCircuit, PieChart, MonitorPlay, RefreshCw, Home, BookCheck, ClipboardList, Lightbulb, Brain } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { getLocalizedLists } from '../constants';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { ToolLayout } from './ToolLayout';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { SectionHelp } from './SectionHelp';
import { stripLeakedDividers } from '../utils/stripCopyFormat';

interface NotebookLMStudioProps { language: string; }

const NotebookLMStudio: React.FC<NotebookLMStudioProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  const [result, setResult] = useState({ content: '', note: '' });
  const [isLocked, setIsLocked] = useState(false);
  const { t, langCode } = useTranslation(language);
  
  // ESTADO LOCAL ISOLADO
  const [localContext, setLocalContext] = useState('');

  const { notebookObjectives } = getLocalizedLists(langCode);
  const [mode, setMode] = useState<any>('source_creator');
  const [objective, setObjective] = useState(notebookObjectives[0]);

  // Objetivos localizados (índice = card): o idioma da UI chega ao modelo.
  useEffect(() => {
    setObjective(notebookObjectives[0]);
  }, [langCode]);

  const cardIcons = [Mic, Video, BrainCircuit, FileText, Layers, ClipboardList, PieChart, MonitorPlay];
  const cardModes = ['audio_instruction', 'source_creator', 'source_creator', 'source_creator', 'source_creator', 'source_creator', 'source_creator', 'source_creator'];
  const studioCards = notebookObjectives.map((obj: string, i: number) => ({
      id: `nb-${i}`,
      label: obj,
      icon: cardIcons[i] || FileText,
      mode: cardModes[i],
      obj,
  }));

  const notebookHelpDescription = `
O que é o Estúdio para NotebookLM:
O Google NotebookLM é uma das ferramentas mais poderosas para processar conhecimento. No entanto, ele depende da "Qualidade da Fonte". Este módulo cria o material perfeito (Source) para que as ferramentas de estúdio do NotebookLM gerem os melhores podcasts, mapas e testes do mundo.
`;

  const handleCardClick = (card: any) => { setMode(card.mode); setObjective(card.obj); };

  const handleImportGlobal = () => {
    setLocalContext(sharedContext);
  };

  const handleGenerate = async () => {
    if (!localContext) { alert("Por favor, insira a ideia principal."); return; }
    setResult({ content: '', note: '' });
    generateStream(
        (onChunk) => generateNotebookLMService({ mode, objective, context: localContext, language }, onChunk),
        (streamedText) => {
            const noteSeparator = "|||NOTA_DIVIDER|||";
            const parts = streamedText.split(noteSeparator);
            // Blindagem anti-vazamento: modelos às vezes retornam |||X_DIVIDER||| no corpo —
            // remove fragmentos sem tocar na formatação da fonte (divisor nunca é conteúdo).
            setResult({ content: stripLeakedDividers(parts[0]), note: parts[1] ? parts[1].replace(/NOTA DO ESTRATEGISTA:[\s]*/i, '').trim() : '' });
        }
    );
  };

  const sidebarContent = (
    <div className="space-y-6">
      <div className="relative">
          <div className="absolute right-2 top-8 z-10 flex gap-2">
            {sharedContext && (
                <button onClick={handleImportGlobal} className="p-2 rounded-full bg-lime-500/10 text-lime-400 border border-lime-500/30 hover:bg-lime-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                    <Brain className="w-4 h-4" />
                </button>
            )}
            <SpeechInput onTranscript={(t) => setLocalContext(prev => prev + ' ' + t)} language={language} />
          </div>
         <div className="flex justify-between items-center mt-1 mb-2"><label className="text-sm font-bold text-slate-300 block">{t('nb_idea')}</label><div className="flex items-center gap-1 text-xs text-lime-400"><Link2 className="w-3 h-3" /> Sessão Isolada</div></div>
        <textarea aria-label={t('placeholder_context')} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-lime-500 outline-none text-sm text-slate-200 pr-10" placeholder={t('placeholder_context')} value={localContext} onChange={(e) => setLocalContext(e.target.value)} disabled={loading || isLocked}></textarea>
      </div>
      <div>
          <label className="text-[10px] font-black text-slate-400 block mb-3 uppercase tracking-[0.2em]">OBJETIVO NO NOTEBOOKLM</label>
          <div className="grid grid-cols-2 gap-2">
            {studioCards.map((card) => { 
                const Icon = card.icon; 
                const isActive = objective === card.obj; 
                return (
                    <button key={card.id} onClick={() => handleCardClick(card)} disabled={loading || isLocked} className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group ${isActive ? 'bg-lime-900/40 border-lime-500 ring-1 ring-lime-500/50 shadow-lg' : 'bg-slate-950 border-slate-800 hover:border-lime-500/30'}`}>
                        <div className={`p-2 rounded-lg inline-flex mb-2 ${isActive ? 'bg-lime-500 text-slate-950' : 'bg-slate-900 text-slate-500 group-hover:text-lime-400'}`}> <Icon className="w-4 h-4" /> </div>
                        <div className={`font-bold text-[11px] leading-tight ${isActive ? 'text-white' : 'text-slate-400'}`}>{card.label}</div>
                    </button>
                ); 
            })}
          </div>
      </div>
    </div>
  );

  return (
    <ToolLayout title={t('nb_title')} icon={Notebook} iconColorClass="text-lime-400" description={notebookHelpDescription} loading={loading} error={error} isLocked={isLocked} onToggleLock={() => setIsLocked(!isLocked)} sidebarContent={sidebarContent} outputKind="text" actions={(<button onClick={handleGenerate} disabled={loading || !localContext || isLocked} className="w-full bg-lime-600 hover:bg-lime-500 text-slate-950 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg uppercase text-xs tracking-widest">{loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <BookCheck className="w-5 h-5" />} {loading ? 'Arquitentando Conhecimento...' : 'Gerar Fonte Otimizada'}</button>)} 
      mainContent={(
      <>
        {result.content ? (
            <>
              <div className="bg-slate-900/50 p-4 border-b border-slate-800 rounded-t-xl flex items-center justify-between text-lime-400 font-semibold"><div className="flex items-center gap-2"><FileText className="w-5 h-5" /> Fonte Pronta para NotebookLM</div></div>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6 lg:p-10"><div className="whitespace-pre-wrap font-sans text-base lg:text-lg text-slate-300 leading-relaxed">{result.content}</div>{loading && <span className="inline-block w-2 h-4 bg-lime-500 animate-pulse ml-1 align-middle"></span>}{result.note && (<div className="mt-8 p-4 bg-slate-800/50 border-l-4 border-yellow-400 rounded-r-lg"><h4 className="text-sm font-bold text-yellow-400 flex items-center gap-2"><Wand2 className="w-4 h-4" /> NOTA DO ESTRATEGISTA:</h4><p className="text-slate-300 italic mt-2 text-sm whitespace-pre-wrap">{result.note}</p></div>)}</div>
              <div className="p-4 border-t border-slate-800 flex gap-2"><button onClick={() => downloadPDF(`NotebookLM_Source`, result.content)} className="flex-1 bg-slate-800 py-3 rounded-lg text-sm font-bold text-slate-200">PDF</button><button onClick={() => navigator.clipboard.writeText(result.content)} className="flex-1 bg-lime-600 py-3 rounded-lg text-sm font-bold text-slate-950">Copiar</button></div>
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-800 p-6">{loading ? <RefreshCw className="w-16 h-16 mb-4 animate-spin text-lime-500" /> : <Notebook className="w-16 h-16 mb-4 opacity-5" />}<p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">{loading ? 'Estruturando Sabedoria...' : 'Aguardando Fonte de Conhecimento'}</p></div>
        )}
      </>
  )} hasResults={!!result.content} sessionId="notebook" />
  );
};

export default NotebookLMStudio;