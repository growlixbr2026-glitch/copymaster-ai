import React, { useState, useEffect, useMemo } from 'react';
import { getLocalizedLists, IMAGE_AIS } from '../constants';
import { generateCitationService, CITATION_DIVIDER } from '../services/geminiService';
import { verifyCitationService, CitationCheck, fuzzyAuthorMatch } from '../services/modules/social/citationVerify';
import { resolvePinterestRef, PinRef } from '../services/pinterestRef';
import { analyzeModelImage, analyzeModelLocal, ModelDna } from '../services/vision/modelDna';
import { downloadPDF } from '../services/pdfService';
import { Quote, Wand2, Link2, ImageIcon, RefreshCw, Brain, ShieldCheck, ShieldAlert, ShieldX, Languages, Upload, Trash2, ChevronDown, Pin } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import SpeechInput from './SpeechInput';
import TextToSpeech from './TextToSpeech';
import { useSharedContext } from '../contexts/SharedContext';
import { ToolLayout } from './ToolLayout';
import { EngineLink } from './ToolLayout';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { SectionHelp } from './SectionHelp';
import { splitVisualResult, splitOptions } from '../utils/stripCopyFormat';
import { getAuthorsByArea, CITATION_AREA_IDS } from '../data/citations';

interface CitationGeneratorProps { language: string; }

const extractCandidate = (block: string): { quote: string; author: string; work: string } => {
  const m = block.match(/[""]([^""]{10,400})[""]/) || block.match(/"([^"\n]{10,400})"/);
  const quote = (m?.[1] || block.split('\n')[0] || '').slice(0, 400);
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  const attr = lines.find((l) => /—|–|-/.test(l) && /[A-ZÃÕÇÉÍÓÚÂÊÔ]{3,}/.test(l)) || lines[1] || '';
  const parts = attr.split(/—|–|-/).map((s) => s.trim()).filter(Boolean);
  return { quote, author: parts[0] || '', work: parts.slice(1).join(' ') || '' };
};

