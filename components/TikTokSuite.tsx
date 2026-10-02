import React, { useState, useEffect } from 'react';
import { generateTikTokService } from '../services/modules/social/tiktok';
import { Video, PlayCircle, RefreshCw, Lock, Unlock, Home, Sparkles, FileText, ShoppingBag, Search, ImageIcon, Wand2, Zap, Info, Brain, Type, Layers } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { getLocalizedLists, IMAGE_AIS } from '../constants';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { RefinementToolbar } from './RefinementToolbar';
import { SectionHelp } from './SectionHelp';
import { OutputKindBadge } from './ToolLayout';
import { EngineLink } from './ToolLayout';
import { splitVisualResult, splitNotaBlock } from '../utils/stripCopyFormat';

interface TikTokSuiteProps {
  language: string;
}

const TikTokSuite: React.FC<TikTokSuiteProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generate } = useAIGenerator();
  const [activeMode, setActiveMode] = useState<'viral_script' | 'tiktok_shop' | 'seo' | 'cover'>('viral_script');
  const { t, langCode } = useTranslation(language);
  const { imageStyles, videoRatios } = getLocalizedLists(langCode);

  const [outputs, setOutputs] = useState({
      viral_script: { text: '', note: '' },
      tiktok_shop: { text: '', note: '' },
      seo: { text: '', note: '' },
      cover: { text: '', note: '' }
  });

  const [localBriefing, setLocalBriefing] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [duration, setDuration] = useState(30);

  const [shopParams, setShopParams] = useState({
    productName: '',
    targetAudience: '',
    painPoint: '',
    keyBenefit: '',
    offerCTA: ''
  });

  const [coverConfig, setCoverConfig] = useState({ 
    engine: IMAGE_AIS[1], 
    style: imageStyles[0],
    ratio: '9:16',
    customText: ''
  });

  const tiktokHelpDescription = `
O que é o TikTok Viral Studio:
Este é o motor de crescimento mais rápido da aplicação. O algoritmo do TikTok premia a retenção absoluta. Esta ferramenta foca na "Economia da Atenção", garantindo que seu vídeo não seja ignorado nos primeiros 2 segundos.
`;

  const generatedScript = outputs.viral_script.text || outputs.tiktok_shop.text;
  const hasScript = !!generatedScript;

  const handleImportGlobal = () => {
    if (activeMode === 'tiktok_shop') {
        // Tenta parsear ou preencher campos do shopParams via IA ou contexto
        setShopParams(prev => ({ ...prev, productName: sharedContext }));
    } else {
        setLocalBriefing(sharedContext);
    }
  };

  const handleGenerate = () => {
    if(isLocked) return;

    let finalContext = localBriefing;
    
    if (activeMode === 'tiktok_shop') {
        finalContext = `
        PRODUTO: ${shopParams.productName}
        PÚBLICO: ${shopParams.targetAudience}
        DOR: ${shopParams.painPoint}
        BENEFÍCIO: ${shopParams.keyBenefit}
        OFERTA/CTA: ${shopParams.offerCTA}
        CONTEXTO ADICIONAL: ${localBriefing}
        `.trim();
    } else if ((activeMode === 'seo' || activeMode === 'cover') && hasScript) {
        finalContext = `[FONTE DE DADOS OBRIGATÓRIA - ROTEIRO GERADO]:\n${generatedScript}\n\n[INSTRUÇÕES ESPECÍFICAS DE REFINAMENTO]:\n${localBriefing}`;
    }

    generate(
      () => generateTikTokService({
        mode: activeMode,
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
        // Cover gera prompt visual: parse tolerante + limpeza (placeholders/divisores vazados).
        // Modos de texto mantêm o parse original.
        const parsed = activeMode === 'cover'
            ? splitVisualResult(text)
            : splitNotaBlock(text);
        const parts = [parsed.content, parsed.note];
        setOutputs(prev => ({
            ...prev,
            [activeMode]: {
                text: parts[0]?.trim() || '',
                note: parts[1] ? parts[1].replace(/NOTA DO ESTRATEGISTA:[\s]*/i, '').trim() : ''
            }
        }));
      }
    );
  };

  return (
    <div className="flex flex-col gap-6 pb-20 w-full animate-in fade-in duration-500">
      <div className="bg-[#0b071a] border border-fuchsia-900/30 p-8 rounded-[1rem] shadow-2xl">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <Video className="w-8 h-8 text-fuchsia-500" />
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">TikTok Viral</h2>
                <OutputKindBadge kind={activeMode === 'cover' ? 'image' : 'text'} />
                <SectionHelp title="TikTok Viral" description={tiktokHelpDescription} sessionId="tiktok" />
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => setAppActiveTab('home')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white bg-slate-900/50 border border-slate-800 transition-all"> <Home className="w-3 h-3" /> Início</button>
                <button onClick={() => setIsLocked(!isLocked)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black border transition-all ${isLocked ? 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/50' : 'bg-slate-900/50 border-slate-700 text-slate-400'}`}>
                    {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />} {isLocked ? "LOCK" : "LIVRE"}
                </button>
            </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-8">
            {[ {id: 'viral_script', label: 'Roteiro Viral', icon: FileText}, {id: 'tiktok_shop', label: 'Venda Direta', icon: ShoppingBag}, {id: 'seo', label: '# SEO', icon: Search}, {id: 'cover', label: 'Capa', icon: ImageIcon} ].map(m => (
                <button key={m.id} onClick={() => setActiveMode(m.id as any)} className={`py-4 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-3 transition-all border ${activeMode === m.id ? 'bg-fuchsia-600 border-fuchsia-800 text-white shadow-lg' : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-800/50'}`} > <m.icon className="w-4 h-4" /> {m.label} </button>
            ))}
        </div>
        
        {(activeMode === 'viral_script' || activeMode === 'tiktok_shop') && (
            <div className="mb-8 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block ml-1">Duração do Vídeo</label>
                <select aria-label="Duração do Vídeo" className="w-full bg-slate-950 border border-fuchsia-900/40 rounded p-4 text-sm text-white outline-none focus:border-fuchsia-500" value={duration} onChange={e => setDuration(parseInt(e.target.value))}>
                    {[15, 30, 45, 60].map(s => ( <option key={s} value={s}>{s} segundos</option> ))}
                </select>
            </div>
        )}

        {activeMode === 'tiktok_shop' && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                <div className="space-y-4">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">{t('tk_shop_name')}</label><input aria-label={t('tk_shop_name')} className="w-full bg-slate-950 border border-fuchsia-900/40 rounded p-3 text-xs text-white outline-none focus:border-fuchsia-500" value={shopParams.productName} onChange={e => setShopParams({...shopParams, productName: e.target.value})} placeholder="Nome do produto ou serviço" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">{t('tk_shop_audience')}</label><input aria-label="Para quem é este vídeo?" className="w-full bg-slate-950 border border-fuchsia-900/40 rounded p-3 text-xs text-white outline-none focus:border-fuchsia-500" value={shopParams.targetAudience} onChange={e => setShopParams({...shopParams, targetAudience: e.target.value})} placeholder="Para quem é este vídeo?" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">{t('tk_shop_pain')}</label><input aria-label="Qual dor este produto resolve?" className="w-full bg-slate-950 border border-fuchsia-900/40 rounded p-3 text-xs text-white outline-none focus:border-fuchsia-500" value={shopParams.painPoint} onChange={e => setShopParams({...shopParams, painPoint: e.target.value})} placeholder="Qual dor este produto resolve?" /></div>
                </div>
                <div className="space-y-4">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">{t('tk_shop_benefit')}</label><input aria-label="Principal diferencial/benefício" className="w-full bg-slate-950 border border-fuchsia-900/40 rounded p-3 text-xs text-white outline-none focus:border-fuchsia-500" value={shopParams.keyBenefit} onChange={e => setShopParams({...shopParams, keyBenefit: e.target.value})} placeholder="Principal diferencial/benefício" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">{t('tk_shop_offer')}</label><textarea aria-label="Link, Cupom ou CTA final" className="w-full h-[116px] bg-slate-950 border border-fuchsia-900/40 rounded p-3 text-xs text-white outline-none focus:border-fuchsia-500 resize-none" value={shopParams.offerCTA} onChange={e => setShopParams({...shopParams, offerCTA: e.target.value})} placeholder="Link, Cupom ou CTA final"></textarea></div>
                </div>
            </div>
        )}

        {activeMode === 'cover' && (
            <div className="mb-8 space-y-4 animate-in slide-in-from-top-2 bg-slate-950/40 p-6 rounded-xl border border-fuchsia-500/10">
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">Plataforma IA</label><select aria-label="Plataforma IA" className="w-full bg-slate-950 border border-fuchsia-900/40 rounded p-3 text-xs text-white outline-none focus:border-fuchsia-600" value={coverConfig.engine} onChange={e => setCoverConfig({...coverConfig, engine: e.target.value})}>{IMAGE_AIS.map(ai => <option key={ai} value={ai}>{ai}</option>)}</select><EngineLink engine={coverConfig.engine} /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">Estética</label><select aria-label="Estética" className="w-full bg-slate-950 border border-fuchsia-900/40 rounded p-3 text-xs text-white outline-none focus:border-fuchsia-600" value={coverConfig.style} onChange={e => setCoverConfig({...coverConfig, style: e.target.value})}>{imageStyles.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block">Proporção</label><select aria-label="Proporção" className="w-full bg-slate-950 border border-fuchsia-900/40 rounded p-3 text-xs text-white outline-none focus:border-fuchsia-600" value={coverConfig.ratio} onChange={e => setCoverConfig({...coverConfig, ratio: e.target.value})}>{videoRatios.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase ml-1 mb-2 block flex items-center gap-1"><Type className="w-3 h-3"/> Texto de Gancho</label><input aria-label="Frase impactante na capa" type="text" className="w-full bg-slate-950 border border-fuchsia-900/40 rounded p-3 text-xs text-white outline-none focus:border-fuchsia-600" placeholder="Frase impactante na capa" value={coverConfig.customText} onChange={e => setCoverConfig({...coverConfig, customText: e.target.value})} /></div>
                </div>
            </div>
        )}

        <div className="mb-8">
            <div className="flex justify-between items-center mb-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                    {(activeMode === 'seo' || activeMode === 'cover') && hasScript ? 'Refinar via Roteiro' : activeMode === 'tiktok_shop' ? 'Contexto do Vídeo (Cenário/Vibe)' : 'Sobre o que é o vídeo?'}
                </label>
                {hasScript && (activeMode === 'seo' || activeMode === 'cover') && (
                    <div className="flex items-center gap-1.5 text-[10px] text-fuchsia-400 font-black uppercase bg-fuchsia-500/10 px-2 py-1 rounded border border-fuchsia-500/20">
                        <Zap className="w-3 h-3" /> Fonte: Contexto Estratégico
                    </div>
                )}
            </div>
            <div className="relative">
                <textarea aria-label="Briefing: dados brutos" className="w-full h-24 bg-slate-950 border border-slate-800 rounded-lg p-6 text-slate-200 outline-none focus:border-fuchsia-500 transition-all resize-none text-base placeholder:text-slate-700" placeholder={(activeMode === 'seo' || activeMode === 'cover') && hasScript ? "O roteiro gerado já é a base. Adicione apenas detalhes visuais ou keywords extras..." : "Insira os dados brutos. A IA fará o resto."} value={localBriefing} onChange={(e) => setLocalBriefing(e.target.value)}></textarea>
                <div className="absolute right-4 bottom-4 flex gap-2">
                    {sharedContext && (
                        <button onClick={handleImportGlobal} className="p-2 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                            <Brain className="w-4 h-4" />
                        </button>
                    )}
                    <SpeechInput onTranscript={(t) => setLocalBriefing(prev => prev + ' ' + t)} language={language} className="bg-slate-800 shadow-lg border-slate-700" />
                </div>
            </div>
        </div>

        <button onClick={handleGenerate} disabled={loading || (activeMode === 'tiktok_shop' ? !shopParams.productName : (!localBriefing && !hasScript && !shopParams.productName))} className="w-full bg-white hover:bg-slate-100 text-[#0f0a1e] font-black py-4 rounded transition-all shadow-xl flex items-center justify-center gap-3 active:scale-[0.99] uppercase tracking-[0.1em] text-sm">
            {loading ? <RefreshCw className="animate-spin w-5 h-5 text-fuchsia-600" /> : <PlayCircle className="w-5 h-5 text-fuchsia-600" />}
            {loading ? 'Analisando Nicho...' : 'Gerar'}
        </button>
      </div>

      <div className="bg-[#0b071a] p-10 rounded-[1rem] border border-fuchsia-900/30 shadow-2xl min-h-[300px] flex flex-col items-center justify-center animate-in slide-in-from-bottom-6">
          {loading ? (
              <div className="flex flex-col items-center gap-5">
                  <Video className="w-16 h-16 animate-pulse text-fuchsia-500 opacity-20" />
                  <p className="text-xs font-black uppercase tracking-[0.5em] text-slate-700 animate-pulse">Codificando Atração...</p>
              </div>
          ) : outputs[activeMode].text ? (
              <div className="w-full animate-in fade-in">
                <div className="flex items-center gap-3 mb-8"><Sparkles className="w-5 h-5 text-yellow-500" /><h3 className="text-sm font-black text-white uppercase tracking-widest">Ativo Finalizado</h3></div>
                <pre className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed bg-slate-950/50 p-8 rounded-xl border border-slate-800 mb-10 text-lg">{outputs[activeMode].text}</pre>
                {outputs[activeMode].note && (
                    <div className="p-8 bg-fuchsia-950/10 border-l-4 border-fuchsia-600 rounded-r-xl mb-10 shadow-inner"><h4 className="text-xs font-black text-fuchsia-500 flex items-center gap-2 mb-4 uppercase tracking-[0.3em]"><Wand2 className="w-5 h-5" /> Nota do Estrategista (Auditoria de Performance)</h4><div className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap font-medium italic">{outputs[activeMode].note}</div></div>
                )}
                <RefinementToolbar text={outputs[activeMode].text || ""} onTextUpdate={(t) => setOutputs(prev => ({...prev, [activeMode]: {...prev[activeMode], text: t}}))} language={language} />
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
            <div className="flex flex-col items-center gap-5"><Video className="w-16 h-16 text-slate-900" /><p className="text-xs font-black uppercase tracking-[0.5em] text-slate-800">Aguardando comando de execução.</p></div>
          )}
      </div>
    </div>
  );
};

export default TikTokSuite;