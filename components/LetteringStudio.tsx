import React, { useState, useEffect } from 'react';
import { getLocalizedLists, IMAGE_AIS } from '../constants';
import { generateLetteringService } from '../services/geminiService';
import { downloadPDF } from '../services/pdfService';
import { PenTool, Wand2, Link2, CheckCircle2, Type as TypeIcon, Download, Layers, BoxSelect, AtSign, Copy, RefreshCw, Home, Brain, Palette } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import SpeechInput from './SpeechInput';
import TextToSpeech from './TextToSpeech';
import { useSharedContext } from '../contexts/SharedContext';
import { ToolLayout } from './ToolLayout';
import { EngineLink } from './ToolLayout';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { SectionHelp } from './SectionHelp';
import { splitVisualResult, stripVisualPrompt, splitOptions } from '../utils/stripCopyFormat';

interface LetteringStudioProps { language: string; }
interface LetteringResult { content: string; note: string; }

const LetteringStudio: React.FC<LetteringStudioProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  const [results, setResults] = useState<LetteringResult[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const { t, langCode } = useTranslation(language);
  
  const [localContext, setLocalContext] = useState('');

  const { letStyles, letTechniques, letSurfaces, letCompositions, socialPlatforms, videoRatios } = getLocalizedLists(langCode);

  const [params, setParams] = useState({
    text: '', style: letStyles[0], technique: letTechniques[0], surface: letSurfaces[0],
    composition: letCompositions[0], platform: socialPlatforms[0], aiModel: IMAGE_AIS[1],
    aspectRatio: '1:1', footer: ''
  });

  const letteringHelpDescription = `
O que é o Estúdio de Lettering & Tipografia:
Esta é a ferramenta para quem precisa de artes onde o texto é o protagonista. Diferente de geradores genéricos, este módulo aplica regras de "Contraste e Materialidade" para que a arte seja legível e visualmente deslumbrante.
`;

  const handleImportGlobal = () => {
    setLocalContext(sharedContext);
  };

  const handleGenerate = async () => {
    if (!params.text && !localContext) { alert("Por favor, digite o texto OU forneça um contexto para a IA criar a frase."); return; }
    setResults([]);
    generateStream(
        (onChunk) => generateLetteringService({ ...params, context: localContext, footerText: params.footer, language: language }, onChunk),
        (streamedText) => {
            const separator = "|||LETTERING_DIVIDER|||";
            const { content, note: streamNote } = splitVisualResult(streamedText);
            const optList = splitOptions(content, separator, 2);
            const parsedResults = optList.map(option => ({ content: option, note: streamNote }));
            if (parsedResults.length > 0) { setResults(parsedResults); setActiveTab(0); } else { setResults([{ content: stripVisualPrompt(streamedText), note: '' }]); }
        }
    );
  };

  const sidebarContent = (
    <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Modelo IA</label><select aria-label="Modelo IA" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.aiModel} onChange={(e) => setParams({...params, aiModel: e.target.value})} disabled={isLocked}>{IMAGE_AIS.map(i => (<option key={i} value={i}>{i}</option>))}</select><EngineLink engine={params.aiModel} /></div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Proporção</label><select aria-label="Proporção" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.aspectRatio} onChange={(e) => setParams({...params, aspectRatio: e.target.value})} disabled={isLocked}>{videoRatios.map(r => (<option key={r} value={r}>{r}</option>))}</select></div>
        </div>

        <div><label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-1"><TypeIcon className="w-3 h-3 text-lime-400" /> {t('let_text')}</label><textarea aria-label="Frase principal da arte..." className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-lime-500 outline-none font-bold resize-none h-20 placeholder-slate-500" placeholder="Frase principal da arte..." value={params.text} onChange={(e) => setParams({...params, text: e.target.value})} disabled={isLocked} /></div>
        
        <div><label className="text-sm font-medium text-slate-300 block mb-1">Estética (Visual)</label><select aria-label="Estética (Visual)" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-lime-500 outline-none text-sm" value={params.style} onChange={(e) => setParams({...params, style: e.target.value})} disabled={isLocked}>{letStyles.map(s => (<option key={s} value={s}>{s}</option>))}</select></div>

        <div className="grid grid-cols-2 gap-4">
            <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Técnica</label><select aria-label="Técnica" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.technique} onChange={(e) => setParams({...params, technique: e.target.value})} disabled={isLocked}>{letTechniques.map(t => (<option key={t} value={t}>{t}</option>))}</select></div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Superfície</label><select aria-label="Superfície" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.surface} onChange={(e) => setParams({...params, surface: e.target.value})} disabled={isLocked}>{letSurfaces.map(s => (<option key={s} value={s}>{s}</option>))}</select></div>
        </div>

        <div><label className="text-sm font-medium text-slate-300 block mb-1">Composição</label><select aria-label="Composição" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-lime-500 outline-none text-sm" value={params.composition} onChange={(e) => setParams({...params, composition: e.target.value})} disabled={isLocked}>{letCompositions.map(c => (<option key={c} value={c}>{c}</option>))}</select></div>

        <div><label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-1"><Layers className="w-3 h-3 text-lime-400" /> Rodapé (Texto Pequeno)</label><input aria-label="Ex: @minhamarca" type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-lime-500 outline-none text-xs" placeholder="Ex: @minhamarca" value={params.footer} onChange={(e) => setParams({...params, footer: e.target.value})} disabled={isLocked} /></div>

        <div className="relative">
            <div className="absolute right-2 top-8 z-10 flex gap-2">
                {sharedContext && (
                    <button onClick={handleImportGlobal} className="p-2 rounded-full bg-lime-500/10 text-lime-400 border border-lime-500/30 hover:bg-lime-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                        <Brain className="w-4 h-4" />
                    </button>
                )}
                {!isLocked && <SpeechInput onTranscript={(t) => setLocalContext(prev => prev + ' ' + t)} language={language} />}
            </div>
            <div className="flex justify-between items-center mt-1 mb-1"><label className="text-sm font-medium text-slate-300 block">Contexto Narrativo</label></div>
            <textarea aria-label="Sobre o que é a arte?" className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-lime-500 outline-none text-sm pr-10 text-slate-200" placeholder="Sobre o que é a arte?" value={localContext} onChange={(e) => setLocalContext(e.target.value)} disabled={isLocked}></textarea>
        </div>
    </div>
  );

  return (
    <ToolLayout title={t('let_title')} icon={PenTool} iconColorClass="text-lime-400" description={letteringHelpDescription} loading={loading} error={error} isLocked={isLocked} onToggleLock={() => setIsLocked(!isLocked)} outputKind="image" sidebarContent={sidebarContent} actions={(<button onClick={handleGenerate} disabled={loading || isLocked || (!params.text && !localContext)} className="w-full bg-lime-600 hover:bg-lime-500 text-slate-900 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg">{loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Palette className="w-5 h-5" />} {loading ? 'Projetando...' : t('let_btn')}</button>)} 
      mainContent={(
      <>
        {results.length > 0 ? (
            <>
              <div role="tablist" className="flex border-b border-slate-800 bg-slate-900/50 overflow-x-auto no-scrollbar rounded-t-xl sticky top-0 z-10 px-2 pt-2 gap-2">{results.map((_, index) => (<button key={index} role="tab" aria-selected={activeTab === index} onClick={() => setActiveTab(index)} className={`px-5 py-3 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${activeTab === index ? 'bg-lime-600 text-slate-900 shadow-lg translate-y-[1px]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>Opção {index + 1}</button>))}</div>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6"><pre className="whitespace-pre-wrap font-sans text-base text-slate-300">{results[activeTab].content}</pre>{results[activeTab].note && (<div className="mt-8 p-4 bg-slate-900 border-l-4 border-yellow-400 rounded-r-lg shadow-lg"><h4 className="text-[10px] font-black text-yellow-500 flex items-center gap-2 mb-2 uppercase tracking-widest"><Wand2 className="w-4 h-4" /> Nota do Estrategista</h4><p className="text-slate-300 italic text-sm whitespace-pre-wrap font-medium">{results[activeTab].note}</p></div>)}</div>
              <div className="p-4 border-t border-slate-800 flex gap-2"><button onClick={() => downloadPDF(`Lettering_${activeTab}`, results[activeTab].content)} className="flex-1 bg-slate-800 py-3 rounded-lg text-sm font-bold text-slate-200">PDF</button><button onClick={() => navigator.clipboard.writeText(results[activeTab].content)} className="flex-1 bg-lime-600 py-3 rounded-lg text-sm font-bold text-white">Copiar</button></div>
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 p-6">{loading ? <RefreshCw className="w-16 h-16 mb-4 animate-spin text-lime-500" /> : <TypeIcon className="w-16 h-16 mb-4 opacity-20" />}<p className="text-center text-slate-400">{loading ? 'Projetando Tipografia...' : t('msg_wait_desc')}</p></div>
        )}
      </>
  )} hasResults={results.length > 0} sessionId="lettering" />
  );
};

export default LetteringStudio;