const CitationGenerator: React.FC<CitationGeneratorProps> = ({ language }) => {
  const { sharedContext } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  const [citations, setCitations] = useState<string[]>([]);
  const [checks, setChecks] = useState<CitationCheck[]>([]);
  const [note, setNote] = useState('');
  const [active, setActive] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const { t, langCode } = useTranslation(language);

  const [localTopic, setLocalTopic] = useState('');
  const { quoteStyles, socialPlatforms, videoRatios, citationAreas, citationTones, citationSources } = getLocalizedLists(langCode) as any;

  const [areaId, setAreaId] = useState('auto');
  const [author, setAuthor] = useState('auto');
  const [showAuthor, setShowAuthor] = useState(true);
  const [modelMode, setModelMode] = useState<'none' | 'link' | 'upload' | 'preset'>('none');
  const [modelLink, setModelLink] = useState('');
  const [modelRef, setModelRef] = useState<PinRef | null>(null);
  const [modelImage, setModelImage] = useState('');
  const [modelDna, setModelDna] = useState<ModelDna | null>(null);
  const [dnaSource, setDnaSource] = useState<'local' | 'vision' | null>(null);
  const [modelBusy, setModelBusy] = useState(false);
  const [modelError, setModelError] = useState('');
  const [showDna, setShowDna] = useState(false);
  const [tone, setTone] = useState(citationTones?.[0] || 'auto');
  const [source, setSource] = useState(citationSources?.[0] || 'auto');
  const [params, setParams] = useState({
    count: 3, style: quoteStyles[0], aiModel: IMAGE_AIS[0],
    aspectRatio: videoRatios[0], platform: socialPlatforms[0], footer: '',
  });

  const areaIndex = CITATION_AREA_IDS.indexOf(areaId);
  const areaLabel = (citationAreas as string[])?.[areaIndex >= 0 ? areaIndex : 0] || areaId;
  // Nomes únicos: mesmo autor pode estar em 2 áreas (ex.: Walt Disney) e
  // key={nome} duplicada faz o React descartar options (bug real de UI).
  const authorNames = useMemo(() => [...new Set(getAuthorsByArea(areaId).map((a) => a.name))], [areaId]);
  const autoAuthorLabel = `✨ Automático (IA Escolhe)`;

  useEffect(() => {
    setParams((p) => ({ ...p, style: quoteStyles[0], aspectRatio: videoRatios[0], platform: socialPlatforms[0] }));
    setTone(citationTones?.[0]); setSource(citationSources?.[0]);
  }, [langCode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (author !== 'auto' && !authorNames.includes(author)) setAuthor('auto');
  }, [areaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImportGlobal = () => { setLocalTopic(sharedContext); };

  const isGeminiProvider = () => { try { return (localStorage.getItem('primary_prompt_provider') || 'openrouter') === 'gemini'; } catch { return false; } };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onloadend = () => { if (reader.result) { setModelImage(reader.result as string); setModelRef(null); setModelDna(null); setDnaSource(null); setModelError(''); } };
    reader.readAsDataURL(f);
  };

  const handleResolveLink = async () => {
    setModelError(''); setModelBusy(true);
    try {
      const r = await resolvePinterestRef(modelLink, isGeminiProvider());
      if (r.ref) {
        setModelRef(r.ref);
        if (r.ref.imageBase64) setModelImage(r.ref.imageBase64);
        else setModelImage('');
        setModelDna(null); setDnaSource(null);
      } else { setModelError(r.hint ? `${r.error} ${r.hint}` : (r.error || 'Falha.')); }
    } finally { setModelBusy(false); }
  };

  // Nível local SEMPRE (canvas, sem chave); refinamento por visão só com Gemini.
  // Gerar nunca bloqueia por falta de Gemini: sem DNA, o serviço usa preset+link.
  const handleAnalyze = async (deep = false) => {
    if (!modelImage) return;
    setModelError(''); setModelBusy(true);
    try {
      if (!deep) {
        const a = await analyzeModelLocal(modelImage);
        if (a.dna) { setModelDna(a.dna); setDnaSource('local'); setShowDna(true); }
        else setModelError(a.error || 'Análise vazia.');
        return;
      }
      const v = await analyzeModelImage(modelImage);
      if (v.dna) { setModelDna(v.dna); setDnaSource('vision'); setShowDna(true); }
      else setModelError(v.error || 'Análise vazia. O DNA local continua valendo.');
    } finally { setModelBusy(false); }
  };

  const sealFor = (i: number) => checks.find((c) => c.index === i);

  const getPromptProvider = () => { try { return localStorage.getItem('primary_prompt_provider') || 'openrouter'; } catch { return 'openrouter'; } };

  const handleGenerate = async () => {
    setCitations([]); setNote(''); setChecks([]); setVerifying(false);
    // Auto-DNA local: imagem anexada sem análise → descreve na hora (grátis,
    // instantâneo). Elimina a armadilha de ordem botão-depois-Gerar.
    let dnaForPrompt = modelMode !== 'none' ? modelDna : null;
    if (modelMode !== 'none' && modelImage && !dnaForPrompt) {
      try {
        const a = await analyzeModelLocal(modelImage);
        if (a.dna) { dnaForPrompt = a.dna; setModelDna(a.dna); setDnaSource('local'); }
      } catch {}
    }
    const genProvider = getPromptProvider();
    generateStream(
      (onChunk) => generateCitationService({
        ...params, area: areaLabel,
        author: author === 'auto' ? autoAuthorLabel : author,
        tone, source, context: localTopic, language, showAuthor,
        useModel: modelMode !== 'none',
        modelImage: modelMode !== 'none' ? modelImage || undefined : undefined,
        modelDna: dnaForPrompt || undefined,
        modelRef: modelMode === 'link' ? modelRef || undefined : undefined,
        modelLink: modelMode === 'link' ? modelLink : undefined,
      }, onChunk),
      async (streamedText) => {
        const { content: mainContent, note: streamNote } = splitVisualResult(streamedText);
        setNote(streamNote);
        const parsed = splitOptions(mainContent, CITATION_DIVIDER, 3);
        const blocks = parsed.length > 0 ? parsed : (mainContent ? [mainContent] : []);
        setCitations(blocks); setActive(0);
        if (!blocks.length) return;
        setVerifying(true);
        try {
          const candidates = blocks.map((b) => {
            const c = extractCandidate(b);
            const stateAuthor = author === 'auto' ? autoAuthorLabel : author;
            return { quote: c.quote, author: c.author || stateAuthor, work: c.work || source };
          });
          // Pré-cheque local: se a frase nem menciona o autor, marca risco (juiz decide).
          candidates.forEach((c) => { try { fuzzyAuthorMatch(c.quote, c.author); } catch {} });
          // Juiz no MESMO provedor da geração (o de texto pode não ter chave).
          const res = await verifyCitationService(candidates, langCode, genProvider);
          setChecks(res);
        } finally { setVerifying(false); }
      }
    );
  };

  const helpDescription = `
O que é o Gerador de Citações:
Citações reais de grandes personalidades, versículos bíblicos e provérbios mundiais para posts de alto engajamento. Cada opção passa por checagem anti-alucinação em 2 passes (geração com Search + juiz verificador) e recebe um selo: Verificada, Tradução-livre ou Não verificada. Custo: 2 chamadas de IA por geração.
`;

  const sidebarContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Modelo IA</label><select aria-label="Modelo IA" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.aiModel} onChange={(e) => setParams({ ...params, aiModel: e.target.value })} disabled={isLocked}>{IMAGE_AIS.map((i: string) => (<option key={i} value={i}>{i}</option>))}</select><EngineLink engine={params.aiModel} /></div>
        <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Proporção</label><select aria-label="Proporção" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={params.aspectRatio} onChange={(e) => setParams({ ...params, aspectRatio: e.target.value })} disabled={isLocked}>{videoRatios.map((r: string) => (<option key={r} value={r}>{r}</option>))}</select></div>
      </div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('cit_area')}</label><select aria-label={t('cit_area')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none text-sm" value={areaId} onChange={(e) => { setAreaId(e.target.value); }} disabled={isLocked}>{CITATION_AREA_IDS.map((id, idx) => (<option key={id} value={id}>{(citationAreas as string[])?.[idx] || id}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('cit_author')} <span className="text-[10px] text-slate-500">({authorNames.length})</span></label><select aria-label={t('cit_author')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none text-sm" value={author} onChange={(e) => setAuthor(e.target.value)} disabled={isLocked}><option value="auto">{autoAuthorLabel}</option>{authorNames.map((n, i) => (<option key={`${n}__${i}`} value={n}>{n}</option>))}</select></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('cit_tone')}</label><select aria-label={t('cit_tone')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none text-sm" value={tone} onChange={(e) => setTone(e.target.value)} disabled={isLocked}>{(citationTones as string[])?.map((x: string) => (<option key={x} value={x}>{x}</option>))}</select></div>
        <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('cit_source')}</label><select aria-label={t('cit_source')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none text-sm" value={source} onChange={(e) => setSource(e.target.value)} disabled={isLocked}>{(citationSources as string[])?.map((x: string) => (<option key={x} value={x}>{x}</option>))}</select></div>
      </div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('label_platform')}</label><select aria-label={t('label_platform')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none text-sm" value={params.platform} onChange={(e) => setParams({ ...params, platform: e.target.value })} disabled={isLocked}>{socialPlatforms.map((p: string) => (<option key={p} value={p}>{p}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('label_style')}</label><select aria-label={t('label_style')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none text-sm" value={params.style} onChange={(e) => setParams({ ...params, style: e.target.value })} disabled={isLocked}>{quoteStyles.map((s: string) => (<option key={s} value={s}>{s}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">Rodapé (Assinatura)</label><input aria-label="Rodapé" type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-amber-500 outline-none text-xs" placeholder="Ex: @seuusuario" value={params.footer} onChange={(e) => setParams({ ...params, footer: e.target.value })} disabled={isLocked} /></div>
      <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5">
        <label htmlFor="cit-show-author" className="text-sm font-medium text-slate-300">{t('cit_show_author')}</label>
        <button id="cit-show-author" role="switch" aria-checked={showAuthor} aria-label={t('cit_show_author')} onClick={() => setShowAuthor((v) => !v)} disabled={isLocked} className={`relative w-11 h-6 rounded-full transition-all ${showAuthor ? 'bg-amber-500' : 'bg-slate-700'}`}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${showAuthor ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
        <label className="text-sm font-bold text-slate-300 flex items-center gap-2"><Pin className="w-4 h-4 text-amber-400" /> {t('cit_model')}</label>
        <select aria-label={t('cit_model')} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-sm outline-none" value={modelMode} onChange={(e) => { setModelMode(e.target.value as any); setModelError(''); }} disabled={isLocked}>
          <option value="none">{t('cit_model_none')}</option>
          <option value="link">{t('cit_model_link')}</option>
          <option value="upload">{t('cit_model_upload')}</option>
          <option value="preset">{t('cit_model_preset')}</option>
        </select>
        {modelMode === 'link' && (
          <div className="flex gap-2">
            <input aria-label={t('cit_model_link')} type="url" className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-xs outline-none" placeholder="pinterest.com/pin/…" value={modelLink} onChange={(e) => setModelLink(e.target.value)} disabled={isLocked} />
            <button onClick={handleResolveLink} disabled={isLocked || modelBusy || !modelLink} className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold px-3 rounded-lg">{modelBusy ? '…' : 'OK'}</button>
          </div>
        )}
        {modelMode === 'upload' && (
          <label className="w-full h-20 border border-dashed border-slate-500 rounded flex items-center justify-center cursor-pointer hover:bg-slate-800 transition-colors gap-2 text-slate-400 text-xs">
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isLocked} /><Upload className="w-5 h-5" /> {t('cit_model_upload')}
          </label>
        )}
        {(modelRef?.thumbUrl || modelImage) && modelMode !== 'none' && (
          <div className="flex gap-3 items-start">
            <img src={modelRef?.thumbUrl || modelImage} alt="modelo" className="w-20 h-20 rounded object-cover border border-slate-600" />
            <div className="flex-1 space-y-2">
              {modelRef?.title && <p className="text-[11px] text-slate-400 line-clamp-2">{modelRef.title}</p>}
              <div className="flex gap-2">
                {modelImage && <button onClick={() => handleAnalyze(false)} disabled={isLocked || modelBusy} className="bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50">{modelBusy ? '…' : t('cit_model_analyze')}</button>}
                {modelImage && dnaSource === 'local' && <button onClick={() => handleAnalyze(true)} disabled={isLocked || modelBusy} className="bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-bold px-2.5 py-1.5 rounded-lg disabled:opacity-50" title={t('cit_model_deep_desc')}>{t('cit_model_deep')}</button>}
                <button onClick={() => { setModelImage(''); setModelRef(null); setModelDna(null); setDnaSource(null); setModelLink(''); }} disabled={isLocked} className="bg-slate-800 hover:bg-slate-700 text-slate-400 p-1.5 rounded-lg" aria-label="Remover modelo"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        )}
        {modelMode === 'preset' && <p className="text-[11px] text-slate-500">{t('cit_model_preset_desc')}</p>}
        {modelError && <p className="text-[11px] text-red-400">{modelError}</p>}
        {modelDna && (
          <div className="border border-emerald-800 rounded-lg">
            <button onClick={() => setShowDna((v) => !v)} className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-bold text-emerald-300">
              <span>{t('cit_model_seen')} <span className="ml-1 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">{dnaSource === 'vision' ? t('cit_model_src_vision') : t('cit_model_src_local')}</span></span><ChevronDown className={`w-4 h-4 transition-transform ${showDna ? 'rotate-180' : ''}`} />
            </button>
            {showDna && (
              <dl className="px-3 pb-3 space-y-1.5 text-[11px] text-slate-400">
                <div><dt className="font-bold text-slate-300 inline">Layout: </dt><dd className="inline">{modelDna.layout}</dd></div>
                <div><dt className="font-bold text-slate-300 inline">Tipografia: </dt><dd className="inline">{modelDna.typography}</dd></div>
                <div><dt className="font-bold text-slate-300 inline">Paleta: </dt><dd className="inline">{modelDna.palette}</dd></div>
                <div><dt className="font-bold text-slate-300 inline">Luz/Textura: </dt><dd className="inline">{modelDna.lightTexture}</dd></div>
                <div><dt className="font-bold text-slate-300 inline">Composição: </dt><dd className="inline">{modelDna.composition}</dd></div>
              </dl>
            )}
          </div>
        )}
      </div>
      <div className="relative">
        <div className="absolute right-2 top-8 z-10 flex gap-2">
          {sharedContext && (<button onClick={handleImportGlobal} className="p-2 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central"><Brain className="w-4 h-4" /></button>)}
          {!isLocked && <SpeechInput onTranscript={(x) => setLocalTopic((prev) => prev + ' ' + x)} language={language} />}
        </div>
        <div className="flex justify-between items-center mt-1 mb-1"><label className="text-sm font-medium text-slate-300 block">{t('cit_context')} (opcional)</label><div className="flex items-center gap-1 text-xs text-amber-400"><Link2 className="w-3 h-3" /> Sessão Isolada</div></div>
        <textarea aria-label={t('cit_context')} className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-amber-500 outline-none text-sm pr-10 text-slate-200" placeholder="Ex: disciplina de manhã, 5am club..." value={localTopic} onChange={(e) => setLocalTopic(e.target.value)} disabled={isLocked}></textarea>
      </div>
      <SectionHelp title="Checagem anti-alucinação" description="Pass 1 gera com Search. Pass 2 (juiz cético, 1 chamada) confirma cada citação e aplica selo por opção. FALSA é descartada e sinalizada — nunca publicada como verdade." />
    </div>
  );

  const sealBadge = (i: number) => {
    const s = sealFor(i);
    if (verifying && !s) return (<span className="ml-2 text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">verificando…</span>);
    if (!s) return null;
    if (s.verdict === 'CONFIRMADA') return (<span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded-full"><ShieldCheck className="w-3 h-3" />Verificada</span>);
    if (s.verdict === 'TRADUCAO-LIVRE') return (<span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-sky-900 text-sky-300 px-2 py-0.5 rounded-full"><Languages className="w-3 h-3" />Tradução-livre</span>);
    if (s.verdict === 'FALSA') return (<span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-red-900 text-red-300 px-2 py-0.5 rounded-full"><ShieldX className="w-3 h-3" />Falsa — não publique</span>);
    return (<span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded-full"><ShieldAlert className="w-3 h-3" />Não verificada</span>);
  };

  return (
    <ToolLayout title={t('cit_title')} icon={Quote} iconColorClass="text-amber-400" description={helpDescription} loading={loading || verifying} error={error} isLocked={isLocked} onToggleLock={() => setIsLocked(!isLocked)} outputKind="image" sidebarContent={sidebarContent} actions={(<button onClick={handleGenerate} disabled={loading || verifying || isLocked} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg">{(loading || verifying) ? <RefreshCw className="animate-spin w-5 h-5" /> : <ImageIcon className="w-5 h-5" />} {(loading) ? 'Gerando...' : verifying ? t('cit_verifying') : t('cit_btn')}</button>)}
      mainContent={(
        <>
          {citations.length > 0 ? (
            <>
              <div role="tablist" className="flex border-b border-slate-800 bg-slate-900/50 overflow-x-auto no-scrollbar rounded-t-xl sticky top-0 z-10 px-2 pt-2 gap-2">{citations.map((_, index) => {
                const s = sealFor(index);
                const tabColor = s?.verdict === 'FALSA' ? 'bg-red-900 text-red-200' : s?.verdict === 'CONFIRMADA' ? 'bg-emerald-700 text-white' : active === index ? 'bg-amber-600 text-white shadow-lg translate-y-[1px]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200';
                return (<button key={index} role="tab" aria-selected={active === index} onClick={() => setActive(index)} className={`px-5 py-3 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${active === index && !s ? 'bg-amber-600 text-white shadow-lg translate-y-[1px]' : tabColor}`}>Opção {index + 1}</button>);
              })}</div>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6">
                <pre className="whitespace-pre-wrap font-sans text-base text-slate-300">{citations[active]}</pre>
                {sealFor(active) && (
                  <div className={`mt-4 p-4 rounded-r-lg border-l-4 shadow-lg ${sealFor(active)?.verdict === 'FALSA' ? 'bg-red-950 border-red-500' : sealFor(active)?.verdict === 'DUVIDOSA' ? 'bg-yellow-950 border-yellow-500' : 'bg-emerald-950 border-emerald-500'}`}>
                    <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">{sealBadge(active)}</h4>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap font-medium">Evidência: {sealFor(active)?.evidence}{sealFor(active)?.note ? `\n${sealFor(active)?.note}` : ''}</p>
                  </div>
                )}
                {note && (<div className="mt-4 p-4 bg-slate-900 border-l-4 border-yellow-500 rounded-r-lg shadow-lg"><h4 className="text-[10px] font-black text-yellow-500 flex items-center gap-2 mb-2 uppercase tracking-widest"><Wand2 className="w-4 h-4" /> Nota do Estrategista</h4><p className="text-slate-300 italic text-sm whitespace-pre-wrap font-medium">{note}</p></div>)}
              </div>
              <div className="p-4 border-t border-slate-800 flex gap-2"><TextToSpeech text={citations[active]} language={language} className="flex-1" /><button onClick={() => downloadPDF(`Citacao_${active}`, citations[active])} className="flex-1 bg-slate-800 py-3 rounded-lg text-sm font-bold text-slate-200">PDF</button><button onClick={() => navigator.clipboard.writeText(citations[active])} className="flex-1 bg-amber-600 py-3 rounded-lg text-sm font-bold text-white">Copiar</button></div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 p-6">{(loading || verifying) ? <RefreshCw className="w-16 h-16 mb-4 animate-spin text-amber-500" /> : <Quote className="w-16 h-16 mb-4 opacity-20" />}<p className="text-center text-slate-400">{loading ? 'Buscando citações reais...' : verifying ? t('cit_verifying') : t('msg_wait_desc')}</p></div>
          )}
        </>
      )} hasResults={citations.length > 0} sessionId="citation" />
  );
};

export default CitationGenerator;
