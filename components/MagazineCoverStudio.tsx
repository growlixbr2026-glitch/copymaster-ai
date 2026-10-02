import React, { useState, useEffect } from 'react';
import { BookOpen, Wand2, Link2, ImageIcon, Upload, Trash2, AlertCircle, Type, Smile, Sparkles, Copy, Download, RefreshCw, Home, Brain, Layers } from 'lucide-react';
import { getLocalizedLists, IMAGE_AIS } from '../constants';
import { generateMagazineCoverService } from '../services/geminiService';
import { ReferenceMode } from '../types';
import { downloadPDF } from '../services/pdfService';
import { useTranslation } from '../hooks/useTranslation';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { resizeImage } from '../utils/imageUtils';
import { ToolLayout } from './ToolLayout';
import { EngineLink } from './ToolLayout';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { SectionHelp } from './SectionHelp';
import { splitVisualResult } from '../utils/stripCopyFormat';

interface MagazineCoverStudioProps { language: string; }

const MagazineCoverStudio: React.FC<MagazineCoverStudioProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  const [result, setResult] = useState({ content: '', note: '' });
  const [isLocked, setIsLocked] = useState(false);
  const { t, langCode } = useTranslation(language);
  
  const { magPresets, magMoods } = getLocalizedLists(langCode);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [refMode, setRefMode] = useState<any>('high_fidelity'); 

  const [localContext, setLocalContext] = useState('');

  const [params, setParams] = useState({
    magazine: magPresets[0], mood: magMoods[0], headline: '',
    subheadline: '', footerText: '', aiModel: IMAGE_AIS[1],
  });

  const magHelpDescription = `
O que é o Estúdio de Autoridade Visual:
Esta ferramenta cria o maior artefato de autoridade que um profissional pode ter: uma Capa de Revista. Ela utiliza o "DNA Visual" das publicações mais famosas do mundo para criar prompts que simulam um ensaio fotográfico editorial de alto nível.
`;

  const handleImportGlobal = () => {
    setLocalContext(sharedContext);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const resizedImagePromises = files.map((file: File) => resizeImage(file, 1024));
      try {
        const resizedImages = await Promise.all(resizedImagePromises);
        setRefImages(prev => [...prev, ...resizedImages]);
      } catch (err) { console.error("Erro ao redimensionar:", err); }
    }
  };

  const removeImage = (index: number) => { setRefImages(prev => prev.filter((_, i) => i !== index)); };

  const handleGenerate = async () => {
    if (!localContext && refImages.length === 0) { alert("Por favor, descreva o contexto da foto ou faça upload de uma imagem."); return; }
    setResult({ content: '', note: '' });
    generateStream(
        (onChunk) => generateMagazineCoverService({ ...params, context: localContext, referenceImages: refImages, referenceMode: refImages.length > 0 ? refMode : 'none', language }, onChunk),
        (streamedText) => {
            const { content, note } = splitVisualResult(streamedText);
            setResult({ content, note });
        }
    );
  };

  const sidebarContent = (
      <div className="space-y-4">
        <div><label className="text-sm font-medium text-slate-300 block mb-1">Motor IA</label><select aria-label="Motor IA" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-fuchsia-500 outline-none text-sm" value={params.aiModel} onChange={(e) => setParams({...params, aiModel: e.target.value})} disabled={loading || isLocked}>{IMAGE_AIS.map(m => (<option key={m} value={m}>{m}</option>))}</select><EngineLink engine={params.aiModel} /></div>
        <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('mag_magazine')}</label><select aria-label={t('mag_magazine')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-fuchsia-500 outline-none text-sm" value={params.magazine} onChange={(e) => setParams({...params, magazine: e.target.value})} disabled={loading || isLocked}>{magPresets.map(m => (<option key={m} value={m}>{m}</option>))}</select></div>
        <div><label className="text-sm font-medium text-slate-300 block mb-1">Atitude (Mood)</label><select aria-label="Atitude (Mood)" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-fuchsia-500 outline-none text-sm" value={params.mood} onChange={(e) => setParams({...params, mood: e.target.value})} disabled={loading || isLocked}>{magMoods.map(m => (<option key={m} value={m}>{m}</option>))}</select></div>
        
        <div className="grid grid-cols-1 gap-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
            <div><label className="text-xs font-bold text-slate-400 uppercase mb-2 block flex items-center gap-1"><Type className="w-3 h-3"/> Manchete Principal</label><input aria-label="Manchete Principal" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 outline-none focus:border-fuchsia-500 text-sm font-black" placeholder="Ex: O NOVO LÍDER" value={params.headline} onChange={(e) => setParams({...params, headline: e.target.value})} disabled={isLocked} /></div>
            <div><label className="text-xs font-bold text-slate-400 uppercase mb-2 block flex items-center gap-1"><Type className="w-3 h-3"/> Submanchete</label><input aria-label="Ex: Como ele dominou o mercado..." className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 outline-none focus:border-fuchsia-500 text-xs" placeholder="Ex: Como ele dominou o mercado..." value={params.subheadline} onChange={(e) => setParams({...params, subheadline: e.target.value})} disabled={isLocked} /></div>
            <div><label className="text-xs font-bold text-slate-400 uppercase mb-2 block flex items-center gap-1"><Layers className="w-3 h-3"/> Rodapé / Edição</label><input aria-label="Ex: EDIÇÃO JAN 2025" className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 outline-none focus:border-fuchsia-500 text-xs" placeholder="Ex: EDIÇÃO JAN 2025" value={params.footerText} onChange={(e) => setParams({...params, footerText: e.target.value})} disabled={isLocked} /></div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3"><label className="text-sm font-bold text-slate-300 flex items-center gap-2"><Upload className="w-4 h-4" /> Sua Foto (Referência)</label><div className="flex flex-wrap gap-2">{refImages.map((img, idx) => (<div key={idx} className="relative w-16 h-16 rounded overflow-hidden border border-slate-600 group"><img src={img} alt="ref" className="w-full h-full object-cover" /><button onClick={() => removeImage(idx)} disabled={isLocked} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white disabled:opacity-0"><Trash2 className="w-4 h-4" /></button></div>))}<label className={`w-16 h-16 border border-dashed border-slate-500 rounded flex items-center justify-center transition-colors ${isLocked ? 'opacity-40 pointer-events-none' : 'cursor-pointer hover:bg-slate-800'}`}><input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isLocked} /><Upload className="w-5 h-5 text-slate-500" /></label></div></div>
        
        <div className="relative">
            <div className="absolute right-2 top-8 z-10 flex gap-2">
                {sharedContext && (
                    <button onClick={handleImportGlobal} className="p-2 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 hover:bg-fuchsia-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                        <Brain className="w-4 h-4" />
                    </button>
                )}
                {!isLocked && <SpeechInput onTranscript={(t) => setLocalContext(prev => prev + ' ' + t)} language={language} />}
            </div>
            <div className="flex justify-between items-center mt-1 mb-1"><label className="text-sm font-medium text-slate-300 block">{t('mag_context')}</label></div>
            <textarea aria-label={t('placeholder_context')} className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-fuchsia-500 outline-none text-sm pr-10 text-slate-200" placeholder={t('placeholder_context')} value={localContext} onChange={(e) => setLocalContext(e.target.value)} disabled={isLocked}></textarea>
        </div>
      </div>
  );

  return (
    <ToolLayout title={t('mag_title')} icon={BookOpen} iconColorClass="text-fuchsia-400" description={magHelpDescription} loading={loading} error={error} isLocked={isLocked} onToggleLock={() => setIsLocked(!isLocked)} outputKind="image" sidebarContent={sidebarContent} actions={(<button onClick={handleGenerate} disabled={loading || isLocked || (!localContext && refImages.length === 0)} className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-40">{loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <ImageIcon className="w-5 h-5" />} {loading ? 'Criando Capa...' : t('mag_btn')}</button>)} 
      mainContent={(
      <>
        {result.content ? (
            <>
              <div className="bg-slate-900/50 p-4 border-b border-slate-800 rounded-t-xl flex items-center gap-2 text-fuchsia-400 font-semibold"><BookOpen className="w-5 h-5" /> Prompt de Capa Editorial</div>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6"><pre className="whitespace-pre-wrap font-sans text-base text-slate-300">{result.content}</pre>{result.note && (<div className="mt-8 p-4 bg-slate-900 border-l-4 border-yellow-500 rounded-r-lg shadow-xl animate-in fade-in"><h4 className="text-[10px] font-black text-yellow-500 flex items-center gap-2 mb-2 uppercase tracking-widest"><Wand2 className="w-4 h-4" /> Nota do Estrategista</h4><div className="text-slate-300 italic text-sm whitespace-pre-wrap font-medium">{result.note}</div></div>)}</div>
              <div className="p-4 border-t border-slate-800 flex gap-2"><button onClick={() => downloadPDF(`MagazinePrompt`, result.content)} className="flex-1 bg-slate-800 py-3 rounded-lg text-sm font-bold text-slate-200">PDF</button><button onClick={() => navigator.clipboard.writeText(result.content)} className="flex-1 bg-fuchsia-600 py-3 rounded-lg text-sm font-bold text-white">Copiar</button></div>
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 p-6">{loading ? <RefreshCw className="w-16 h-16 mb-4 animate-spin text-fuchsia-500" /> : <BookOpen className="w-16 h-16 mb-4 opacity-20" />}<p className="text-center text-slate-400">{loading ? 'Gerando Autoridade Visual...' : t('msg_wait_desc')}</p></div>
        )}
      </>
  )} hasResults={!!result.content} sessionId="magazine" />
  );
};

export default MagazineCoverStudio;