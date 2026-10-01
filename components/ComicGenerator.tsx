import React, { useState } from 'react';
import { getLocalizedLists, IMAGE_AIS } from '../constants';
import { generateComicService, generateComicNoteService } from '../services/geminiService';
import { ReferenceMode } from '../types';
import { downloadPDF } from '../services/pdfService';
import { BookOpen, Wand2, Link2, MessageSquare, Upload, Trash2, AtSign, Palette, RefreshCw, Home, Brain, Layers, X } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { RefinementToolbar } from './RefinementToolbar';
import { ToolLayout } from './ToolLayout';
import { EngineLink } from './ToolLayout';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { SectionHelp } from './SectionHelp';
import { splitVisualResult, stripCopyMarkdown } from '../utils/stripCopyFormat';

interface ComicGeneratorProps { language: string; }

const ComicGenerator: React.FC<ComicGeneratorProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  const [result, setResult] = useState({ content: '', note: '' });
  const [isLocked, setIsLocked] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteLoading, setNoteLoading] = useState(false);
  const { t, langCode } = useTranslation(language);
  
  const { comicStyles, comicLayouts, socialPlatforms, videoRatios } = getLocalizedLists(langCode);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [refMode, setRefMode] = useState<ReferenceMode>('creative');

  const [localStory, setLocalStory] = useState('');

  const [params, setParams] = useState({
    style: comicStyles[0], layout: comicLayouts[0], aiModel: IMAGE_AIS[0],
    platform: socialPlatforms[0], aspectRatio: videoRatios[0], footer: ''
  });

  const comicHelpDescription = `
O que é o Criador de Quadrinhos & Storyboards:
Este módulo transforma roteiros de texto em estruturas visuais cinematográficas, detalhando ângulos de câmera e estilos de traço para que a IA desenhe exatamente o que você imaginou.
`;

  const handleImportGlobal = () => {
    setLocalStory(sharedContext);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => { if (reader.result) { setRefImages(prev => [...prev, reader.result as string]); } };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => { setRefImages(prev => prev.filter((_, i) => i !== index)); };

  // Nota sob demanda: se o modelo omitiu a nota, gera a explicação de
  // transparência numa 2ª chamada (o usuário sempre tem como verificar).
  const handleEnsureNote = async () => {
    if (result.note) { setShowNoteModal(true); return; }
    if (!result.content || noteLoading) return;
    setNoteLoading(true);
    try {
      const r = await generateComicNoteService({ ...params, language }, result.content);
      if (!r.error && r.text) {
        setResult(prev => ({ ...prev, note: r.text.trim() }));
        setShowNoteModal(true);
      }
    } finally {
      setNoteLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!localStory) { alert("Por favor, insira o contexto do quadrinho."); return; }
    setResult({ content: '', note: '' });
    generateStream(
        (onChunk) => generateComicService({ ...params, context: localStory, referenceImages: refImages, referenceMode: refImages.length > 0 ? refMode : 'none', language: language }, onChunk),
        (streamedText) => {
            const { content, note } = splitVisualResult(streamedText);
            setResult({ content, note });
        }
    );
  };

  const sidebarContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
          <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Modelo IA</label><select aria-label="Modelo IA" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.aiModel} onChange={(e) => setParams({...params, aiModel: e.target.value})} disabled={isLocked}>{IMAGE_AIS.map(i => (<option key={i} value={i}>{i}</option>))}</select><EngineLink engine={params.aiModel} /></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Proporção</label><select aria-label="Proporção" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.aspectRatio} onChange={(e) => setParams({...params, aspectRatio: e.target.value})} disabled={isLocked}>{videoRatios.map(r => (<option key={r} value={r}>{r}</option>))}</select></div>
      </div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('label_platform')}</label><select aria-label={t('label_platform')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-yellow-500 outline-none text-sm" value={params.platform} onChange={(e) => setParams({...params, platform: e.target.value})} disabled={isLocked}>{socialPlatforms.map(p => (<option key={p} value={p}>{p}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('com_style')}</label><select aria-label={t('com_style')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-yellow-500 outline-none text-sm" value={params.style} onChange={(e) => setParams({...params, style: e.target.value})} disabled={isLocked}>{comicStyles.map(style => (<option key={style} value={style}>{style}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('com_layout')}</label><select aria-label={t('com_layout')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-yellow-500 outline-none text-sm" value={params.layout} onChange={(e) => setParams({...params, layout: e.target.value})} disabled={isLocked}>{comicLayouts.map(l => (<option key={l} value={l}>{l}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-1"><Layers className="w-3 h-3 text-yellow-400" /> Rodapé / Edição</label><input aria-label="Rodapé / Edição" type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-yellow-500 outline-none text-xs" placeholder="Ex: Vol. 1 - Jan 2025" value={params.footer} onChange={(e) => setParams({...params, footer: e.target.value})} disabled={isLocked} /></div>
      <div role="group" className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3"><label className="text-sm font-bold text-slate-300 flex items-center gap-2"><Upload className="w-4 h-4" /> {t('com_char_ref')}</label><div className="flex flex-wrap gap-2">{refImages.map((img, idx) => (<div key={idx} className="relative w-16 h-16 rounded overflow-hidden border border-slate-600 group"><img src={img} alt="ref" className="w-full h-full object-cover" /><button onClick={() => removeImage(idx)} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"><Trash2 className="w-4 h-4" /></button></div>))}<label className="w-16 h-16 border border-dashed border-slate-500 rounded flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors"><input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} disabled={isLocked} /><Upload className="w-5 h-5 text-slate-500" /></label></div></div>
      <div className="relative">
        <div className="absolute right-2 top-8 z-10 flex gap-2">
            {sharedContext && (
                <button onClick={handleImportGlobal} className="p-2 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                    <Brain className="w-4 h-4" />
                </button>
            )}
            {!isLocked && <SpeechInput onTranscript={(t) => setLocalStory(prev => prev + ' ' + t)} language={language} />}
        </div>
        <div className="flex justify-between items-center mt-1 mb-1"><label className="text-sm font-medium text-slate-300 block">{t('com_topic')}</label><div className="flex items-center gap-1 text-xs text-yellow-400"><Link2 className="w-3 h-3" /> Sessão Isolada</div></div>
        <textarea aria-label={t('placeholder_context')} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-yellow-500 outline-none text-sm pr-10 text-slate-200" placeholder={t('placeholder_context')} value={localStory} onChange={(e) => setLocalStory(e.target.value)} disabled={isLocked}></textarea>
      </div>
    </div>
  );

  return (
    <ToolLayout title={t('com_title')} icon={BookOpen} iconColorClass="text-yellow-400" description={comicHelpDescription} loading={loading} error={error} isLocked={isLocked} onToggleLock={() => setIsLocked(!isLocked)} outputKind="image" sidebarContent={sidebarContent} actions={(<button onClick={handleGenerate} disabled={loading || !localStory || isLocked} className="w-full bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg">{loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Palette className="w-5 h-5" />} {loading ? 'Desenhando...' : t('com_btn')}</button>)} 
      mainContent={(
      <>
        {showNoteModal && result.note && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in" onClick={() => setShowNoteModal(false)}>
                <div className="bg-slate-900 border border-yellow-500/30 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2"><Wand2 className="w-5 h-5 text-yellow-500" /> Nota do Estrategista</h3>
                        <button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-all"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-medium">{stripCopyMarkdown(result.note)}</div>
                    <div className="p-4 border-t border-slate-800 flex justify-end">
                        <button onClick={() => setShowNoteModal(false)} className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">Fechar</button>
                    </div>
                </div>
            </div>
        )}
        {result.content ? (
            <>
              <div className="bg-slate-900/50 p-4 border-b border-slate-800 rounded-t-xl flex items-center gap-2 text-yellow-400 font-semibold"><MessageSquare className="w-5 h-5" /> Roteiro & Prompt Visual
                <button onClick={handleEnsureNote} disabled={noteLoading} className="ml-auto text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500 hover:text-slate-950 transition-all disabled:opacity-50 flex items-center gap-1">
                  {noteLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} {result.note ? 'Ver Nota do Estrategista' : 'Gerar nota'}
                </button>
              </div>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6"><pre className="whitespace-pre-wrap font-sans text-base text-slate-300">{result.content}</pre>{result.note && (<div className="mt-8 p-4 bg-slate-900 border-l-4 border-yellow-500 rounded-r-lg shadow-xl animate-in fade-in"><h4 className="text-[10px] font-black text-yellow-500 flex items-center gap-2 mb-2 uppercase tracking-widest"><Wand2 className="w-4 h-4" /> Nota do Estrategista</h4><p className="text-slate-300 italic text-sm whitespace-pre-wrap font-medium">{stripCopyMarkdown(result.note)}</p></div>)}</div>
              <RefinementToolbar text={result.content} onTextUpdate={(newText) => setResult(prev => ({ ...prev, content: newText }))} language={language} titleForPDF={`Roteiro HQ - ${params.style}`} />
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 p-6">{loading ? <RefreshCw className="w-16 h-16 mb-4 animate-spin text-yellow-500" /> : <BookOpen className="w-16 h-16 mb-4 opacity-20" />}<p className="text-center text-slate-400">{loading ? 'Roteirizando HQ...' : t('msg_wait_desc')}</p></div>
        )}
      </>
  )} hasResults={!!result.content} />
  );
};

export default ComicGenerator;