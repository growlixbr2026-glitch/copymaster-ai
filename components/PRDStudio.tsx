import React, { useState, useEffect } from 'react';
import { FileText, Wand2, Link2, Terminal, Palette, Layers, Cpu, AlertCircle, RefreshCw, Brain, ImagePlus, Globe, BookOpen, ArrowUpRight } from 'lucide-react';
import { getLocalizedLists, VIBE_CODING_PLATFORMS } from '../constants';
import { generatePRDService, PRD_DIVIDER } from '../services/geminiService';
import { analyzeSiteImage, buildSiteDnaBlock, SiteDna, SiteScrape } from '../services/vision/siteDna';
import { useTranslation } from '../hooks/useTranslation';
import { SectionHelp } from './SectionHelp';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { RefinementToolbar } from './RefinementToolbar';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { ToolLayout } from './ToolLayout';
import { resizeImage } from '../utils/imageUtils';
import { splitVisualResult } from '../utils/stripCopyFormat';
import { toFriendlyError } from '../services/friendlyErrors';

interface PRDStudioProps {
  language: string;
}

const isValidWebUrl = (raw: string): boolean => {
  try {
    const u = new URL(String(raw || '').trim());
    if (u.protocol !== 'https:') return false;
    const h = u.hostname.toLowerCase();
    if (!h.includes('.')) return false;
    if (h === 'localhost' || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)
      || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h === '169.254.169.254') return false;
    return true;
  } catch { return false; }
};

