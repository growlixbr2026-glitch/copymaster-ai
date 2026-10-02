import React, { useState, useEffect } from 'react';
import { generateYouTubeService } from '../services/modules/social/youtube';
import { Youtube, Search, ImageIcon, PlayCircle, RefreshCw, Lock, Unlock, Home, Sparkles, FileText, Wand2, Zap, Info, Brain, Type, Layers } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { getLocalizedLists, IMAGE_AIS } from '../constants';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { RefinementToolbar } from './RefinementToolbar';
import { SectionHelp } from './SectionHelp';
import { OutputKindBadge } from './ToolLayout';
import { EngineLink } from './ToolLayout';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { splitVisualResult, stripVisualPrompt, splitOptions, splitNotaBlock } from '../utils/stripCopyFormat';

interface YouTubeSuiteProps {
  language: string;
}

const YouTubeSuite: React.FC<YouTubeSuiteProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generate } = useAIGenerator();
  const [activeMode, setActiveMode] = useState<'script' | 'seo' | 'thumbnail'>('script');
  const { t, langCode } = useTranslation(language);
  const { imageStyles, videoRatios } = getLocalizedLists(langCode);

  const [outputs, setOutputs] = useState({
      script: { text: '', note: '' },
      seo: { text: '', note: '' },
      thumbnail: { options: [] as string[], note: '' }
  });

  const [localBriefing, setLocalBriefing] = useState('');
  const [duration, setDuration] = useState(60);
  const [isLocked, setIsLocked] = useState(false);
  const [activeThumbTab, setActiveThumbTab] = useState(0);

  const [coverConfig, setCoverConfig] = useState({ 
    engine: IMAGE_AIS[1], 
    style: imageStyles[0],
    ratio: '16:9',
    customText: '' 
  });

  const youtubeHelpDescription = `
O que é o Domínio do YouTube:
Esta é a central tática para criadores que buscam autoridade e monetização. O sistema aplica a "Anatomia da Retenção", focando em vencer os primeiros 30 segundos do vídeo e manter o usuário engajado através de picos de curiosidade.
`;

  const hasScript = !!outputs.script.text;

  const handleImportGlobal = () => {
    setLocalBriefing(sharedContext);
  };

  const handleGenerate = () => {
    if(isLocked) return;

    let finalContext = localBriefing;
    if (activeMode !== 'script' && hasScript) {
        finalContext = `[FONTE DE DADOS OBRIGATÓRIA - ROTEIRO BASE]:\n${outputs.script.text}\n\n[INSTRUÇÕES DO USUÁRIO]:\n${localBriefing}`;
    }

    generate(
      () => generateYouTubeService({
        type: activeMode,
        duration: duration,
        style: coverConfig.style,
        engine: coverConfig.engine,
        aspectRatio: coverConfig.ratio,
        customText: coverConfig.customText,
        context: finalContext,
        language: language
      }),
      (text) => {
        if (!text || typeof text !== 'string') return;

        // Thumbnail gera prompts visuais: parse tolerante + limpeza por opção.
        // Roteiro/SEO mantêm o parse original de texto.
        if (activeMode === 'thumbnail') {
            const parsed = splitVisualResult(text);
            const options = splitOptions(parsed.content, "|||YT_OPTION_DIVIDER|||", 3);
            setOutputs(prev => {
                const newOutputs = { ...prev };
                newOutputs.thumbnail = { options: options.length > 0 ? options : [parsed.content], note: parsed.note };
                setActiveThumbTab(0);
                return newOutputs;
            });
        } else {
            const { content: mainContent, note: noteContent } = splitNotaBlock(text);
            setOutputs(prev => {
                const newOutputs = { ...prev };
                newOutputs[activeMode] = { text: mainContent, note: noteContent };
                return newOutputs;
            });
        }
      }
    );
  };

  const currentResult = activeMode === 'thumbnail' ? (outputs.thumbnail.options[activeThumbTab] || '') : outputs[activeMode].text;
  const currentNote = activeMode === 'thumbnail' ? outputs.thumbnail.note : outputs[activeMode].note;

  return (
    <div className="flex flex-col gap-6 pb-20 w-full animate-in fade-in duration-500">
      <div className="bg-[#0b071a] border border-red-900/30 p-8 rounded-[1rem] shadow-2xl">
        <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
                <Youtube className="w-8 h-8 text-red-600" />
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Domínio do YouTube</h2>
                <OutputKindBadge kind={activeMode === 'thumbnail' ? 'image' : 'text'} />
                <SectionHelp title="Domínio do YouTube" description={youtubeHelpDescription} sessionId="youtube" />
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => setAppActiveTab('home')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white bg-slate-900/50 border border-slate-800 transition-all"><Home className="w-3 h-3" /> Início</button>
                <button onClick={() => setIsLocked(!isLocked)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black border transition-all ${isLocked ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-slate-900/50 border-slate-800 text-slate-400'}`}>
                    {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />} {isLocked ? "LOCK" : "LIVRE"}
                </button>
            </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-8">
            {[
                {id: 'script', label: 'Roteiro de Retenção', icon: FileText},
                {id: 'seo', label: 'Rankeamento (SEO)', icon: Search},
                {id: 'thumbnail', label: 'Thumbnail Clickbait', icon: ImageIcon}
            ].map(m => (
                <button 
                    key={m.id}
                    onClick={() => setActiveMode(m.id as any)}
                    className={`py-4 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-3 transition-all border ${activeMode === m.id ? 'bg-red-600 border-red-800 text-white shadow-lg' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800/50'}`}
                >
                    <m.icon className="w-4 h-4" /> {m.label}
                </button>
            ))}
        </div>

        {activeMode === 'thumbnail' && (
            <div className="mb-8 space-y-4 animate-in slide-in-from-top-2">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">Plataforma IA</label><select aria-label="Plataforma IA" className="w-full bg-slate-950 border border-red-900/40 rounded p-3 text-xs text-white outline-none focus:border-red-600" value={coverConfig.engine} onChange={e => setCoverConfig({...coverConfig, engine: e.target.value})}>{IMAGE_AIS.map(ai => <option key={ai} value={ai}>{ai}</option>)}</select><EngineLink engine={coverConfig.engine} /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">Estética</label><select aria-label="Estética" className="w-full bg-slate-950 border border-red-900/40 rounded p-3 text-xs text-white outline-none focus:border-red-600" value={coverConfig.style} onChange={e => setCoverConfig({...coverConfig, style: e.target.value})}>{imageStyles.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">Proporção</label><select aria-label="Proporção" className="w-full bg-slate-950 border border-red-900/40 rounded p-3 text-xs text-white outline-none focus:border-red-600" value={coverConfig.ratio} onChange={e => setCoverConfig({...coverConfig, ratio: e.target.value})}>{videoRatios.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block flex items-center gap-1"><Type className="w-3 h-3"/> Texto na Thumbnail</label><input aria-label="Ex: O SEGREDO DO..." type="text" className="w-full bg-slate-950 border border-red-900/40 rounded p-3 text-xs text-white outline-none focus:border-red-600" placeholder="Ex: O SEGREDO DO..." value={coverConfig.customText} onChange={e => setCoverConfig({...coverConfig, customText: e.target.value})} /></div>
                </div>
            </div>
        )}

        <div className="mb-8">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Duração</label>
            <select aria-label="Duração" className="w-full bg-slate-950 border border-red-900/40 rounded p-4 text-sm text-white outline-none focus:border-red-600" value={duration} onChange={e => setDuration(parseInt(e.target.value))}>
                {[15, 30, 45, 60, 120, 180].map(s => ( <option key={s} value={s}>{s}s (~{Math.ceil(s/60)} min)</option> ))}
            </select>
        </div>

        <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {(activeMode === 'seo' || activeMode === 'thumbnail') && hasScript ? 'Refinar via Roteiro' : 'Tópico do Vídeo / Contexto'}
                </label>
                {hasScript && activeMode !== 'script' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-red-500 font-black uppercase bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                        <Zap className="w-3 h-3" /> Fonte: Contexto Estratégico
                    </div>
                )}
            </div>
            <div className="relative">
                <textarea aria-label="Briefing: dados brutos" className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-6 text-slate-200 outline-none focus:border-red-500 transition-all resize-none text-base placeholder:text-slate-700" placeholder={hasScript && activeMode !== 'script' ? "O roteiro gerado já é a base para o SEO/Thumb. Adicione apenas tags específicas ou desejos visuais..." : "Insira os dados brutos. A IA fará o resto."} value={localBriefing} onChange={(e) => setLocalBriefing(e.target.value)}></textarea>
                <div className="absolute right-4 bottom-4 flex gap-2">
                    {sharedContext && (
                        <button onClick={handleImportGlobal} className="p-2 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                            <Brain className="w-4 h-4" />
                        </button>
                    )}
                    <SpeechInput onTranscript={(t) => setLocalBriefing(prev => prev + ' ' + t)} language={language} className="bg-slate-800 shadow-lg border-slate-700" />
                </div>
            </div>
        </div>

        <button onClick={handleGenerate} disabled={loading || (!localBriefing && !hasScript)} className="w-full bg-white hover:bg-slate-100 text-[#0f0a1e] font-black py-4 rounded transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.99] uppercase tracking-[0.1em] text-sm">
            {loading ? <RefreshCw className="animate-spin w-5 h-5 text-red-600" /> : <PlayCircle className="w-5 h-5 text-red-600" />}
            {loading ? 'Analisando Algoritmo...' : 'Executar Comando'}
        </button>
      </div>

      <div className="bg-[#0b071a] p-10 rounded-[1rem] border border-red-900/30 shadow-2xl min-h-[300px] flex flex-col items-center justify-center animate-in slide-in-from-bottom-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-5">
                <Youtube className="w-16 h-16 animate-pulse text-red-600 opacity-20" />
                <p className="text-xs font-black uppercase tracking-[0.5em] text-slate-700 animate-pulse">Aguardando comando de execução.</p>
            </div>
          ) : currentResult ? (
            <div className="w-full animate-in fade-in">
              {activeMode === 'thumbnail' && outputs.thumbnail.options.length > 1 && (
                  <div className="flex gap-2 mb-8 bg-slate-950 p-2 rounded-lg w-fit border border-slate-800">
                      {outputs.thumbnail.options.map((_, i) => (
                          <button key={i} onClick={() => setActiveThumbTab(i)} className={`px-8 py-3 rounded text-xs font-black transition-all ${activeThumbTab === i ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>ESTRUTURA {i+1}</button>
                      ))}
                  </div>
              )}
              <div className="flex items-center gap-3 mb-8"><Sparkles className="w-5 h-5 text-yellow-500" /><h3 className="text-sm font-black text-white uppercase tracking-widest">Ativo Finalizado</h3></div>
              <pre className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed bg-slate-950/50 p-8 rounded-xl border border-slate-800 mb-10 text-lg">{currentResult}</pre>
              {currentNote && (
                  <div className="p-8 bg-red-950/10 border-l-4 border-red-600 rounded-r-xl mb-10">
                      <h4 className="text-xs font-black text-red-500 flex items-center gap-2 mb-4 uppercase tracking-[0.3em]"><Wand2 className="w-5 h-5" /> Nota do Estrategista (Growth Lab Audit)</h4>
                      <div className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap font-medium font-sans">{currentNote}</div>
                  </div>
              )}
              <RefinementToolbar text={currentResult || ""} onTextUpdate={(t) => { setOutputs(prev => { const newOutputs = {...prev}; if(activeMode === 'thumbnail') { const updatedOpts = [...newOutputs.thumbnail.options]; updatedOpts[activeThumbTab] = t; newOutputs.thumbnail.options = updatedOpts; } else { newOutputs[activeMode].text = t; } return newOutputs; }); }} language={language} />
            </div>
          ) : error && !loading ? (
            <div className="w-full max-w-md bg-red-950/40 border border-red-800 rounded-xl p-4 text-left">
                <p className="text-sm font-bold text-red-300 break-words">{error}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={handleGenerate} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold">Tentar novamente</button>
                    <button onClick={() => setAppActiveTab('settings')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold">Abrir Centro de Comando</button>
                </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5"><Youtube className="w-16 h-16 text-slate-900" /><p className="text-xs font-black uppercase tracking-[0.5em] text-slate-800">Aguardando comando de execução.</p></div>
          )}
      </div>
    </div>
  );
};

export default YouTubeSuite;