import React, { useState, useEffect } from 'react';
import { getLocalizedLists, IMAGE_AIS } from '../constants';
import { generateQuoteCardService } from '../services/geminiService';
import { ReferenceMode } from '../types';
import { downloadPDF } from '../services/pdfService';
import { Quote, Wand2, Link2, CheckCircle2, Upload, Trash2, AtSign, Download, Type as TypeIcon, ImageIcon, RefreshCw, Home, Brain, Layers } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import SpeechInput from './SpeechInput';
import TextToSpeech from './TextToSpeech';
import { useSharedContext } from '../contexts/SharedContext';
import { ToolLayout } from './ToolLayout';
import { EngineLink } from './ToolLayout';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { SectionHelp } from './SectionHelp';
import { splitVisualResult, stripVisualPrompt, splitOptions } from '../utils/stripCopyFormat';

interface QuoteGeneratorProps { language: string; }

const QuoteGenerator: React.FC<QuoteGeneratorProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  const [quotes, setQuotes] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [activeQuote, setActiveQuote] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const { t, langCode } = useTranslation(language);
  
  const [localTopic, setLocalTopic] = useState('');

  const { quoteStyles, socialPlatforms, videoRatios } = getLocalizedLists(langCode);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [refMode, setRefMode] = useState<ReferenceMode>('creative');

  const [params, setParams] = useState({
    count: 3, style: quoteStyles[0], aiModel: IMAGE_AIS[0],
    aspectRatio: videoRatios[0], platform: socialPlatforms[0], footer: '', customText: '' 
  });

  const quoteHelpDescription = `
O que é o Gerador de Frases (Quote Cards):
As frases de impacto são os ativos de maior compartilhamento orgânico. Esta ferramenta automatiza a criação de layouts tipográficos que capturam a atenção e reforçam sua autoridade moral.
`;

  useEffect(() => { setParams(p => ({ ...p, style: quoteStyles[0], aspectRatio: videoRatios[0], platform: socialPlatforms[0] })); }, [langCode, quoteStyles, socialPlatforms, videoRatios]);

  const handleImportGlobal = () => {
    setLocalTopic(sharedContext);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => { if (reader.result) setRefImages(prev => [...prev, reader.result as string]); };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => { setRefImages(prev => prev.filter((_, i) => i !== index)); };

  const handleGenerate = async () => {
    if (!localTopic && !params.customText) { alert("Por favor, insira o tópico da frase ou uma frase personalizada."); return; }
    setQuotes([]); setNote('');
    generateStream(
        (onChunk) => generateQuoteCardService({ ...params, context: localTopic, referenceImages: refImages, referenceMode: refImages.length > 0 ? refMode : 'none', language: language }, onChunk),
        (streamedText) => {
            const { content: mainContent, note: streamNote } = splitVisualResult(streamedText);
            setNote(streamNote);
            const separator = "|||QUOTE_DIVIDER|||";
            const parsedQuotes = splitOptions(mainContent, separator, 3);
            if (parsedQuotes.length > 0) { setQuotes(parsedQuotes); setActiveQuote(0); } else { setQuotes([mainContent]); }
        }
    );
  };

  const sidebarContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
          <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Modelo IA</label><select aria-label="Modelo IA" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.aiModel} onChange={(e) => setParams({...params, aiModel: e.target.value})} disabled={isLocked}>{IMAGE_AIS.map(i => (<option key={i} value={i}>{i}</option>))}</select><EngineLink engine={params.aiModel} /></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Proporção</label><select aria-label="Proporção" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.aspectRatio} onChange={(e) => setParams({...params, aspectRatio: e.target.value})} disabled={isLocked}>{videoRatios.map(r => (<option key={r} value={r}>{r}</option>))}</select></div>
      </div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('label_platform')}</label><select aria-label={t('label_platform')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-cyan-500 outline-none text-sm" value={params.platform} onChange={(e) => setParams({...params, platform: e.target.value})} disabled={isLocked}>{socialPlatforms.map(p => (<option key={p} value={p}>{p}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('label_style')}</label><select aria-label={t('label_style')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-cyan-500 outline-none text-sm" value={params.style} onChange={(e) => setParams({...params, style: e.target.value})} disabled={isLocked}>{quoteStyles.map(style => (<option key={style} value={style}>{style}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-1"><TypeIcon className="w-3 h-3 text-cyan-400" /> {t('quo_phrase')}</label><input aria-label={t('quo_phrase')} type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-cyan-500 outline-none text-sm" placeholder="Ex: Deixe vazio para a IA criar..." value={params.customText} onChange={(e) => setParams({...params, customText: e.target.value})} disabled={isLocked} /></div>
      <div><label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-1"><Layers className="w-3 h-3 text-cyan-400" /> Rodapé (Assinatura)</label><input aria-label="Ex: @seuusuario ou nome do autor" type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-cyan-500 outline-none text-xs" placeholder="Ex: @seuusuario ou nome do autor" value={params.footer} onChange={(e) => setParams({...params, footer: e.target.value})} disabled={isLocked} /></div>
      <div role="group" aria-label="Referências visuais" className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3"><label className="text-sm font-bold text-slate-300 flex items-center gap-2"><Upload className="w-4 h-4" /> Referências Visuais</label><div className="flex flex-wrap gap-2">{refImages.map((img, idx) => (<div key={idx} className="relative w-16 h-16 rounded overflow-hidden border border-slate-600 group"><img src={img} alt="ref" className="w-full h-full object-cover" /><button onClick={() => removeImage(idx)} disabled={isLocked} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white disabled:opacity-0"><Trash2 className="w-4 h-4" /></button></div>))}<label className={`w-16 h-16 border border-dashed border-slate-500 rounded flex items-center justify-center transition-colors ${isLocked ? 'opacity-40 pointer-events-none' : 'cursor-pointer hover:bg-slate-800'}`}><input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} disabled={isLocked} /><Upload className="w-5 h-5 text-slate-500" /></label></div></div>
      <div className="relative">
          <div className="absolute right-2 top-8 z-10 flex gap-2">
            {sharedContext && (
                <button onClick={handleImportGlobal} className="p-2 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                    <Brain className="w-4 h-4" />
                </button>
            )}
            {!isLocked && <SpeechInput onTranscript={(t) => setLocalTopic(prev => prev + ' ' + t)} language={language} />}
          </div>
          <div className="flex justify-between items-center mt-1 mb-1"><label className="text-sm font-medium text-slate-300 block">{t('quo_topic')}</label><div className="flex items-center gap-1 text-xs text-cyan-400"><Link2 className="w-3 h-3" /> Sessão Isolada</div></div>
          <textarea aria-label={t('placeholder_context')} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-cyan-500 outline-none text-sm pr-10 text-slate-200" placeholder={t('placeholder_context')} value={localTopic} onChange={(e) => setLocalTopic(e.target.value)} disabled={isLocked}></textarea>
      </div>
    </div>
  );

  return (
    <ToolLayout title={t('quo_title')} icon={Quote} iconColorClass="text-cyan-400" description={quoteHelpDescription} loading={loading} error={error} isLocked={isLocked} onToggleLock={() => setIsLocked(!isLocked)} outputKind="image" sidebarContent={sidebarContent} actions={(<button onClick={handleGenerate} disabled={loading || isLocked || (!localTopic && !params.customText)} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg">{loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <ImageIcon className="w-5 h-5" />} {loading ? 'Gerando...' : t('quo_btn')}</button>)} 
      mainContent={(
      <>
        {quotes.length > 0 ? (
            <>
              <div role="tablist" className="flex border-b border-slate-800 bg-slate-900/50 overflow-x-auto no-scrollbar rounded-t-xl sticky top-0 z-10 px-2 pt-2 gap-2">{quotes.map((_, index) => (<button key={index} role="tab" aria-selected={activeQuote === index} onClick={() => setActiveQuote(index)} className={`px-5 py-3 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${activeQuote === index ? 'bg-cyan-600 text-white shadow-lg translate-y-[1px]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}>Opção {index + 1}</button>))}</div>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6"><pre className="whitespace-pre-wrap font-sans text-base text-slate-300">{quotes[activeQuote]}</pre>{note && (<div className="mt-8 p-4 bg-slate-900 border-l-4 border-yellow-500 rounded-r-lg shadow-lg"><h4 className="text-[10px] font-black text-yellow-500 flex items-center gap-2 mb-2 uppercase tracking-widest"><Wand2 className="w-4 h-4" /> Nota do Estrategista</h4><p className="text-slate-300 italic text-sm whitespace-pre-wrap font-medium">{note}</p></div>)}</div>
              <div className="p-4 border-t border-slate-800 flex gap-2"><TextToSpeech text={quotes[activeQuote]} language={language} className="flex-1" /><button onClick={() => downloadPDF(`Quote_${activeQuote}`, quotes[activeQuote])} className="flex-1 bg-slate-800 py-3 rounded-lg text-sm font-bold text-slate-200">PDF</button><button onClick={() => navigator.clipboard.writeText(quotes[activeQuote])} className="flex-1 bg-cyan-600 py-3 rounded-lg text-sm font-bold text-white">Copiar</button></div>
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 p-6">{loading ? <RefreshCw className="w-16 h-16 mb-4 animate-spin text-cyan-500" /> : <Quote className="w-16 h-16 mb-4 opacity-20" />}<p className="text-center text-slate-400">{loading ? 'Engenhando Impacto...' : t('msg_wait_desc')}</p></div>
        )}
      </>
  )} hasResults={quotes.length > 0} sessionId="quote" />
  );
};

export default QuoteGenerator;