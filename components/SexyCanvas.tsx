import React, { useState, useEffect, useMemo } from 'react';
import { getLocalizedLists } from '../constants';
import { generateSexyCanvasService } from '../services/modules/strategy/sexyCanvas';
import {
  Flame, RefreshCw, AlertCircle, Link2, Wand2, Lightbulb, Home, Brain, Lock, Unlock
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import SpeechInput from './SpeechInput';
import { SectionHelp } from './SectionHelp';
import { OutputKindBadge } from './ToolLayout';
import { useSharedContext } from '../contexts/SharedContext';
import { RefinementToolbar } from './RefinementToolbar';
import { useAIGenerator } from '../hooks/useAIGenerator';

interface SexyCanvasProps {
  language: string;
}

const SexyCanvas: React.FC<SexyCanvasProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { t, langCode } = useTranslation(language);
  const { sins } = getLocalizedLists(langCode);
  const { loading, error, generateStream } = useAIGenerator();

  const [selectedSin, setSelectedSin] = useState(sins[0]);
  const [result, setResult] = useState({ content: '', note: '' });
  const [isLocked, setIsLocked] = useState(false);
  
  // ESTADO LOCAL ISOLADO (Não afeta o global)
  const [localContext, setLocalContext] = useState('');
  
  const sexyHelpDescription = `
O que é o Sexy Canvas:
Inspirado na metodologia de André Diamand, o Sexy Canvas mapeia as sensações e pecados capitais (desejos viscerais) do ser humano para tornar produtos irresistíveis. Esta ferramenta não gera copy genérica; ela foca na emoção bruta que move a decisão de compra.

Como usar (Passo a Passo):
1. Pecado Capital (Gatilho): Escolha a "vibe" psicológica do seu produto.
2. Objeto de Desejo (Contexto): Descreva o seu produto ou serviço localmente. Use o botão de cérebro para importar ideias centrais.

O que esperar (Resultado):
Uma peça de copywriting visceral, focada em converter através do subconsciente.

Dica de Elite:
Não tente ser "bonzinho". O Sexy Canvas funciona melhor quando você abraça o desejo humano real por trás da necessidade racional.
`;

  useEffect(() => { setSelectedSin(sins[0]); }, [langCode]);

  const strategyHint = useMemo(() => {
      const lower = selectedSin.toLowerCase();
      if (lower.includes("luxúria") || lower.includes("lust")) return t('hint_lust');
      if (lower.includes("gula") || lower.includes("gluttony")) return t('hint_gluttony');
      if (lower.includes("avareza") || lower.includes("greed")) return t('hint_greed');
      if (lower.includes("preguiça") || lower.includes("sloth")) return t('hint_sloth');
      if (lower.includes("ira") || lower.includes("wrath")) return t('hint_wrath');
      if (lower.includes("inveja") || lower.includes("envy")) return t('hint_envy');
      if (lower.includes("orgulho") || lower.includes("pride")) return t('hint_pride');
      return "A IA escolherá o melhor ângulo psicológico.";
  }, [selectedSin, t]);

  const handleImportGlobal = () => {
    setLocalContext(sharedContext);
  };

  const handleGenerate = () => {
    setResult({ content: '', note: '' });
    
    generateStream(
      (onChunk) => generateSexyCanvasService(selectedSin, localContext, language, onChunk),
      (streamedText) => {
        const noteSeparator = "|||NOTA_DIVIDER|||";
        const parts = streamedText.split(noteSeparator);
        setResult({
            content: parts[0].trim(),
            note: parts[1] ? parts[1].replace(/NOTA DO ESTRATEGISTA:[\s]*/i, '').trim() : ''
        });
      }
    );
  };

  const handleVoiceInput = (text: string) => {
    setLocalContext(prev => (prev ? prev + ' ' + text : text));
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto w-full pb-10">
        
        <div className="bg-gradient-to-r from-rose-900/20 to-purple-900/20 p-6 lg:p-8 rounded-2xl border border-rose-900/30 mb-8 flex-shrink-0 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl lg:text-3xl font-bold flex items-center gap-3 text-rose-400">
                <Flame className="w-8 h-8" aria-hidden="true" /> {t('sexy_title')}
                <OutputKindBadge kind="text" />
                <SectionHelp title={t('sexy_title')} description={sexyHelpDescription} sessionId="sexy" />
            </h2>
            <div className="flex items-center gap-2">
            <button onClick={() => setAppActiveTab('home')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-500/80 hover:text-rose-200 hover:bg-rose-500/20 transition-all border border-transparent"><Home className="w-4 h-4" /><span className="hidden sm:inline">Início</span></button>
            <button onClick={() => setIsLocked(!isLocked)} className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${isLocked ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {isLocked ? "BLOQUEADO" : "LIVRE"}
            </button>
            </div>
          </div>
          <p className="text-slate-400 mb-6 text-sm lg:text-base">{t('sexy_subtitle')}</p>

          <div className={`space-y-6 transition-opacity duration-300 ${isLocked ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
            <div>
              <label htmlFor="selected-sin" className="block text-sm font-medium text-rose-200 mb-2">{t('sexy_trigger')}</label>
              <select aria-label={t('sexy_trigger')} id="selected-sin" className="w-full bg-slate-900 border border-rose-900/50 rounded-lg p-4 text-base focus:ring-2 focus:ring-rose-500 outline-none text-rose-100 font-bold" value={selectedSin} onChange={(e) => setSelectedSin(e.target.value)}>
                {sins.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="mt-2 flex items-start gap-2 text-xs text-rose-300/80 bg-rose-950/30 p-2 rounded border border-rose-900/30">
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span><strong>Estratégia:</strong> {strategyHint}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                  <label className="block text-sm font-medium text-rose-200">{t('sexy_context')}</label>
                  <div className="flex items-center gap-3">
                    {sharedContext && (
                        <button onClick={handleImportGlobal} className="text-[10px] flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-400 px-2 py-1 rounded border border-rose-500/30 transition-all font-black uppercase" title="Importar do Cérebro Central">
                            <Brain className="w-3 h-3" /> Puxar Contexto Global
                        </button>
                    )}
                    <div className="flex items-center gap-1 text-xs text-rose-400"><Link2 className="w-3 h-3" /> Sessão Isolada</div>
                  </div>
              </div>
              <div className="relative">
                <div className="absolute right-2 top-2 z-10"><SpeechInput onTranscript={handleVoiceInput} language={language} className="bg-rose-900/50 hover:bg-rose-800 text-rose-200 border-rose-700" /></div>
                <textarea aria-label={t('sexy_placeholder')} className="w-full h-32 bg-slate-900 border border-rose-900/50 rounded-lg p-4 pr-12 text-base focus:ring-2 focus:ring-rose-500 outline-none resize-none text-slate-200" placeholder={t('sexy_placeholder')} value={localContext} onChange={(e) => setLocalContext(e.target.value)}></textarea>
              </div>
            </div>

            {error && <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}

            <button onClick={handleGenerate} disabled={loading || isLocked || !localContext} className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-lg active:scale-95">
              {loading ? <RefreshCw className="animate-spin w-6 h-6" /> : <Flame className="w-6 h-6" />}{loading ? t('btn_generating') : t('sexy_btn')}
            </button>
          </div>
        </div>

        {(result.content || loading) && (
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col min-h-[500px]">
            <div className="p-6 border-b border-slate-800 bg-slate-950/50 rounded-t-2xl">
               <h3 className="text-lg font-semibold text-rose-400 flex items-center gap-2"><Flame className="w-5 h-5" /> {t('sexy_result')}</h3>
            </div>
            
            <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6 lg:p-8">
                <div className="whitespace-pre-wrap text-slate-200 leading-relaxed text-lg font-sans">
                    {result.content}
                    {loading && <span className="inline-block w-2 h-4 bg-rose-500 animate-pulse ml-1 align-middle"></span>}
                </div>
                
                {result.note && (
                    <div className="mt-8 p-4 bg-slate-800/50 border-l-4 border-yellow-400 rounded-r-lg animate-in fade-in">
                        <h4 className="text-sm font-bold text-yellow-400 flex items-center gap-2"><Wand2 className="w-4 h-4" /> NOTA DO ESTRATEGISTA:</h4>
                        <p className="text-slate-300 italic mt-2 text-sm whitespace-pre-wrap">{result.note}</p>
                    </div>
                )}
            </div>
            
            <RefinementToolbar
                text={result.content}
                onTextUpdate={(newText) => setResult(prev => ({ ...prev, content: newText }))}
                language={language}
                titleForPDF={`Sexy Canvas - ${selectedSin}`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SexyCanvas;