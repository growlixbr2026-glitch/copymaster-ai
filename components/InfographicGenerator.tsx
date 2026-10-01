import React, { useState, useEffect } from 'react';
import { getLocalizedLists, IMAGE_AIS } from '../constants';
import { generateInfographicService } from '../services/geminiService';
import { ReferenceMode } from '../types';
import { downloadPDF } from '../services/pdfService';
import { PieChart, Wand2, Link2, CheckCircle2, FileText, Upload, Trash2, AtSign, Download, RefreshCw, Home, Brain, Layers } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import SpeechInput from './SpeechInput';
import TextToSpeech from './TextToSpeech';
import { useSharedContext } from '../contexts/SharedContext';
import { ToolLayout } from './ToolLayout';
import { EngineLink } from './ToolLayout';
import { useAIGenerator } from '../hooks/useAIGenerator';

interface InfographicGeneratorProps { language: string; }

const InfographicGenerator: React.FC<InfographicGeneratorProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  const [result, setResult] = useState({ content: '', note: '' });
  const [isLocked, setIsLocked] = useState(false);
  const { t, langCode } = useTranslation(language);
  
  const { infoStyles, infoLayouts, socialPlatforms, videoRatios } = getLocalizedLists(langCode);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [refMode, setRefMode] = useState<ReferenceMode>('creative');

  const [localData, setLocalData] = useState('');

  const [params, setParams] = useState({
    style: infoStyles[0], layout: infoLayouts[0], aiModel: IMAGE_AIS[0],
    platform: socialPlatforms[0], aspectRatio: videoRatios[0], footer: ''
  });

  const infographicHelpDescription = `
O que é o Planejador de Dados Visuais:
Este módulo transforma grandes blocos de texto ou dados brutos em um roteiro lógico para infográficos, definindo a hierarquia de informação e as melhores formas de representação visual.
`;

  useEffect(() => { setParams(p => ({ ...p, style: infoStyles[0], layout: infoLayouts[0], platform: socialPlatforms[0], aspectRatio: videoRatios[0] })); }, [langCode, infoStyles, infoLayouts, socialPlatforms, videoRatios]);

  const handleImportGlobal = () => {
    setLocalData(sharedContext);
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
    if (!localData) { alert("Por favor, insira o tópico ou dados do infográfico."); return; }
    setResult({ content: '', note: '' });
    generateStream(
        (onChunk) => generateInfographicService({ ...params, context: localData, referenceImages: refImages, referenceMode: refImages.length > 0 ? refMode : 'none', language: language }, onChunk),
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
            <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Modelo IA</label><select aria-label="Modelo IA" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.aiModel} onChange={(e) => setParams({...params, aiModel: e.target.value})} disabled={isLocked}>{IMAGE_AIS.map(i => (<option key={i} value={i}>{i}</option>))}</select><EngineLink engine={params.aiModel} /></div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Proporção</label><select aria-label="Proporção" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.aspectRatio} onChange={(e) => setParams({...params, aspectRatio: e.target.value})} disabled={isLocked}>{videoRatios.map(r => (<option key={r} value={r}>{r}</option>))}</select></div>
        </div>
        <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('label_platform')}</label><select aria-label={t('label_platform')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm" value={params.platform} onChange={(e) => setParams({...params, platform: e.target.value})} disabled={isLocked}>{socialPlatforms.map(p => (<option key={p} value={p}>{p}</option>))}</select></div>
        <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('info_layout')}</label><select aria-label={t('info_layout')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm" value={params.layout} onChange={(e) => setParams({...params, layout: e.target.value})} disabled={isLocked}>{infoLayouts.map(l => (<option key={l} value={l}>{l}</option>))}</select></div>
        <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('label_style')}</label><select aria-label={t('label_style')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm" value={params.style} onChange={(e) => setParams({...params, style: e.target.value})} disabled={isLocked}>{infoStyles.map(style => (<option key={style} value={style}>{style}</option>))}</select></div>
        <div><label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-1"><Layers className="w-3 h-3 text-emerald-400" /> Rodapé (Assinatura/Data)</label><input aria-label="Rodapé (Assinatura/Data)" type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none text-xs" placeholder="Ex: @suaempresa - Jan 2025" value={params.footer} onChange={(e) => setParams({...params, footer: e.target.value})} disabled={isLocked} /></div>
        <div role="group" aria-label="Referências visuais" className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3"><label className="text-sm font-bold text-slate-300 flex items-center gap-2"><Upload className="w-4 h-4" /> Referências Visuais</label><div className="flex flex-wrap gap-2">{refImages.map((img, idx) => (<div key={idx} className="relative w-16 h-16 rounded overflow-hidden border border-slate-600 group"><img src={img} alt="ref" className="w-full h-full object-cover" /><button onClick={() => removeImage(idx)} disabled={isLocked} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white disabled:opacity-0"><Trash2 className="w-4 h-4" /></button></div>))}<label className={`w-16 h-16 border border-dashed border-slate-500 rounded flex items-center justify-center transition-colors ${isLocked ? 'opacity-40 pointer-events-none' : 'cursor-pointer hover:bg-slate-800'}`}><input type="file" className="hidden" accept="image/*" multiple onChange={handleImageUpload} disabled={isLocked} /><Upload className="w-5 h-5 text-slate-500" /></label></div></div>
        <div className="relative">
            <div className="absolute right-2 top-8 z-10 flex gap-2">
                {sharedContext && (
                    <button onClick={handleImportGlobal} className="p-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                        <Brain className="w-4 h-4" />
                    </button>
                )}
                {!isLocked && <SpeechInput onTranscript={(t) => setLocalData(prev => prev + ' ' + t)} language={language} />}
            </div>
            <div className="flex justify-between items-center mt-1 mb-1"><label className="text-sm font-medium text-slate-300 block">{t('info_data')}</label><div className="flex items-center gap-1 text-xs text-emerald-400"><Link2 className="w-3 h-3" /> Sessão Isolada</div></div>
            <textarea aria-label={t('placeholder_context')} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-emerald-500 outline-none text-sm pr-10 text-slate-200" placeholder={t('placeholder_context')} value={localData} onChange={(e) => setLocalData(e.target.value)} disabled={isLocked}></textarea>
        </div>
    </div>
  );

  return (
    <ToolLayout title={t('info_title')} icon={PieChart} iconColorClass="text-emerald-400" description={infographicHelpDescription} loading={loading} error={error} isLocked={isLocked} onToggleLock={() => setIsLocked(!isLocked)} outputKind="image" sidebarContent={sidebarContent} actions={(<button onClick={handleGenerate} disabled={loading || !localData || isLocked} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg">{loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <PieChart className="w-5 h-5" />} {loading ? 'Planejando...' : t('info_btn')}</button>)} 
      mainContent={(
      <>
        {result.content ? (
            <>
              <div className="bg-slate-900/50 p-4 border-b border-slate-800 rounded-t-xl flex items-center gap-2 text-emerald-400 font-semibold"><FileText className="w-5 h-5" /> Plano de Infográfico</div>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6"><pre className="whitespace-pre-wrap font-sans text-base text-slate-300">{result.content}</pre>{result.note && (<div className="mt-8 p-4 bg-slate-900 border-l-4 border-yellow-400 rounded-r-lg shadow-xl animate-in fade-in"><h4 className="text-[10px] font-black text-yellow-500 flex items-center gap-2 mb-2 uppercase tracking-widest"><Wand2 className="w-4 h-4" /> Nota do Estrategista</h4><p className="text-slate-300 italic mt-2 text-sm whitespace-pre-wrap">{result.note}</p></div>)}</div>
              <div className="p-4 border-t border-slate-800 flex gap-2"><button onClick={() => downloadPDF(`Infográfico`, result.content)} className="flex-1 bg-slate-800 py-3 rounded-lg text-sm font-bold text-slate-200">PDF</button><button onClick={() => navigator.clipboard.writeText(result.content)} className="flex-1 bg-emerald-600 py-3 rounded-lg text-sm font-bold text-white">Copiar</button></div>
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 p-6">{loading ? <RefreshCw className="w-16 h-16 mb-4 animate-spin text-emerald-500" /> : <PieChart className="w-16 h-16 mb-4 opacity-20" />}<p className="text-center text-slate-400">{loading ? 'Arquitetando Dados Visuais...' : t('msg_wait_desc')}</p></div>
        )}
      </>
  )} hasResults={!!result.content} />
  );
};

export default InfographicGenerator;