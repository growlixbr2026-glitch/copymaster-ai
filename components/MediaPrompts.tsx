import React, { useState, useEffect, useMemo } from 'react';
import { IMAGE_AIS, VIDEO_AIS, getLocalizedLists, TTS_PLATFORMS, TTS_DURATION_OPTIONS, estimateWordsForDuration, getVoicesFor } from '../constants';
import { generateImagePromptService, generateVideoPromptService, generateAudioScriptService, generateSunoPromptService, CONFIG_END_DIVIDER } from '../services/geminiService';
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
import { ImageTab } from './media/ImageTab';
import { VideoTab } from './media/VideoTab';
import { AudioTab } from './media/AudioTab';
import { MusicTab } from './media/MusicTab';

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
    setAudParams(prev => {
      const platform = TTS_PLATFORMS.find(p => p.id === prev.provider) || TTS_PLATFORMS[0];
      return { 
        ...prev, 
        model: id, 
        voice: getVoicesFor(platform, id).some(v => v.id === prev.voice) ? prev.voice : 'auto' 
      };
    });
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
        const displayContent = activeTab === 'audio' ? mainContent : mainContent.split(CONFIG_END_DIVIDER).pop()?.trim() || mainContent;
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

  // Cores das tabs para o botão de gerar
  const tabColors = {
    image: 'bg-pink-600 hover:bg-pink-500',
    video: 'bg-blue-600 hover:bg-blue-500',
    audio: 'bg-emerald-600 hover:bg-emerald-500',
    music: 'bg-purple-600 hover:bg-purple-500'
  };

  // Cores dos ícones da sidebar
  const tabIconColors = {
    image: 'bg-pink-600 text-white border-pink-500 shadow-lg',
    video: 'bg-blue-600 text-white border-blue-500 shadow-lg',
    audio: 'bg-emerald-600 text-white border-emerald-500 shadow-lg',
    music: 'bg-purple-600 text-white border-purple-500 shadow-lg'
  };

  // Cores do ícone do header
  const headerIconColors = {
    image: 'text-pink-400',
    video: 'text-blue-400',
    audio: 'text-emerald-400',
    music: 'text-purple-400'
  };

  // Ícones das tabs
  const tabIcons = {
    image: <Image className="w-6 h-6" />,
    video: <Video className="w-6 h-6" />,
    audio: <Headphones className="w-6 h-6" />,
    music: <Music className="w-6 h-6" />
  };

  // Labels das tabs
  const tabLabels = {
    image: t('media_tab_img'),
    video: t('media_tab_vid'),
    audio: t('media_tab_aud'),
    music: t('media_tab_mus')
  };

  // Sparkle color for header
  const sparkleColor = headerIconColors[activeTab];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-y-auto custom-scrollbar">
      {/* SIDEBAR DE ABAS */}
      <div className="lg:col-span-3 flex lg:flex-col gap-2">
        {(['image', 'video', 'audio', 'music'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
              activeTab === tab ? tabIconColors[tab] : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {tabIcons[tab]}
            <span className="text-xs font-bold uppercase">{tabLabels[tab]}</span>
          </button>
        ))}
        <button onClick={() => setAppActiveTab('home')} className="mt-auto p-4 rounded-xl border border-slate-800 text-slate-400 hover:text-white flex flex-col items-center gap-2 bg-slate-900/50">
            <Home className="w-6 h-6" />
            <span className="text-xs font-bold uppercase">Início</span>
        </button>
      </div>

      {/* ÁREA DE CONFIGURAÇÃO E RESULTADO */}
      <div className="lg:col-span-9 flex flex-col h-full mb-10">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl mb-6 shadow-xl">
            <div className="flex items-center gap-2 mb-6">
                <Sparkles className={`w-5 h-5 ${sparkleColor}`} />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Configuração de {activeTab.toUpperCase()}</h3>
                <OutputKindBadge kind={activeTab === 'image' || activeTab === 'video' ? 'image' : 'text'} />
                <SectionHelp title={t('nav_media')} description={mediaHelpDescription} />
            </div>

            {activeTab === 'image' && (
              <ImageTab
                language={language}
                imgParams={imgParams}
                setImgParams={setImgParams}
                socialPlatforms={socialPlatforms}
                imageStyles={imageStyles}
                videoRatios={videoRatios}
              />
            )}

            {activeTab === 'video' && (
              <VideoTab
                language={language}
                vidParams={vidParams}
                setVidParams={setVidParams}
                socialPlatforms={socialPlatforms}
                videoRatios={videoRatios}
                videoStyles={videoStyles}
              />
            )}

            {activeTab === 'audio' && (
              <AudioTab
                language={language}
                audParams={audParams}
                setAudParams={setAudParams}
                audPlatform={audPlatform}
                audVoices={audVoices}
                audWords={audWords}
                handleAudProvider={handleAudProvider}
                handleAudModel={handleAudModel}
              />
            )}

            {activeTab === 'music' && (
              <MusicTab
                language={language}
                musParams={musParams}
                setMusParams={setMusParams}
                sunoStyles={sunoStyles}
                sunoMoods={sunoMoods}
              />
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

            <button onClick={handleGenerate} disabled={loading || !localContext} className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.98] ${tabColors[activeTab]} text-white`}>
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
                      <button onClick={() => navigator.clipboard.writeText(videoScenes.length > 0 ? videoScenes[activeVideoScene] : result.content)} className={`flex-[2] py-3 rounded-lg text-xs font-black text-white flex items-center justify-center gap-2 uppercase tracking-widest transition-all shadow-lg ${tabColors[activeTab]}`}>
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