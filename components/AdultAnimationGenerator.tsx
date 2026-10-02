import React, { useState, useEffect } from 'react';
import { getLocalizedLists, IMAGE_AIS } from '../constants';
import { generateAdultAnimationService } from '../services/geminiService';
import { ReferenceMode } from '../types';
import { Tv, Wand2, Link2, MessageSquare, Upload, Trash2, AtSign, Palette, RefreshCw, Home, Brain, Layers } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { RefinementToolbar } from './RefinementToolbar';
import { ToolLayout } from './ToolLayout';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { SectionHelp } from './SectionHelp';

interface AdultAnimationGeneratorProps { language: string; }

const AdultAnimationGenerator: React.FC<AdultAnimationGeneratorProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  const [result, setResult] = useState({ content: '', note: '' });
  const [isLocked, setIsLocked] = useState(false);
  const { t, langCode } = useTranslation(language);
  
  // ESTADO LOCAL ISOLADO
  const [localPremise, setLocalPremise] = useState('');

  const { adultAnimationStyles, adultAnimationFormats, imageAIs, socialPlatforms, paperSizes } = getLocalizedLists(langCode);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [refMode, setRefMode] = useState<ReferenceMode>('creative');

  const [params, setParams] = useState({
    style: adultAnimationStyles[0], format: adultAnimationFormats[0], aiModel: imageAIs[1],
    platform: socialPlatforms[0], aspectRatio: paperSizes[0], footer: ''
  });

  const aaHelpDescription = `
O que é o Roteirista de Animação Adulta:
Este módulo é especializado em criar roteiros com humor ácido, sátiras sociais e piadas visuais complexas. Ele utiliza as "Regras da Comédia" (como a Regra de Três) para garantir o timing perfeito.
`;

  useEffect(() => { setParams(p => ({ ...p, style: adultAnimationStyles[0], format: adultAnimationFormats[0], platform: socialPlatforms[0], aspectRatio: paperSizes[0] })); }, [langCode, adultAnimationStyles, adultAnimationFormats, socialPlatforms, paperSizes]);

  const handleImportGlobal = () => {
    setLocalPremise(sharedContext);
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
    if (!localPremise) { alert("Por favor, insira o contexto do roteiro."); return; }
    setResult({ content: '', note: '' });
    generateStream(
        (onChunk) => generateAdultAnimationService({ ...params, context: localPremise, referenceImages: refImages, referenceMode: refImages.length > 0 ? refMode : 'none', language: language }, onChunk),
        (streamedText) => {
            const noteSeparator = "|||NOTA_DIVIDER|||";
            const parts = streamedText.split(noteSeparator);
            setResult({ content: parts[0].trim(), note: parts[1] ? parts[1].replace(/NOTA DO ESTRATEGISTA:[\s]*/i, '').trim() : '' });
        }
    );
  };

  const sidebarContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
          <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Modelo IA</label><select aria-label="Modelo IA" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.aiModel} onChange={(e) => setParams({...params, aiModel: e.target.value})} disabled={isLocked}>{imageAIs.map(i => (<option key={i} value={i}>{i}</option>))}</select></div>
          <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Formato (Papel)</label><select aria-label="Formato (Papel)" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.aspectRatio} onChange={(e) => setParams({...params, aspectRatio: e.target.value})} disabled={isLocked}>{paperSizes.map(r => (<option key={r} value={r}>{r}</option>))}</select></div>
      </div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('label_platform')}</label><select aria-label={t('label_platform')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-orange-500 outline-none text-sm" value={params.platform} onChange={(e) => setParams({...params, platform: e.target.value})} disabled={isLocked}>{socialPlatforms.map(p => (<option key={p} value={p}>{p}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('aa_style')}</label><select aria-label={t('aa_style')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-orange-500 outline-none text-sm" value={params.style} onChange={(e) => setParams({...params, style: e.target.value})} disabled={isLocked}>{adultAnimationStyles.map(style => (<option key={style} value={style}>{style}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('aa_format')}</label><select aria-label={t('aa_format')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-orange-500 outline-none text-sm" value={params.format} onChange={(e) => setParams({...params, format: e.target.value})} disabled={isLocked}>{adultAnimationFormats.map(l => (<option key={l} value={l}>{l}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-1"><Layers className="w-3 h-3 text-orange-400" /> Rodapé / @Usuario</label><input aria-label="Rodapé / @Usuario" type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-orange-500 outline-none text-xs" placeholder="Ex: @canalanimado" value={params.footer} onChange={(e) => setParams({...params, footer: e.target.value})} disabled={isLocked} /></div>
      <div role="group" aria-label="Referências visuais" className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3"><label className="text-sm font-bold text-slate-300 flex items-center gap-2"><Upload className="w-4 h-4" /> Referências Visuais</label><div className="flex flex-wrap gap-2">{refImages.map((img, idx) => (<div key={idx} className="relative w-16 h-16 rounded overflow-hidden border border-slate-600 group"><img src={img} alt="ref" className="w-full h-full object-cover" /><button onClick={() => removeImage(idx)} disabled={isLocked} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white disabled:opacity-0"><Trash2 className="w-4 h-4" /></button></div>))}<label className={`w-16 h-16 border border-dashed border-slate-500 rounded flex items-center justify-center transition-colors ${isLocked ? 'opacity-40 pointer-events-none' : 'cursor-pointer hover:bg-slate-800'}`}><input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} disabled={isLocked} /><Upload className="w-5 h-5 text-slate-500" /></label></div></div>
      <div className="relative">
        <div className="absolute right-2 top-8 z-10 flex gap-2">
            {sharedContext && (
                <button onClick={handleImportGlobal} className="p-2 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                    <Brain className="w-4 h-4" />
                </button>
            )}
            {!isLocked && <SpeechInput onTranscript={(t) => setLocalPremise(prev => prev + ' ' + t)} language={language} />}
        </div>
        <div className="flex justify-between items-center mt-1 mb-1"><label className="text-sm font-medium text-slate-300 block">{t('aa_topic')}</label><div className="flex items-center gap-1 text-xs text-orange-400"><Link2 className="w-3 h-3" /> Sessão Isolada</div></div>
        <textarea aria-label={t('placeholder_context')} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-orange-500 outline-none text-sm pr-10 text-slate-200" placeholder={t('placeholder_context')} value={localPremise} onChange={(e) => setLocalPremise(e.target.value)} disabled={isLocked}></textarea>
      </div>
    </div>
  );

  return (
    <ToolLayout title={t('aa_title')} icon={Tv} iconColorClass="text-orange-400" description={aaHelpDescription} loading={loading} error={error} isLocked={isLocked} onToggleLock={() => setIsLocked(!isLocked)} sidebarContent={sidebarContent} actions={(<button onClick={handleGenerate} disabled={loading || !localPremise || isLocked} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg">{loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Tv className="w-5 h-5" />} {loading ? 'Animando...' : t('aa_btn')}</button>)} sessionId="adultanimation" 
      mainContent={(
      <>
        {result.content ? (
            <>
              <div className="bg-slate-900/50 p-4 border-b border-slate-800 rounded-t-xl flex items-center gap-2 text-orange-400 font-semibold"><MessageSquare className="w-5 h-5" /> Roteiro de Animação</div>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6"><pre className="whitespace-pre-wrap font-sans text-base text-slate-300">{result.content}</pre>{result.note && (<div className="mt-8 p-4 bg-slate-800/50 border-l-4 border-yellow-400 rounded-r-lg"><h4 className="text-sm font-bold text-yellow-400 flex items-center gap-2"><Wand2 className="w-4 h-4" /> NOTA DO ESTRATEGISTA:</h4><p className="text-slate-300 italic mt-2 text-sm whitespace-pre-wrap">{result.note}</p></div>)}</div>
              <RefinementToolbar text={result.content} onTextUpdate={(newText) => setResult(prev => ({ ...prev, content: newText }))} language={language} titleForPDF={`Roteiro Anim - ${params.style}`} />
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 p-6">{loading ? <RefreshCw className="w-16 h-16 mb-4 animate-spin text-orange-500" /> : <Tv className="w-16 h-16 mb-4 opacity-20" />}<p className="text-center text-slate-400">{loading ? 'Escrevendo Roteiro Ácido...' : t('msg_wait_desc')}</p></div>
        )}
      </>
  )} hasResults={!!result.content} />
  );
};

export default AdultAnimationGenerator;