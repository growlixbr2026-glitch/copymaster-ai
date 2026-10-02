import React, { useState, useEffect } from 'react';
import { Megaphone, Wand2, Link2, TrendingUp, Target, MousePointerClick, RefreshCw, Brain } from 'lucide-react';
import { getLocalizedLists } from '../constants';
import { CREWAI_MARKETING_PERSONAS } from '../data/crewai-personas';
import { generateAdsService } from '../services/geminiService';
import { useTranslation } from '../hooks/useTranslation';
import { SectionHelp } from './SectionHelp';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { RefinementToolbar } from './RefinementToolbar';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { ToolLayout } from './ToolLayout';

interface AdsStudioProps {
  language: string;
}

const AdsStudio: React.FC<AdsStudioProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  const [ads, setAds] = useState<string[]>([]);
  const [globalNote, setGlobalNote] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const { t, langCode } = useTranslation(language);
  
  const { adPlatforms, adGoals } = getLocalizedLists(langCode);

  // ESTADO LOCAL ISOLADO
  const [localContext, setLocalContext] = useState('');

  const [params, setParams] = useState({
    platform: adPlatforms[0],
    goal: adGoals[0],
    productName: '',
    offer: '',
    targetAudience: ''
  });

  // CrewAI: persona especialista (prompts.chat)
  const [crewPersona, setCrewPersona] = useState('');
  const adsPersonas = CREWAI_MARKETING_PERSONAS.filter(p => p.bestFor.includes('ads'));

  const adsHelpDescription = `
O que é o Gestor de Tráfego & Ads AI:
Este módulo é especializado em criar anúncios que interrompem o "scroll" e geram cliques.
`;

  useEffect(() => {
      setParams(p => ({
          ...p,
          platform: adPlatforms[0],
          goal: adGoals[0]
      }));
  }, [langCode, adPlatforms, adGoals]);

  const handleImportGlobal = () => {
    setLocalContext(sharedContext);
  };

  const handleGenerate = async () => {
    if (!localContext || !params.productName) {
        alert("Preencha o Nome do Produto e o Contexto.");
        return;
    }
    setAds([]); setGlobalNote(''); setActiveTab(0);
    
    generateStream(
        (onChunk) => generateAdsService({ ...params, context: localContext, language, crewPersona: crewPersona || undefined }, onChunk),
        (streamedText) => {
            const noteSeparator = "|||NOTA_DIVIDER|||";
            const mainParts = streamedText.split(noteSeparator);
            const adsContent = mainParts[0].trim();
            const noteContent = mainParts[1] ? mainParts[1].replace(/NOTA DO (ESTRATEGISTA|ESPECIALISTA).*?:[\s]*/i, '').trim() : '';
            
            if (noteContent) setGlobalNote(noteContent);

            const primarySeparator = "|||ADS_DIVIDER|||";
            let parsedAds = adsContent.split(primarySeparator).map(s => s.trim()).filter(s => s.length > 0);
            
            if (parsedAds.length > 0) setAds(parsedAds);
            else if (adsContent) setAds([adsContent]);
        }
    );
  };

  const handleAdUpdate = (newText: string) => {
      const updatedAds = [...ads];
      if (updatedAds[activeTab]) {
          updatedAds[activeTab] = newText;
          setAds(updatedAds);
      }
  };

  const handleVoiceInput = (text: string) => {
    setLocalContext(prev => prev ? prev + ' ' + text : text);
  };

  const sidebarContent = (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-slate-300 block mb-1">{t('ads_platform')}</label>
        <select aria-label={t('ads_platform')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm" value={params.platform} onChange={(e) => setParams({...params, platform: e.target.value})} disabled={loading || isLocked}>{adPlatforms.map(p => ( <option key={p} value={p}>{p}</option> ))}</select>
      </div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('ads_goal')}</label><select aria-label={t('ads_goal')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-emerald-500 outline-none text-sm" value={params.goal} onChange={(e) => setParams({...params, goal: e.target.value})} disabled={loading || isLocked}>{adGoals.map(g => ( <option key={g} value={g}>{g}</option> ))}</select></div>
      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
        <label className="text-sm font-medium text-slate-300 flex items-center gap-1">
          <Brain className="w-3.5 h-3.5 text-purple-400" /> Persona CrewAI
        </label>
        <select aria-label="Persona CrewAI" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-purple-500 outline-none" value={crewPersona} onChange={(e) => setCrewPersona(e.target.value)} disabled={loading || isLocked}>
          <option value="">✨ Sem persona (padrão)</option>
          {adsPersonas.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
        </select>
      </div>
      <div className="grid grid-cols-1 gap-3 bg-slate-900 p-4 rounded-lg border border-slate-800">
          <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">{t('ads_product')}</label><input aria-label={t('ads_product')} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-emerald-500 outline-none" value={params.productName} onChange={(e) => setParams({...params, productName: e.target.value})} disabled={loading || isLocked} /></div>
          <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold flex items-center gap-1"><MousePointerClick className="w-3 h-3 text-emerald-400"/> {t('ads_offer')}</label><input aria-label="Ex: 50% OFF..." className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-emerald-500 outline-none" placeholder="Ex: 50% OFF..." value={params.offer} onChange={(e) => setParams({...params, offer: e.target.value})} disabled={loading || isLocked} /></div>
          <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">{t('ads_audience')}</label><input aria-label={t('ads_audience')} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-emerald-500 outline-none" placeholder="Ex: mulheres 25-40" value={params.targetAudience} onChange={(e) => setParams({...params, targetAudience: e.target.value})} disabled={loading || isLocked} /></div>
      </div>
      <div className="relative">
          <div className="absolute right-2 top-8 z-10 flex gap-2">
            {sharedContext && (
                <button onClick={handleImportGlobal} className="p-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                    <Brain className="w-4 h-4" />
                </button>
            )}
            {!loading && !isLocked && <SpeechInput onTranscript={handleVoiceInput} language={language} />}
          </div>
         <div className="flex justify-between items-center mt-1 mb-1"><label className="text-sm font-medium text-slate-300 block">{t('label_context')}</label><div className="flex items-center gap-1 text-xs text-emerald-400"><Link2 className="w-3 h-3" /> Sessão Isolada</div></div>
          <textarea aria-label={t('placeholder_context')} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-emerald-500 outline-none text-sm pr-10" placeholder={t('placeholder_context')} value={localContext} onChange={(e) => setLocalContext(e.target.value)} disabled={loading || isLocked}></textarea>
      </div>
    </div>
  );

  const actions = (
      <button onClick={handleGenerate} disabled={loading || isLocked || !localContext || !params.productName} className="w-full bg-emerald-600 hover:bg-emerald-500 hover:shadow-emerald-500/20 active:scale-95 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg uppercase tracking-widest disabled:opacity-40">
        {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
        {loading ? 'Criando...' : t('ads_btn')}
      </button>
  );

  const mainContent = (
      <>
        {ads.length > 0 ? (
            <>
              <div role="tablist" className="flex border-b border-slate-800 bg-slate-900/50 overflow-x-auto no-scrollbar rounded-t-xl sticky top-0 z-10 px-2 pt-2 gap-2">
                  {ads.map((_, index) => (<button key={index} role="tab" aria-selected={activeTab === index} onClick={() => setActiveTab(index)} className={`px-5 py-3 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${activeTab === index ? 'bg-emerald-600 text-white shadow-lg translate-y-[1px]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>Opção {index + 1}</button>))}
              </div>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6 lg:p-10">
                  <div className="whitespace-pre-wrap font-sans text-base lg:text-lg text-slate-300 leading-relaxed">{ads[activeTab]}</div>
                  {globalNote && (
                    <div className="mt-8 p-4 bg-slate-800/50 border-l-4 border-yellow-400 rounded-r-lg animate-in fade-in">
                        <h4 className="text-sm font-bold text-yellow-400 flex items-center gap-2"><Wand2 className="w-4 h-4" /> NOTA DO ESTRATEGISTA:</h4>
                        <p className="text-slate-300 italic mt-2 text-sm whitespace-pre-wrap">{globalNote}</p>
                    </div>
                  )}
              </div>
              <RefinementToolbar text={ads[activeTab]} onTextUpdate={handleAdUpdate} language={language} titleForPDF={`Anúncios - Opção ${activeTab + 1}`} />
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 min-h-[200px] p-6">
                {loading ? <RefreshCw className="w-16 h-16 mb-4 animate-spin text-emerald-500" /> : <Megaphone className="w-16 h-16 mb-4 opacity-20" />}
                <p className="text-center text-slate-400">{loading ? 'Gerando...' : t('msg_wait_desc')}</p>
            </div>
        )}
      </>
  );

  return (
    <ToolLayout
      title={t('ads_title')}
      icon={Megaphone}
      iconColorClass="text-emerald-400"
      description={adsHelpDescription}
      loading={loading}
      error={error}
      isLocked={isLocked}
      onToggleLock={() => setIsLocked(!isLocked)}
      sidebarContent={sidebarContent}
      actions={actions}
      mainContent={mainContent}
      hasResults={ads.length > 0}
      sessionId="ads"
    />
  );
};

export default AdsStudio;