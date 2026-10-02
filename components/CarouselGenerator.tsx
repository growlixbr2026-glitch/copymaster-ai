import React, { useState, useEffect } from 'react';
import { getLocalizedLists, IMAGE_AIS } from '../constants';
import { generateCarouselService } from '../services/geminiService';
import { ReferenceMode, CarouselParams } from '../types';
import { downloadPDF } from '../services/pdfService';
import { GalleryHorizontal, Wand2, Link2, Layers, CheckCircle2, Upload, Trash2, AtSign, Download, Type as TypeIcon, RefreshCw, AlertCircle, Home, Brain } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import SpeechInput from './SpeechInput';
import TextToSpeech from './TextToSpeech';
import { useSharedContext } from '../contexts/SharedContext';
import { ToolLayout } from './ToolLayout';
import { EngineLink } from './ToolLayout';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { SectionHelp } from './SectionHelp';

interface CarouselGeneratorProps {
  language: string;
}

const CarouselGenerator: React.FC<CarouselGeneratorProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  
  const [slides, setSlides] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  
  const { t, langCode } = useTranslation(language);
  const { imageStyles, socialPlatforms, videoRatios } = getLocalizedLists(langCode);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [refMode, setRefMode] = useState<ReferenceMode>('creative');

  // ESTADO LOCAL ISOLADO
  const [localTopic, setLocalTopic] = useState('');

  const [params, setParams] = useState<CarouselParams>({
    slideCount: 5,
    style: imageStyles[0],
    platform: socialPlatforms[0],
    aiModel: IMAGE_AIS[0],
    aspectRatio: videoRatios[3],
    footer: '',
    customText: '',
    context: '',
    writerStyle: 'Prompt Engineer'
  });

  const carouselHelpDescription = `
O que é o Carrossel Infinito:
Esta é a ferramenta de maior retenção orgânica do Instagram e LinkedIn. Carrosséis não são apenas slides; são narrativas visuais que utilizam a "curiosidade progressiva" para manter o usuário deslizando até a última lâmina.
`;

  const handleImportGlobal = () => {
    setLocalTopic(sharedContext);
  };

  const handleGenerate = () => {
    if (!localTopic) return;
    setSlides([]); setNote(''); setActiveSlide(0);

    generateStream(
      (onChunk) => generateCarouselService({ 
          ...params, context: localTopic, referenceImages: refImages, 
          referenceMode: refImages.length > 0 ? refMode : 'none', language 
      }, onChunk),
      (streamedText) => {
        const noteSeparator = "|||NOTA_DIVIDER|||";
        const parts = streamedText.split(noteSeparator);
        const mainContent = parts[0].trim();
        setNote(parts[1] ? parts[1].replace(/NOTA DO ESTRATEGISTA:[\s]*/i, '').trim() : '');

        const separator = "|||SLIDE_DIVIDER|||";
        const parsedSlides = mainContent.split(separator).map(s => s.trim()).filter(s => s.length > 0);
        if (parsedSlides.length > 0) setSlides(parsedSlides);
      }
    );
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
  const handleDownloadPDF = () => { if (slides.length > 0) downloadPDF(`Carrossel - Lâmina ${activeSlide + 1}`, slides[activeSlide]); };
  const handleVoiceInput = (text: string) => { setLocalTopic(prev => prev ? prev + ' ' + text : text); };
  
  const slideOptions = Array.from({ length: 8 }, (_, i) => i + 3);
  const getSlideLabel = (num: number) => num === 1 ? 'Lâmina' : 'Lâminas';

  const sidebarContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
          <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Modelo IA</label><select aria-label="Modelo IA" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.aiModel} onChange={(e) => setParams({...params, aiModel: e.target.value})} disabled={isLocked}>{IMAGE_AIS.map(i => (<option key={i} value={i}>{i}</option>))}</select><EngineLink engine={params.aiModel} /></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Proporção</label><select aria-label="Proporção" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.aspectRatio} onChange={(e) => setParams({...params, aspectRatio: e.target.value})} disabled={isLocked}>{videoRatios.map(r => (<option key={r} value={r}>{r}</option>))}</select></div>
      </div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('label_platform')}</label><select aria-label={t('label_platform')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-teal-500 outline-none text-sm" value={params.platform} onChange={(e) => setParams({...params, platform: e.target.value})} disabled={isLocked}>{socialPlatforms.map(p => ( <option key={p} value={p}>{p}</option> ))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('car_slides')}</label><select aria-label={t('car_slides')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-teal-500 outline-none text-sm" value={params.slideCount} onChange={(e) => setParams({...params, slideCount: parseInt(e.target.value)})} disabled={isLocked}>{slideOptions.map(num => (<option key={num} value={num}>{num} {getSlideLabel(num)}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('label_style')}</label><select aria-label={t('label_style')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-teal-500 outline-none text-sm" value={params.style} onChange={(e) => setParams({...params, style: e.target.value})} disabled={isLocked}>{imageStyles.map(style => (<option key={style} value={style}>{style}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-1"><TypeIcon className="w-3 h-3 text-teal-400" /> {t('car_custom_hook')}</label><input aria-label={t('car_custom_hook')} type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-teal-500 outline-none text-sm" placeholder="Ex: 5 Dicas para..." value={params.customText} onChange={(e) => setParams({...params, customText: e.target.value})} disabled={isLocked}/></div>
      <div><label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-1"><Layers className="w-3 h-3 text-teal-400" /> Rodapé / @Usuario</label><input aria-label="Ex: @seunome" type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-teal-500 outline-none text-xs" placeholder="Ex: @seunome" value={params.footer} onChange={(e) => setParams({...params, footer: e.target.value})} disabled={isLocked} /></div>
      <div role="group" aria-label="Referências visuais" className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3"><label className="text-sm font-bold text-slate-300 flex items-center gap-2"><Upload className="w-4 h-4" /> Referências Visuais</label><div className="flex flex-wrap gap-2">{refImages.map((img, idx) => (<div key={idx} className="relative w-16 h-16 rounded overflow-hidden border border-slate-600 group"><img src={img} alt="ref" className="w-full h-full object-cover" /><button onClick={() => removeImage(idx)} disabled={isLocked} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white disabled:opacity-0"><Trash2 className="w-4 h-4" /></button></div>))}<label className={`w-16 h-16 border border-dashed border-slate-500 rounded flex items-center justify-center transition-colors ${isLocked ? 'opacity-40 pointer-events-none' : 'cursor-pointer hover:bg-slate-800'}`}><input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} disabled={isLocked} /><Upload className="w-5 h-5 text-slate-500" /></label></div></div>
      <div className="relative">
          <div className="absolute right-2 top-8 z-10 flex gap-2">
            {sharedContext && (
                <button onClick={handleImportGlobal} className="p-2 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 hover:bg-teal-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                    <Brain className="w-4 h-4" />
                </button>
            )}
            {!isLocked && <SpeechInput onTranscript={handleVoiceInput} language={language} />}
          </div>
          <div className="flex justify-between items-center mt-1 mb-1"><label className="text-sm font-medium text-slate-300 block">{t('car_topic')}</label><div className="flex items-center gap-1 text-xs text-teal-400"><Link2 className="w-3 h-3" /> Sessão Isolada</div></div>
          <textarea aria-label={t('placeholder_context')} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-teal-500 outline-none text-sm pr-10 text-slate-200" placeholder={t('placeholder_context')} value={localTopic} onChange={(e) => setLocalTopic(e.target.value)} disabled={isLocked}></textarea>
      </div>
    </div>
  );
  
  const actions = (
      <button onClick={handleGenerate} disabled={loading || !localTopic || isLocked} className="w-full bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg">
        {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Layers className="w-5 h-5" />} {loading ? 'Planejando Lâminas...' : t('car_btn')}
      </button>
  );

  const mainContent = (
      <>
        {slides.length > 0 ? (
            <>
              <div role="tablist" className="flex border-b border-slate-800 bg-slate-900/50 overflow-x-auto no-scrollbar sticky top-0 z-10 px-2 pt-2 gap-2">{slides.map((_, index) => (<button key={index} role="tab" aria-selected={activeSlide === index} onClick={() => setActiveSlide(index)} className={`px-5 py-3 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${activeSlide === index ? 'bg-teal-600 text-white shadow-lg translate-y-[1px]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}> {getSlideLabel(1)} {index + 1} </button>))}</div>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6">
                  <div className="whitespace-pre-wrap font-sans text-base text-slate-300">{slides[activeSlide]}</div>
                  {loading && activeSlide === slides.length - 1 && <span className="inline-block w-2 h-4 bg-teal-500 animate-pulse ml-1"></span>}
                  {note && (<div className="mt-8 p-4 bg-slate-800/50 border-l-4 border-yellow-400 rounded-r-lg animate-in fade-in"><h4 className="text-sm font-bold text-yellow-400 flex items-center gap-2"><Wand2 className="w-4 h-4" /> NOTA DO ESTRATEGISTA:</h4><p className="text-slate-300 italic mt-2 text-sm whitespace-pre-wrap">{note}</p></div>)}
              </div>
              <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-xl flex gap-2"><TextToSpeech text={slides[activeSlide]} language={language} className="flex-1" /><button onClick={handleDownloadPDF} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"><Download className="w-4 h-4" /> PDF</button><button onClick={() => navigator.clipboard.writeText(slides[activeSlide])} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"> <CheckCircle2 className="w-4 h-4" /> Copiar </button></div>
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 min-h-[200px] p-6">{loading ? <RefreshCw className="w-16 h-16 mb-4 animate-spin text-teal-500" /> : <GalleryHorizontal className="w-16 h-16 mb-4 opacity-20" />}<p className="text-center text-slate-400">{loading ? 'Arquitetando narrativa...' : t('msg_wait_desc')}</p></div>
        )}
      </>
  );

  return (
    <ToolLayout title={t('car_title')} icon={GalleryHorizontal} iconColorClass="text-teal-400" description={carouselHelpDescription} loading={loading} error={error} isLocked={isLocked} onToggleLock={() => setIsLocked(!isLocked)} outputKind="image" sidebarContent={sidebarContent} actions={actions} mainContent={mainContent} hasResults={slides.length > 0} sessionId="carousel" />
  );
};

export default CarouselGenerator;