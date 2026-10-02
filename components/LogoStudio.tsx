import React, { useState } from 'react';
import { getLocalizedLists, IMAGE_AIS } from '../constants';
import { generateLogoBriefService, callAI } from '../services/geminiService';
import { downloadPDF } from '../services/pdfService';
import { Palette, Wand2, PenTool, Copy, Monitor, RefreshCw, Home, Brain, User, Brush } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { ToolLayout } from './ToolLayout';
import { EngineLink } from './ToolLayout';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { VisualPreview } from './VisualPreview';
import { ActivePersonaBar } from './ActivePersonaBar';
import { SectionHelp } from './SectionHelp';
import { splitVisualResult, stripVisualPrompt, splitOptions } from '../utils/stripCopyFormat';

interface LogoStudioProps {
  language: string;
}

const LogoStudio: React.FC<LogoStudioProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  
  const [results, setResults] = useState<{ option1: string, option2: string, note: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'option1' | 'option2'>('option1');
  const [isLocked, setIsLocked] = useState(false);
  
  const [localContext, setLocalContext] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [previewLoading, setPreviewLoading] = useState(false);

  const { t, langCode } = useTranslation(language);
  const { logoStyles, brandArchetypes, logoPlatforms, famousPainters, famousDesigners } = getLocalizedLists(langCode);

  const [params, setParams] = useState({
    brandName: '', niche: '', archetype: brandArchetypes[0], style: logoStyles[0], platform: logoPlatforms[0],
    artistInfluence: famousPainters[0], designerStyle: famousDesigners[0], aiModel: IMAGE_AIS[0]
  });

  const logoHelpDescription = `
O que é o Estúdio de Identidade de Elite:
Esta ferramenta não cria apenas um "desenho", ela arquiteta o DNA visual de uma marca. Você pode fundir o estilo de pintores clássicos com a precisão de designers icônicos.
`;

  const handleImportGlobal = () => {
    setLocalContext(sharedContext);
  };

  const handleGenerate = () => {
    if (!params.brandName) return;
    setResults(null); setPreviewUrl(undefined);

    generateStream(
      (onChunk) => generateLogoBriefService({ ...params, context: localContext, language }, onChunk),
      (streamedText) => {
        const { content, note } = splitVisualResult(streamedText);
        const opts = splitOptions(content, "|||LOGO_OPTION_DIVIDER|||", 2);
        setResults({
            option1: opts[0] || '',
            option2: opts[1] || '',
            note
        });
      }
    );
  };

  const handleGeneratePreview = async () => {
      if (!results) return;
      setPreviewLoading(true);
      const prompt = activeTab === 'option1' ? results.option1 : results.option2;
      const res = await callAI(prompt, "", "gemini-2.5-flash-image", undefined, { aspectRatio: "1:1", taskType: 'visual' });
      if (res.imageUrl) setPreviewUrl(res.imageUrl);
      setPreviewLoading(false);
  };

  const sidebarContent = (
      <div className="space-y-4">
        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Modelo IA</label><select aria-label="Modelo IA" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.aiModel} onChange={(e) => setParams({...params, aiModel: e.target.value})} disabled={isLocked}>{IMAGE_AIS.map(i => (<option key={i} value={i}>{i}</option>))}</select><EngineLink engine={params.aiModel} /></div>
        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Plataforma Alvo</label><select aria-label="Plataforma Alvo" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.platform} onChange={(e) => setParams({...params, platform: e.target.value})} disabled={isLocked}>{logoPlatforms.map(p => (<option key={p} value={p}>{p}</option>))}</select></div>
        <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('logo_brand_name')}</label><input aria-label={t('logo_brand_name')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:ring-1 focus:ring-fuchsia-500 text-sm font-bold" placeholder="Ex: Nexus Tech" value={params.brandName} onChange={(e) => setParams({...params, brandName: e.target.value})} disabled={isLocked} /></div>
        
        <div className="grid grid-cols-2 gap-4">
            <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Arquétipo</label><select aria-label="Arquétipo" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:ring-1 focus:ring-fuchsia-500 outline-none text-[11px]" value={params.archetype} onChange={(e) => setParams({...params, archetype: e.target.value})} disabled={isLocked}>{brandArchetypes.map(a => (<option key={a} value={a}>{a}</option>))}</select></div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Estética</label><select aria-label="Estética" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:ring-1 focus:ring-fuchsia-500 outline-none text-[11px]" value={params.style} onChange={(e) => setParams({...params, style: e.target.value})} disabled={isLocked}>{logoStyles.map(s => (<option key={s} value={s}>{s}</option>))}</select></div>
        </div>

        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Brush className="w-3 h-3"/> Referências Visuais</label>
            <div><label className="text-[10px] text-slate-400 block mb-1 flex items-center gap-1"><User className="w-2.5 h-2.5"/> Influência Artística</label><select aria-label="Referências Visuais Influência Artística" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.artistInfluence} onChange={(e) => setParams({...params, artistInfluence: e.target.value})} disabled={isLocked}>{famousPainters.map(p => (<option key={p} value={p}>{p}</option>))}</select></div>
            <div><label className="text-[10px] text-slate-400 block mb-1 flex items-center gap-1"><Palette className="w-2.5 h-2.5"/> Estilo de Designer</label><select aria-label="Estilo de Designer" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.designerStyle} onChange={(e) => setParams({...params, designerStyle: e.target.value})} disabled={isLocked}>{famousDesigners.map(d => (<option key={d} value={d}>{d}</option>))}</select></div>
        </div>

        <div className="relative">
            <div className="absolute right-2 top-8 z-10 flex gap-2">
                {sharedContext && (
                    <button onClick={handleImportGlobal} className="p-2 rounded-full bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 hover:bg-fuchsia-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                        <Brain className="w-4 h-4" />
                    </button>
                )}
                <SpeechInput onTranscript={(t) => setLocalContext(prev => prev + ' ' + t)} language={language} />
            </div>
            <label className="text-sm font-medium text-slate-300 block mb-1">Contexto / Nicho</label>
            <textarea aria-label="Contexto / Nicho" className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-fuchsia-500 outline-none text-sm text-slate-200 pr-10" placeholder="Ex: Consultoria para..." value={localContext} onChange={(e) => setLocalContext(e.target.value)} disabled={isLocked}></textarea>
        </div>
      </div>
  );

  return (
    <ToolLayout title={t('logo_title')} icon={Palette} iconColorClass="text-fuchsia-400" description={logoHelpDescription} loading={loading} error={error} isLocked={isLocked} onToggleLock={() => setIsLocked(!isLocked)} outputKind="image" sidebarContent={sidebarContent} actions={(<button onClick={handleGenerate} disabled={loading || !params.brandName || isLocked} className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg">{loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <PenTool className="w-5 h-5" />} {loading ? 'Projetando...' : t('logo_btn')}</button>)} 
      mainContent={(
      <>
        <ActivePersonaBar language={language} />
        {results ? (
            <>
              <div className="bg-slate-900/50 p-1 border-b border-slate-800 flex gap-1"><button onClick={() => setActiveTab('option1')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'option1' ? 'text-fuchsia-400 border-b-2 border-fuchsia-500' : 'text-slate-500'}`}>{t('logo_opt1')}</button>{results.option2 && (<button onClick={() => setActiveTab('option2')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'option2' ? 'text-fuchsia-400 border-b-2 border-fuchsia-500' : 'text-slate-500'}`}>{t('logo_opt2')}</button>)}</div>
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                  <pre className="whitespace-pre-wrap font-mono text-xs text-slate-300 bg-slate-950 p-4 rounded-lg border border-slate-800 mb-4">{(activeTab === 'option2' && results.option2) ? results.option2 : results.option1}</pre>
                  <button onClick={handleGeneratePreview} disabled={previewLoading} className="w-full py-3 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2">{previewLoading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Monitor className="w-4 h-4"/>} Gerar Rascunho Visual (Preview)</button>
                  <VisualPreview imageUrl={previewUrl} loading={previewLoading} title={`Logo_${params.brandName}`} onRetry={handleGeneratePreview} />
                  {results.note && (<div className="mt-8 p-4 bg-slate-900 border-l-4 border-yellow-500 rounded-r-lg shadow-lg"><h4 className="text-[10px] font-black text-yellow-500 flex items-center gap-2 mb-2 uppercase tracking-widest"><Wand2 className="w-4 h-4" /> Nota do Estrategista</h4><p className="text-slate-300 italic text-sm whitespace-pre-wrap font-medium">{results.note}</p></div>)}
              </div>
              <div className="p-4 border-t border-slate-800 flex gap-2"><button onClick={() => downloadPDF(`Logo - ${params.brandName}`, ((activeTab === 'option2' && results.option2) ? results.option2 : results.option1))} className="flex-1 bg-slate-800 py-3 rounded-lg text-sm font-bold text-slate-200">PDF</button><button onClick={() => navigator.clipboard.writeText((activeTab === 'option2' && results.option2) ? results.option2 : results.option1)} className="flex-1 bg-fuchsia-600 py-3 rounded-lg text-sm font-bold text-white"><Copy className="w-4 h-4 inline mr-2"/> Copiar</button></div>
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 p-6">{loading ? <RefreshCw className="w-16 h-16 mb-4 animate-spin text-fuchsia-500" /> : <Palette className="w-16 h-16 mb-4 opacity-20" />}<p className="text-center text-slate-400">{loading ? 'Arquitetando Identidade...' : t('msg_wait_desc')}</p></div>
        )}
      </>
  )} hasResults={!!results} sessionId="logo" />
  );
};

export default LogoStudio;