const PRDStudio: React.FC<PRDStudioProps> = ({ language }) => {
  const { sharedContext, setSharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream, setError } = useAIGenerator();
  const [result, setResult] = useState({ prd: '', tokens: '', note: '' });
  const [activeResultTab, setActiveResultTab] = useState<'prd' | 'tokens'>('prd');
  const [isLocked, setIsLocked] = useState(false);
  const { t, langCode } = useTranslation(language);

  const { tones, methodologies, prdTypes, prdSections, visualColors, visualTextures } = getLocalizedLists(langCode) as any;

  // ESTADO LOCAL ISOLADO (negócio + 5 Qs opcionais + site ref)
  const [localContext, setLocalContext] = useState('');
  const [biz, setBiz] = useState({ name: '', niche: '', promise: '', audience: '', differential: '' });
  const [qs, setQs] = useState({ q1: '', q2: '', q3: '', q4: '', q5: '' });
  const [showQs, setShowQs] = useState(false);

  const [params, setParams] = useState({
    type: prdTypes?.[0] || '',
    tone: tones?.[0] || '',
    methodology: methodologies?.[0] || '',
    platform: VIBE_CODING_PLATFORMS[0],
    visualStyle: '',
    bgColor: '',
    fontColor: '',
    texture: '',
    integrations: '',
  });
  const [sections, setSections] = useState<string[]>([]);

  // Site de referência (opcional — liberdade total; quando presente, SOBRESCREVE)
  const [siteRefUrl, setSiteRefUrl] = useState('');
  const [siteShots, setSiteShots] = useState<string[]>([]);
  const [siteDna, setSiteDna] = useState<SiteDna | null>(null);
  const [siteScrape, setSiteScrape] = useState<SiteScrape | null>(null);
  const [analyzingSite, setAnalyzingSite] = useState(false);

  const prdHelpDescription = `
O que é o PRD Vibe Studio:
Transforme uma ideia bruta em um PRD completo em PT-BR, pronto para copiar e colar em Lovable, v0, Bolt, Cursor ou Stitch — e gerar um site estático bonito, moderno e que converte, sem cara de site de IA.
Responda as 5 perguntas opcionais para refinar (se pular, o sistema segue marcando ASSUNÇÃO). Cole um site de referência e o DNA visual dele vira lei no PRD.
`;

  useEffect(() => {
    setParams((p) => ({ ...p, type: prdTypes?.[0] || '', tone: tones?.[0] || '', methodology: methodologies?.[0] || '', platform: VIBE_CODING_PLATFORMS[0] }));
  }, [langCode]);

  useEffect(() => {
    if (!sections.length && prdSections?.length) setSections(prdSections);
  }, [langCode]);

  const toggleSection = (s: string) => {
    if (isLocked) return;
    setSections((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleImportGlobal = () => setLocalContext(sharedContext);
  const handleVoiceInput = (text: string) => setLocalContext((prev) => (prev ? prev + ' ' + text : text));

  const handleShotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 2);
    if (!files.length) return;
    try {
      const resized = await Promise.all(files.map((f) => resizeImage(f, 1024)));
      setSiteShots((prev) => [...prev, ...resized].slice(0, 2));
    } catch (err: any) {
      setError(toFriendlyError('Erro ao processar screenshot: ' + (err?.message || err)));
    }
  };

  const handleAnalyzeSite = async () => {
    setError(null);
    if (siteShots.length === 0 && !isValidWebUrl(siteRefUrl)) {
      alert('Cole uma URL https válida ou anexe um screenshot do site de referência.');
      return;
    }
    setAnalyzingSite(true);
    try {
      // A) Scrape textual server-side (sem CORS)
      if (isValidWebUrl(siteRefUrl)) {
        try {
          const r = await fetch(`/api/scrape?url=${encodeURIComponent(siteRefUrl.trim())}`);
          const j: any = await r.json();
          if (j?.ok) {
            setSiteScrape({ url: j.url, title: j.title || '', description: j.description || '', headings: j.headings || [], text: j.text || '' });
          } else {
            setSiteScrape(null);
          }
        } catch { setSiteScrape(null); }
      }
      // B) DNA visual via Gemini vision (screenshot anexado)
      if (siteShots.length > 0) {
        const a = await analyzeSiteImage(siteShots[0]);
        if (a.dna) setSiteDna(a.dna);
        else if (!siteScrape) setError(toFriendlyError(a.error || 'Não consegui ler o screenshot.') + ' Dica: a análise visual exige chave Gemini; a URL do site (texto/SEO) funciona sem chave.');
      }
    } finally {
      setAnalyzingSite(false);
    }
  };

  const hasBriefing = !!(biz.name || biz.niche || biz.promise || biz.audience || localContext || siteRefUrl || siteShots.length);

  const handleGenerate = () => {
    if (!hasBriefing) {
      alert('Descreva o negócio (nome, nicho, promessa ou público) ou cole um site de referência.');
      return;
    }
    setResult({ prd: '', tokens: '', note: '' });
    setActiveResultTab('prd');
    // Overrides manuais SEMPRE fluem (com ou sem site ref); DNA extraído tem precedência (regra no serviço).
    const dnaBlock = buildSiteDnaBlock(siteDna, siteScrape, { visualStyle: params.visualStyle, bgColor: params.bgColor, fontColor: params.fontColor, texture: params.texture });
    generateStream(
      (onChunk) => generatePRDService({
        businessName: biz.name, niche: biz.niche, promise: biz.promise, audience: biz.audience, differential: biz.differential,
        tone: params.tone, methodology: params.methodology, prdType: params.type, prdPlatform: params.platform,
        sections, integrations: params.integrations, visualStyle: params.visualStyle,
        bgColor: params.bgColor, fontColor: params.fontColor, texture: params.texture,
        siteRefUrl: siteRefUrl.trim(), siteDnaBlock: dnaBlock,
        q1: qs.q1, q2: qs.q2, q3: qs.q3, q4: qs.q4, q5: qs.q5,
        context: localContext, language,
      }, onChunk),
      (streamedText) => {
        if (!streamedText || typeof streamedText !== 'string') return;
        const parsed = splitVisualResult(streamedText);
        const parts = (parsed.content || '').split(PRD_DIVIDER);
        setResult({
          prd: (parts[0] || parsed.content || '').trim(),
          tokens: (parts[1] || '').trim(),
          note: (parsed.note || '').replace(/NOTA DO ESTRATEGISTA:[\s]*/i, '').trim(),
        });
      },
      (finalText) => {
        const parsed = splitVisualResult(finalText || '');
        if (!parsed.content) {
          setResult({ prd: '', tokens: '', note: '' });
          setError('O modelo retornou uma resposta sem conteúdo (instabilidade momentânea do plano gratuito). Clique em Gerar PRD novamente.');
        }
      }
    );
  };

  const handleExportCenter = () => {
    if (!result.prd) return;
    setSharedContext(result.prd);
    alert('PRD definido como Contexto Global! Abra o Landing Pages (modo tech) para usar.');
  };

  const qDefs = [
    { key: 'q1', label: 'Q1 — Pra quem é?', ph: 'Ex: mulheres 28-45 donas de studio; dor: agenda vazia; desejo: lotar com ticket alto' },
    { key: 'q2', label: 'Q2 — ÚNICA ação?', ph: 'Ex: clicar em [Agendar no WhatsApp] → abre wa.me/55...' },
    { key: 'q3', label: 'Q3 — O que já tem pronto?', ph: 'Ex: tenho 3 fotos e 2 depoimentos; preço R$497 — ou invente placeholders realistas' },
    { key: 'q4', label: 'Q4 — Ama qual site? Odeia qual estilo?', ph: 'Ex: amo linear.app (clean) — odeio neon e glassmorphism' },
    { key: 'q5', label: 'Q5 — O que NÃO pode existir? Onde hospeda?', ph: 'Ex: sem login/pagamento/blog. Hospeda na Vercel' },
  ] as const;

  const sidebarContent = (
    <>
      <div className="relative mb-4">
        <div className="absolute right-2 top-0 z-10 flex gap-2">
          {sharedContext && (
            <button onClick={handleImportGlobal} className="p-2 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
              <Brain className="w-4 h-4" />
            </button>
          )}
          {!loading && <SpeechInput onTranscript={handleVoiceInput} language={language} />}
        </div>
        <div className="flex justify-between items-center mt-1 mb-1"><label className="text-sm font-medium text-slate-300 block">{t('label_context')}</label><div className="flex items-center gap-1 text-xs text-cyan-400"><Link2 className="w-3 h-3" /> Sessão Isolada</div></div>
        <textarea aria-label={t('placeholder_context')} className="w-full h-24 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-cyan-500 outline-none text-sm pr-10 text-slate-200" placeholder="Ideia bruta: o que você quer vender e para quem..." value={localContext} onChange={(e) => setLocalContext(e.target.value)} disabled={loading || isLocked}></textarea>
      </div>

      <div className="grid grid-cols-1 gap-3 bg-slate-900 p-4 rounded-lg border border-slate-800 mb-4">
        <div><label className="text-xs text-slate-300 block mb-1 uppercase font-bold">Nome do Negócio *</label><input aria-label="Nome do Negócio" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-cyan-500 outline-none" value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} placeholder="Ex: Studio Lume" disabled={loading || isLocked} /></div>
        <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">Nicho *</label><input aria-label="Nicho" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-cyan-500 outline-none" value={biz.niche} onChange={(e) => setBiz({ ...biz, niche: e.target.value })} placeholder="Ex: estética facial premium" disabled={loading || isLocked} /></div>
        <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold flex items-center gap-1"><Layers className="w-3 h-3 text-yellow-400" /> Promessa Única *</label><textarea aria-label="Promessa Única" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-cyan-500 outline-none resize-none h-14" placeholder="Ex: pele de vidro em 30 dias sem agulhas" value={biz.promise} onChange={(e) => setBiz({ ...biz, promise: e.target.value })} disabled={loading || isLocked}></textarea></div>
        <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">Público-Alvo *</label><input aria-label="Público-Alvo" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-cyan-500 outline-none" value={biz.audience} onChange={(e) => setBiz({ ...biz, audience: e.target.value })} placeholder="Ex: mulheres 28-45 classe A" disabled={loading || isLocked} /></div>
        <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">Diferencial</label><input aria-label="Diferencial" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-cyan-500 outline-none" value={biz.differential} onChange={(e) => setBiz({ ...biz, differential: e.target.value })} placeholder="Ex: protocolo próprio com garantia" disabled={loading || isLocked} /></div>
      </div>

      <div className="mb-4 bg-slate-900/60 border border-cyan-500/20 rounded-lg">
        <button onClick={() => setShowQs(!showQs)} disabled={loading} className="w-full flex items-center justify-between px-4 py-3 text-xs font-black uppercase tracking-widest text-cyan-300 hover:text-white transition-all">
          <span className="flex items-center gap-2"><BookOpen className="w-4 h-4" /> 5 Perguntas Opcionais ({Object.values(qs).filter((q) => q.trim().length > 1).length}/5)</span>
          <span>{showQs ? '−' : '+'}</span>
        </button>
        {showQs && (
          <div className="px-4 pb-4 space-y-3">
            <p className="text-[11px] text-slate-500">Opcionais — se pular, o sistema segue e marca ASSUNÇÃO na Nota.</p>
            {qDefs.map((q) => (
              <div key={q.key}><label className="text-[11px] font-bold text-slate-400 block mb-1">{q.label}</label><textarea aria-label={q.label} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-cyan-500 outline-none resize-none h-14" placeholder={q.ph} value={qs[q.key]} onChange={(e) => setQs({ ...qs, [q.key]: e.target.value })} disabled={loading || isLocked}></textarea></div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 bg-slate-900/60 border border-fuchsia-500/20 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-fuchsia-300"><Globe className="w-4 h-4" /> Site de Referência (opcional)</div>
        <div><label className="text-[11px] text-slate-400 block mb-1">URL do site que você admira</label><input aria-label="URL do site de referência" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-fuchsia-500 outline-none font-mono" value={siteRefUrl} onChange={(e) => setSiteRefUrl(e.target.value)} placeholder="https://linear.app" disabled={loading || isLocked} /></div>
        <div>
          <label className="text-[11px] text-slate-400 block mb-1">Ou anexe screenshot (PNG/JPG)</label>
          <label className="cursor-pointer w-full flex items-center justify-center gap-2 bg-slate-800 border border-dashed border-slate-700 rounded p-3 text-[11px] text-slate-400 hover:border-fuchsia-500 transition-all">
            <input type="file" className="hidden" accept="image/*" multiple onChange={handleShotUpload} disabled={loading || isLocked} />
            <ImagePlus className="w-4 h-4" /> {siteShots.length ? `${siteShots.length} screenshot(s) anexado(s)` : 'Subir screenshot p/ extrair DNA visual'}
          </label>
        </div>
        <button onClick={handleAnalyzeSite} disabled={analyzingSite || loading || isLocked || (!siteRefUrl && siteShots.length === 0)} className="w-full bg-fuchsia-600/20 hover:bg-fuchsia-600/40 disabled:opacity-40 text-fuchsia-200 border border-fuchsia-500/40 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
          {analyzingSite ? <RefreshCw className="animate-spin w-4 h-4" /> : <Cpu className="w-4 h-4" />} {analyzingSite ? 'Extraindo DNA...' : 'Analisar Referência'}
        </button>
        {(siteDna || siteScrape) && (
          <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded p-2">
            DNA capturado{siteDna ? ' (visual)' : ''}{siteScrape ? ' (texto/SEO)' : ''} — vai SOBRESCEVER o Automático no PRD.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 bg-slate-900 p-4 rounded-lg border border-slate-800 mb-4">
        <div><label className="text-sm font-medium text-slate-300 block mb-1">Tipo de Site</label><select aria-label="Tipo de Site" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-cyan-500 outline-none text-sm" value={params.type} onChange={(e) => setParams({ ...params, type: e.target.value })} disabled={loading || isLocked}>{(prdTypes || []).map((f: string) => (<option key={f} value={f}>{f}</option>))}</select></div>
        <div><label className="text-sm font-medium text-slate-300 block mb-1">Plataforma Alvo (Vibe Coding)</label><select aria-label="Plataforma Alvo" className="w-full bg-slate-900 border border-cyan-500/50 rounded-lg p-3 text-white focus:ring-1 focus:ring-cyan-500 outline-none text-sm font-mono" value={params.platform} onChange={(e) => setParams({ ...params, platform: e.target.value })} disabled={loading || isLocked}>{VIBE_CODING_PLATFORMS.map((p) => (<option key={p} value={p}>{p}</option>))}</select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">Tom</label><select aria-label="Tom" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-cyan-500 outline-none" value={params.tone} onChange={(e) => setParams({ ...params, tone: e.target.value })} disabled={loading || isLocked}>{(tones || []).map((x: string) => (<option key={x} value={x}>{x}</option>))}</select></div>
          <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">Método</label><select aria-label="Método" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-cyan-500 outline-none" value={params.methodology} onChange={(e) => setParams({ ...params, methodology: e.target.value })} disabled={loading || isLocked}>{(methodologies || []).map((x: string) => (<option key={x} value={x}>{x}</option>))}</select></div>
        </div>
        <div>
          <label className="text-xs text-slate-400 block mb-1 uppercase font-bold">Seções (ordem do PRD)</label>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar p-1 border border-slate-800 rounded-xl bg-slate-950/50">
            {(prdSections || []).map((s: string) => (<button key={s} onClick={() => toggleSection(s)} disabled={loading || isLocked} className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${sections.includes(s) ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'}`}>{s}</button>))}
          </div>
        </div>
        <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold flex items-center gap-1"><Palette className="w-3 h-3 text-pink-400" /> Identidade Visual (override — perde p/ DNA)</label><input aria-label="Identidade Visual" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-cyan-500 outline-none" value={params.visualStyle} onChange={(e) => setParams({ ...params, visualStyle: e.target.value })} placeholder="Ex: dark premium com dourado" disabled={loading || isLocked} /></div>
        <div className="grid grid-cols-3 gap-2">
          <div><label className="text-[10px] text-slate-500 block mb-1 uppercase">Fundo</label><select aria-label="Cor de fundo" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-[11px] text-slate-200 outline-none" value={params.bgColor} onChange={(e) => setParams({ ...params, bgColor: e.target.value })} disabled={loading || isLocked}><option value="">Auto</option>{(visualColors || []).slice(1).map((c: string) => (<option key={c} value={c}>{c}</option>))}</select></div>
          <div><label className="text-[10px] text-slate-500 block mb-1 uppercase">Texto</label><select aria-label="Cor do texto" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-[11px] text-slate-200 outline-none" value={params.fontColor} onChange={(e) => setParams({ ...params, fontColor: e.target.value })} disabled={loading || isLocked}><option value="">Auto</option>{(visualColors || []).slice(1).map((c: string) => (<option key={c} value={c}>{c}</option>))}</select></div>
          <div><label className="text-[10px] text-slate-500 block mb-1 uppercase">Textura</label><select aria-label="Textura" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-[11px] text-slate-200 outline-none" value={params.texture} onChange={(e) => setParams({ ...params, texture: e.target.value })} disabled={loading || isLocked}><option value="">Auto</option>{(visualTextures || []).slice(1).map((c: string) => (<option key={c} value={c}>{c}</option>))}</select></div>
        </div>
        <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">Integrações (só estático)</label><input aria-label="Integrações" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-cyan-500 outline-none" value={params.integrations} onChange={(e) => setParams({ ...params, integrations: e.target.value })} placeholder="Ex: form → webhook, GA4" disabled={loading || isLocked} /></div>
      </div>
    </>
  );

  const actions = (
    <button onClick={handleGenerate} disabled={loading || !hasBriefing} className="w-full bg-cyan-600 hover:bg-cyan-500 hover:shadow-cyan-500/20 active:scale-95 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg uppercase tracking-widest disabled:opacity-40">
      {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Terminal className="w-5 h-5" />}
      {loading ? 'Arquitetando PRD...' : 'Gerar PRD'}
    </button>
  );

  const mainContent = (
    <>
      {result.prd ? (
        <>
          <div className="bg-slate-900/50 px-2 pt-2 border-b border-slate-800 sticky top-0 z-10">
            <div className="flex gap-1">
              <button onClick={() => setActiveResultTab('prd')} className={`px-8 py-4 text-[10px] font-black uppercase rounded-t-lg transition-all ${activeResultTab === 'prd' ? 'bg-cyan-600 text-white shadow-xl' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>PRD (PT-BR)</button>
              <button onClick={() => setActiveResultTab('tokens')} className={`px-8 py-4 text-[10px] font-black uppercase rounded-t-lg transition-all ${activeResultTab === 'tokens' ? 'bg-cyan-600 text-white shadow-xl' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Tokens JSON</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-slate-900 relative">
            <div className="prose prose-invert max-w-none whitespace-pre-wrap text-slate-200 text-base leading-relaxed font-sans selection:bg-cyan-500 selection:text-white">
              {activeResultTab === 'prd' ? result.prd : (result.tokens || 'Tokens embutidos no PRD acima.')}
              {loading && <span className="inline-block w-2 h-4 bg-cyan-500 animate-pulse ml-1 align-middle"></span>}
            </div>
            {result.note && (
              <div className="mt-8 p-4 bg-slate-800/50 border-l-4 border-yellow-400 rounded-r-lg">
                <h4 className="text-sm font-bold text-yellow-400 flex items-center gap-2"><Wand2 className="w-4 h-4" /> NOTA DO ESTRATEGISTA:</h4>
                <p className="text-slate-300 italic mt-2 text-sm whitespace-pre-wrap">{result.note.replace(/NOTA DO ESTRATEGISTA:/i, '')}</p>
              </div>
            )}
          </div>
          <RefinementToolbar text={activeResultTab === 'prd' ? result.prd : result.tokens} onTextUpdate={(nt) => { if (activeResultTab === 'prd') setResult((prev) => ({ ...prev, prd: nt })); else setResult((prev) => ({ ...prev, tokens: nt })); }} language={language} titleForPDF={`PRD - ${biz.name || 'Vibe Studio'}`} />
          <div className="px-4 pb-4 bg-slate-900 border-t border-slate-800">
            <button onClick={handleExportCenter} className="w-full mt-3 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-200 border border-cyan-500/40 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"><ArrowUpRight className="w-4 h-4" /> Exportar PRD p/ Centro (usar no Landing Tech)</button>
          </div>
        </>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-slate-800 p-10 text-center">
          <FileText className="w-24 h-24 mb-6 opacity-5" />
          <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">{loading ? 'Arquitetando PRD completo...' : 'Ideia bruta entra, PRD pronto sai.'}</p>
          {error && !loading && (
            <div className="mt-6 max-w-md w-full bg-red-950/40 border border-red-800 rounded-xl p-4 text-left">
              <p className="text-sm font-bold text-red-300 break-words flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={handleGenerate} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold">Tentar novamente</button>
                <button onClick={() => setAppActiveTab('settings')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold">Abrir Centro de Comando</button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <ToolLayout
      title={t('prd_title')}
      icon={FileText}
      iconColorClass="text-cyan-400"
      description={prdHelpDescription}
      loading={loading}
      error={error}
      isLocked={isLocked}
      onToggleLock={() => setIsLocked(!isLocked)}
      sidebarContent={sidebarContent}
      actions={actions}
      mainContent={mainContent}
      hasResults={!!result.prd}
      outputKind="text"
    />
  );
};

export default PRDStudio;
