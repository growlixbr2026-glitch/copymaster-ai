import React, { useState, useEffect, useMemo } from 'react';
import { IMAGE_AIS, VIDEO_AIS, getLocalizedLists, TTS_PLATFORMS, TTS_DURATION_OPTIONS, estimateWordsForDuration, getVoicesFor } from '../constants';
import { generateImagePromptService, generateVideoPromptService, generateAudioScriptService, generateSunoPromptService } from '../services/geminiService';
import { ReferenceMode } from '../types';
import { downloadPDF } from '../services/pdfService';
import { Image, Video, Mic, Wand2, Link2, Sparkles, CheckCircle2, Download, AlertCircle, RefreshCw, Music, Upload, Trash2, Home, Headphones, Radio, Brain, Type, Share2, Layers } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import TextToSpeech from './TextToSpeech';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { resizeImage } from '../utils/imageUtils';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { SectionHelp } from './SectionHelp';
import { splitVisualResult, stripVisualPrompt } from '../utils/stripCopyFormat';
import { OutputKindBadge } from './ToolLayout';
import { EngineLink } from './ToolLayout';

interface MediaPromptsProps {
  language: string;
}

const MediaPrompts: React.FC<MediaPromptsProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'audio' | 'music'>('image');
  const [result, setResult] = useState({ content: '', note: '' });
  const [videoScenes, setVideoScenes] = useState<string[]>([]);
  const [activeVideoScene, setActiveVideoScene] = useState(0);

  const { t, langCode } = useTranslation(language);
  const { imageStyles, videoRatios, videoStyles, sunoStyles, sunoMoods, socialPlatforms } = getLocalizedLists(langCode);
  
  const [refImages, setRefImages] = useState<string[]>([]);
  const [refMode, setRefMode] = useState<ReferenceMode>('creative');

  const [localContext, setLocalContext] = useState('');

  const [imgParams, setImgParams] = useState({ 
    ai: IMAGE_AIS[1], 
    style: imageStyles[0], 
    ratio: '16:9', 
    text: '', 
    footer: '', 
    platform: socialPlatforms[0] 
  });

  const [vidParams, setVidParams] = useState({ 
    ai: VIDEO_AIS[1], 
    duration: '5s', 
    ratio: videoRatios[1], 
    style: videoStyles[0], 
    sceneCount: 1, 
    text: '', 
    platform: socialPlatforms[0] 
  });

  const [audParams, setAudParams] = useState({ provider: TTS_PLATFORMS[0].id, voice: 'auto', model: TTS_PLATFORMS[0].models[0]?.id || '', duration: 30 });
  const [musParams, setMusParams] = useState({ mode: 'Hit Completo', style: sunoStyles[0], mood: sunoMoods[0] });

  const audPlatform = useMemo(() => TTS_PLATFORMS.find(p => p.id === audParams.provider) || TTS_PLATFORMS[0], [audParams.provider]);
  const audVoices = useMemo(() => getVoicesFor(audPlatform, audParams.model), [audPlatform, audParams.model]);
  const audWords = estimateWordsForDuration(audParams.duration);

  const handleAudProvider = (id: string) => {
    const p = TTS_PLATFORMS.find(x => x.id === id) || TTS_PLATFORMS[0];
    setAudParams(a => ({ ...a, provider: p.id, model: p.models[0]?.id || '', voice: 'auto' }));
  };
  const handleAudModel = (id: string) => {
    setAudParams(a => ({ ...a, model: id, voice: getVoicesFor(audPlatform, id).some(v => v.id === a.voice) ? a.voice : 'auto' }));
  };

  const placeholderText = useMemo(() => {
    switch(activeTab) {
      case 'image': return 'Descreva a cena, personagens e emoções para a imagem...';
      case 'video': return 'Qual é a história ou conceito para o seu vídeo?';
      case 'audio': return 'Digite o texto para narração ou o tema para um roteiro de áudio...';
      case 'music': return 'Descreva o tema da música, a história, um refrão ou o sentimento desejado...';
      default: return 'Descreva a cena ou o sentimento...';
    }
  }, [activeTab]);

  const mediaHelpDescription = `
O que é a Engenharia Visual & Mídia IA:
Esta ferramenta é o laboratório avançado para criar comandos (prompts) que extraem o máximo de qualidade de IAs geradoras de imagem, vídeo, áudio e música.

Como usar:
1. Aba de Destino: Selecione Imagem, Vídeo, Áudio ou Música.
2. Configuração: Ajuste proporção, estilo, rede social e rodapé.
3. Conceito: Descreva a cena. A nota do estrategista ao final detalhará todos os parâmetros aplicados.
`;

  const handleImportGlobal = () => {
    setLocalContext(sharedContext);
  };

  const handleGenerate = () => {
    if (!localContext) return;
    setResult({ content: '', note: '' }); setVideoScenes([]);

    let serviceCall;
    switch(activeTab) {
        case 'image':
            serviceCall = (chunk: any) => generateImagePromptService({ 
              ...imgParams, 
              aiModel: imgParams.ai, 
              aspectRatio: imgParams.ratio, 
              customText: imgParams.text, 
              footer: imgParams.footer,
              platform: imgParams.platform,
              context: localContext, 
              referenceImages: refImages, 
              referenceMode: refImages.length > 0 ? refMode : 'none', 
              language 
            }, chunk);
            break;
        case 'video':
            serviceCall = (chunk: any) => generateVideoPromptService({ 
              ...vidParams, 
              aiModel: vidParams.ai, 
              aspectRatio: vidParams.ratio, 
              customText: vidParams.text, 
              platform: vidParams.platform,
              sceneCount: vidParams.sceneCount,
              context: localContext, 
              referenceImages: refImages, 
              referenceMode: refImages.length > 0 ? refMode : 'none', 
              language 
            }, chunk);
            break;
        case 'audio':
            serviceCall = (chunk: any) => generateAudioScriptService({ ...audParams, context: localContext, language }, chunk);
            break;
        case 'music':
            serviceCall = (chunk: any) => generateSunoPromptService({ ...musParams, context: localContext, language }, chunk);
            break;
    }

    if (!serviceCall) return;

    generateStream(
      serviceCall,
      (streamedText) => {
        const { content: mainContent, note: noteText } = splitVisualResult(streamedText);

        if (activeTab === 'video') {
            const scenes = mainContent.split('|||SCENE_DIVIDER|||').map(s => stripVisualPrompt(s)).filter(s => s.length > 0);
            if (scenes.length > 0) setVideoScenes(scenes);
        }

        // Áudio: mostra o COMANDO COMPLETO (config JSON + divisor + roteiro) — a
        // configuração da plataforma é metade do entregável (contrato §4 sessão 23).
        const displayContent = activeTab === 'audio' ? mainContent : mainContent.split('|||CONFIG_END|||').pop()?.trim() || mainContent;
        setResult({ content: displayContent, note: noteText });
      }
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const resized = await Promise.all(files.map((f: File) => resizeImage(f, 1024)));
      setRefImages(prev => [...prev, ...resized]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-y-auto custom-scrollbar">
      {/* SIDEBAR DE ABAS */}
      <div className="lg:col-span-3 flex lg:flex-col gap-2">
        <button onClick={() => setActiveTab('image')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTab === 'image' ? 'bg-pink-600 text-white border-pink-500 shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>
            <Image className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">{t('media_tab_img')}</span>
        </button>
        <button onClick={() => setActiveTab('video')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTab === 'video' ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>
            <Video className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">{t('media_tab_vid')}</span>
        </button>
        <button onClick={() => setActiveTab('audio')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTab === 'audio' ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>
            <Headphones className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">{t('media_tab_aud')}</span>
        </button>
        <button onClick={() => setActiveTab('music')} className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${activeTab === 'music' ? 'bg-purple-600 text-white border-purple-500 shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}>
            <Music className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">{t('media_tab_mus')}</span>
        </button>
        <button onClick={() => setAppActiveTab('home')} className="mt-auto p-4 rounded-xl border border-slate-800 text-slate-400 hover:text-white flex flex-col items-center gap-2 bg-slate-900/50">
            <Home className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">Início</span>
        </button>
      </div>

      {/* ÁREA DE CONFIGURAÇÃO E RESULTADO */}
      <div className="lg:col-span-9 flex flex-col h-full mb-10">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-6 shadow-xl">
            <div className="flex items-center gap-2 mb-6">
                <Sparkles className={`w-5 h-5 ${activeTab === 'image' ? 'text-pink-400' : activeTab === 'video' ? 'text-blue-400' : activeTab === 'audio' ? 'text-emerald-400' : 'text-purple-400'}`} />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Configuração de {activeTab.toUpperCase()}</h3>
                <OutputKindBadge kind={activeTab === 'image' || activeTab === 'video' ? 'image' : 'text'} />
                <SectionHelp title={t('nav_media')} description={mediaHelpDescription} />
            </div>

            {activeTab === 'image' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Modelo IA</label><select aria-label="Modelo IA" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-pink-500" value={imgParams.ai} onChange={e => setImgParams({...imgParams, ai: e.target.value})}>{IMAGE_AIS.map(ai => <option key={ai} value={ai}>{ai}</option>)}</select><EngineLink engine={imgParams.ai} /></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Rede Social / Destino</label><select aria-label="Rede Social / Destino" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-pink-500" value={imgParams.platform} onChange={e => setImgParams({...imgParams, platform: e.target.value})}>{socialPlatforms.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Estética</label><select aria-label="Estética" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-pink-500" value={imgParams.style} onChange={e => setImgParams({...imgParams, style: e.target.value})}>{imageStyles.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Proporção</label><select aria-label="Proporção" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-pink-500" value={imgParams.ratio} onChange={e => setImgParams({...imgParams, ratio: e.target.value})}>{videoRatios.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1 flex items-center gap-1"><Type className="w-3 h-3"/> Texto na Imagem</label><input aria-label="Texto na Imagem" type="text" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-pink-500" placeholder="Ex: NOME DA MARCA" value={imgParams.text} onChange={e => setImgParams({...imgParams, text: e.target.value})} /></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1 flex items-center gap-1"><Layers className="w-3 h-3"/> Rodapé / Data</label><input aria-label="Ex: JAN 2025" type="text" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-pink-500" placeholder="Ex: JAN 2025" value={imgParams.footer} onChange={e => setImgParams({...imgParams, footer: e.target.value})} /></div>
                    </div>
                </div>
            )}

            {activeTab === 'video' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Motor Vídeo</label><select aria-label="Motor Vídeo" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-blue-500" value={vidParams.ai} onChange={e => setVidParams({...vidParams, ai: e.target.value})}>{VIDEO_AIS.map(ai => <option key={ai} value={ai}>{ai}</option>)}</select></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Rede Social</label><select aria-label="Rede Social" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-blue-500" value={vidParams.platform} onChange={e => setVidParams({...vidParams, platform: e.target.value})}>{socialPlatforms.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Proporção</label><select aria-label="Proporção" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-blue-500" value={vidParams.ratio} onChange={e => setVidParams({...vidParams, ratio: e.target.value})}>{videoRatios.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Duração</label><select aria-label="Duração" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-blue-500" value={vidParams.duration} onChange={e => setVidParams({...vidParams, duration: e.target.value})}><option value="5s">5 Segundos</option><option value="10s">10 Segundos</option></select></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Cenas</label><select aria-label="Cenas" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-blue-500" value={vidParams.sceneCount} onChange={e => setVidParams({...vidParams, sceneCount: parseInt(e.target.value)})}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Cena(s)</option>)}</select></div>
                    </div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Estética</label><select aria-label="Estética" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-blue-500" value={vidParams.style} onChange={e => setVidParams({...vidParams, style: e.target.value})}>{videoStyles.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                </div>
            )}

            {activeTab === 'audio' && (
                <div className="space-y-4 mb-4 animate-in fade-in slide-in-from-top-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Provedor</label><select aria-label="Provedor" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-emerald-500" value={audParams.provider} onChange={e => handleAudProvider(e.target.value)}>{TTS_PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Voz</label><select aria-label="Voz" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-emerald-500" value={audParams.voice} onChange={e => setAudParams({...audParams, voice: e.target.value})}>{audVoices.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Modelo</label><select aria-label="Modelo" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-emerald-500" value={audParams.model} onChange={e => handleAudModel(e.target.value)}>{audPlatform.models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></div>
                        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Duração</label><select aria-label="Duração" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-emerald-500" value={audParams.duration} onChange={e => setAudParams({...audParams, duration: parseInt(e.target.value)})}>{TTS_DURATION_OPTIONS.map(s => <option key={s} value={s}>{s} segundos</option>)}</select></div>
                    </div>
                    <p className="text-[10px] text-emerald-400/90 ml-1 -mt-1">⏱ Roteiro de <strong>{audParams.duration}s ≈ {audWords} palavras</strong> (ritmo natural PT-BR ≈ 156 ppm) — a meta sai no prompt gerado.</p>
                </div>
            )}

            {activeTab === 'music' && (
                <div className="grid grid-cols-2 gap-4 mb-4 animate-in fade-in slide-in-from-top-1">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Gênero</label><select aria-label="Gênero" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-purple-500" value={musParams.style} onChange={e => setMusParams({...musParams, style: e.target.value})}>{sunoStyles.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Mood</label><select aria-label="Mood" className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-purple-500" value={musParams.mood} onChange={e => setMusParams({...musParams, mood: e.target.value})}>{sunoMoods.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                </div>
            )}

            <div className="mt-6 mb-4 relative">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block ml-1">Contexto Estratégico (Conceito)</label>
                    {sharedContext && (
                        <button onClick={handleImportGlobal} className="text-[9px] flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white text-indigo-400 px-2 py-1 rounded border border-indigo-500/30 transition-all font-black uppercase" title="Importar do Cérebro Central">
                            <Brain className="w-3 h-3" /> Puxar Contexto Global
                        </button>
                    )}
                </div>
                <textarea aria-label="Contexto para geração" className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-200 resize-none outline-none focus:border-indigo-500 transition-all" placeholder={placeholderText} value={localContext} onChange={e => setLocalContext(e.target.value)}></textarea>
            </div>

            <button onClick={handleGenerate} disabled={loading || !localContext} className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.98] ${activeTab === 'image' ? 'bg-pink-600 hover:bg-pink-500' : activeTab === 'video' ? 'bg-blue-600 hover:bg-blue-500' : activeTab === 'audio' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-purple-600 hover:bg-purple-500'} text-white`}>
                {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />} 
                {loading ? 'Processando Inteligência...' : `Gerar ${activeTab.toUpperCase()}`}
            </button>
        </div>

        {/* ÁREA DE RESULTADO FINAL */}
        <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col relative min-h-[400px] shadow-2xl animate-in slide-in-from-bottom-4 overflow-hidden">
            {result.content || loading ? (
                <>
                  <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-8">
                      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-4">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Comando Gerado (Active Protocol)</span>
                      </div>
                      
                      <pre className={`whitespace-pre-wrap font-sans text-lg leading-relaxed ${activeTab === 'image' || activeTab === 'video' ? 'text-pink-300 font-mono text-sm' : 'text-slate-200'}`}>
                          {videoScenes.length > 0 ? videoScenes[activeVideoScene] : result.content}
                          {loading && !result.content && <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1 align-middle"></span>}
                      </pre>
                      
                      {result.note && ( 
                          <div className="mt-12 p-6 bg-slate-900/80 border-l-4 border-yellow-500 rounded-r-lg text-sm italic text-slate-400 leading-relaxed shadow-lg">
                              <div className="flex items-center gap-2 mb-2 text-yellow-500 not-italic font-black uppercase text-[10px] tracking-widest">
                                  <Wand2 className="w-3 h-3" /> Nota do Estrategista
                              </div>
                              <div className="whitespace-pre-wrap font-medium font-sans">{result.note}</div>
                          </div>
                      )}
                  </div>
                  
                  <div className="p-6 border-t border-slate-800 flex gap-3 bg-slate-900/20">
                      <button onClick={() => downloadPDF(`Media_${activeTab}`, result.content)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-lg text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                          <Download className="w-4 h-4" /> PDF
                      </button>
                      <button onClick={() => navigator.clipboard.writeText(videoScenes.length > 0 ? videoScenes[activeVideoScene] : result.content)} className={`flex-[2] py-3 rounded-lg text-xs font-black text-white flex items-center justify-center gap-2 uppercase tracking-widest transition-all shadow-lg ${activeTab === 'image' ? 'bg-pink-600' : activeTab === 'video' ? 'bg-blue-600' : activeTab === 'audio' ? 'bg-emerald-600' : 'bg-purple-600'}`}>
                          <CheckCircle2 className="w-4 h-4"/> Copiar Ativo
                      </button>
                  </div>
                </>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-800 p-10 text-center">
                    <Sparkles className="w-16 h-16 mb-4 opacity-5" />
                    <p className="text-xs font-black uppercase tracking-[0.3em]">Aguardando parametrização visual...</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default MediaPrompts;