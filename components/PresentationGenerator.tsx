import React, { useState, useEffect } from 'react';
import { getLocalizedLists } from '../constants';
import { generatePresentationService } from '../services/geminiService';
import { MonitorPlay, Wand2, Link2, Target, Users, RefreshCw, Home, Brain } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { RefinementToolbar } from './RefinementToolbar';
import { ToolLayout } from './ToolLayout';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { SectionHelp } from './SectionHelp';

interface PresentationGeneratorProps {
  language: string;
}

const PresentationGenerator: React.FC<PresentationGeneratorProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  const [result, setResult] = useState({ content: '', note: '' });
  const [isLocked, setIsLocked] = useState(false);
  
  const { t, langCode } = useTranslation(language);
  const { pptPlatforms, pptStyles, pptPurposes } = getLocalizedLists(langCode);

  // ESTADO LOCAL ISOLADO
  const [localData, setLocalData] = useState('');

  const [params, setParams] = useState({
    platform: pptPlatforms[0],
    slideCount: 10,
    style: pptStyles[0],
    purpose: pptPurposes[0],
    audience: '',
  });

  const presentationHelpDescription = `
O que é o Roteirista de Pitch Decks (PPT):
Esta ferramenta é sua consultoria estratégica para criar apresentações que vendem ideias, produtos ou relatórios.
`;

  useEffect(() => {
      setParams(p => ({ ...p, platform: pptPlatforms[0], style: pptStyles[0], purpose: pptPurposes[0] }));
  }, [langCode, pptPlatforms, pptStyles, pptPurposes]);

  const handleImportGlobal = () => {
    setLocalData(sharedContext);
  };

  const handleGenerate = () => {
    if (!localData) { alert('Por favor, insira o contexto/dados.'); return; }
    setResult({ content: '', note: '' });

    generateStream(
        (onChunk) => generatePresentationService({ ...params, context: localData, language: language }, onChunk),
        (streamedText) => {
            const noteSeparator = "|||NOTA_DIVIDER|||";
            const noteContentSeparator = /NOTA DO ESTRATEGISTA:/i;
            let contentPart = streamedText; 
            let notePart = '';
            
            if (streamedText.includes(noteSeparator)) {
                const parts = streamedText.split(noteSeparator);
                contentPart = parts[0].trim();
                notePart = parts[1] ? parts[1].replace(noteContentSeparator, '').trim() : '';
            }
            setResult({ content: contentPart, note: notePart });
        }
    );
  };

  const handleVoiceInput = (text: string) => { setLocalData(prev => (prev ? prev + ' ' + text : text)); };
  const slideOptions = [5, 8, 10, 12, 15, 20, 25];

  const sidebarContent = (
    <div className="space-y-4">
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('ppt_platform')}</label><select aria-label={t('ppt_platform')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-orange-500 outline-none text-sm" value={params.platform} onChange={(e) => setParams({...params, platform: e.target.value})} disabled={isLocked}>{pptPlatforms.map(p => (<option key={p} value={p}>{p}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('ppt_slides')}</label><select aria-label={t('ppt_slides')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-orange-500 outline-none text-sm" value={params.slideCount} onChange={(e) => setParams({...params, slideCount: parseInt(e.target.value)})} disabled={isLocked}>{slideOptions.map(n => (<option key={n} value={n}>{n} Slides</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('label_style')}</label><select aria-label={t('label_style')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-orange-500 outline-none text-sm" value={params.style} onChange={(e) => setParams({...params, style: e.target.value})} disabled={isLocked}>{pptStyles.map(style => (<option key={style} value={style}>{style}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('ppt_purpose')}</label><select aria-label={t('ppt_purpose')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-orange-500 outline-none text-sm" value={params.purpose} onChange={(e) => setParams({...params, purpose: e.target.value})} disabled={isLocked}>{pptPurposes.map(purpose => (<option key={purpose} value={purpose}>{purpose}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 flex items-center gap-2 mb-1"><Users className="w-3 h-3 text-orange-400" /> {t('ppt_audience')}</label><input aria-label={t('ppt_audience')} type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-orange-500 outline-none text-sm" placeholder="Ex: Investidores, Alunos..." value={params.audience} onChange={(e) => setParams({...params, audience: e.target.value})} disabled={isLocked} /></div>
      <div className="relative">
        <div className="absolute right-2 top-8 z-10 flex gap-2">
            {sharedContext && (
                <button onClick={handleImportGlobal} className="p-2 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                    <Brain className="w-4 h-4" />
                </button>
            )}
            {!isLocked && <SpeechInput onTranscript={handleVoiceInput} language={language} />}
        </div>
        <div className="flex justify-between items-center mt-1 mb-1"><label className="text-sm font-medium text-slate-300 block">{t('ppt_context')}</label><div className="flex items-center gap-1 text-xs text-orange-400"><Link2 className="w-3 h-3" /> Sessão Isolada</div></div>
        <textarea aria-label={t('placeholder_context')} className="w-full h-40 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-orange-500 outline-none text-sm pr-10 text-slate-200" placeholder={t('placeholder_context')} value={localData} onChange={(e) => setLocalData(e.target.value)} disabled={isLocked}></textarea>
      </div>
    </div>
  );

  const actions = (
      <button onClick={handleGenerate} disabled={loading || !localData || isLocked} className="w-full bg-orange-600 hover:bg-orange-500 hover:shadow-orange-500/20 active:scale-95 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg">
        {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Target className="w-5 h-5" />}
        {loading ? 'Criando Roteiro...' : t('ppt_btn')}
      </button>
  );

  const mainContent = (
      <>
        {result.content || loading ? (
            <>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6 lg:p-10">
                  <div className="whitespace-pre-wrap font-sans text-base text-slate-300 leading-relaxed">
                    {result.content}
                    {loading && <span className="inline-block w-2 h-4 bg-orange-500 animate-pulse ml-1 align-middle"></span>}
                  </div>
                  {result.note && (
                    <div className="mt-8 p-4 bg-slate-800/50 border-l-4 border-yellow-400 rounded-r-lg">
                        <h4 className="text-sm font-bold text-yellow-400 flex items-center gap-2"><Wand2 className="w-4 h-4" /> NOTA DO ESTRATEGISTA:</h4>
                        <p className="text-slate-300 italic mt-2 text-sm whitespace-pre-wrap">{result.note}</p>
                    </div>
                  )}
              </div>
              <RefinementToolbar text={result.content} onTextUpdate={(newContent) => setResult(prev => ({ ...prev, content: newContent }))} language={language} titleForPDF={`Roteiro PPT - ${params.purpose}`} />
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 min-h-[200px] p-6">
                <MonitorPlay className="w-16 h-16 mb-4 opacity-20" />
                <p className="text-center text-slate-400">{t('msg_wait_desc')}</p>
            </div>
        )}
      </>
  );

  return (
    <ToolLayout
      title={t('ppt_title')}
      icon={MonitorPlay}
      iconColorClass="text-orange-400"
      description={presentationHelpDescription}
      loading={loading}
      error={error}
      isLocked={isLocked}
      onToggleLock={() => setIsLocked(!isLocked)}
      outputKind="text"
      sidebarContent={sidebarContent}
      actions={actions}
      mainContent={mainContent}
      hasResults={!!result.content}
      sessionId="presentation"
    />
  );
};

export default PresentationGenerator;