import { Lightbulb, Wand2, TrendingUp, Hash, BookOpen, AlertCircle, Copy, CheckCircle2, Instagram, Linkedin, Twitter, PenTool, Loader2, Download, Home, BrainCircuit, Brain, ExternalLink, GraduationCap, Newspaper, FileText, Search, SlidersHorizontal } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useSharedContext } from '../contexts/SharedContext';
import { useTranslation } from '../hooks/useTranslation';
import { generateIdeaSessionService, generateCopyIdeasService, generateTrendsService, generateContentFormatsService, generateEnemiesService } from '../services/geminiService';
import { quickResearch, rankSnippets, filterSnippets, filterByRelevance, detectCommercialIntent, RESEARCH_SCOPE_STORAGE_KEY, ResearchScope, QuickFilter, RankedSnippet } from '../services/research/quickResearch';
import { toFriendlyError } from '../services/friendlyErrors';
import { downloadPDF } from '../services/pdfService';
import { SectionHelp } from './SectionHelp';
import { OutputKindBadge } from './ToolLayout';

interface IdeaSessionProps {
  language: string;
  onNavigate?: (id: string) => void;
}

interface CopyIdea {
    stage: string; option: number; title: string;
    hook?: string; headline?: string; body?: string; content: string; cta?: string;
    citations?: string[];
}
interface ContentFormat { title: string; outline: string }
interface CommonEnemy { label: string; kind?: string; whyItWorks?: string; angle: string; exampleHook?: string }

interface IdeaData {
    trends: { title: string; description: string; analysis: string; citations?: string[] }[];
    hashtags: { instagram: string[]; tiktok: string[]; linkedin: string[]; twitter: string[]; seoKeywords: string[] };
    contentIdeas: CopyIdea[];
    contentFormats?: { infographic: ContentFormat[]; video_script: ContentFormat[]; article: ContentFormat[] };
    commonEnemies?: CommonEnemy[];
    sources?: { title: string; url: string; source: string; type: string }[];
}

// §8/sink: o `sources` vem ESCRITO PELO MODELO (ideas.ts `sourcesFrom`) e pode
// receber `javascript:`/`data:text/html` via prompt-injection na pesquisa web.
// React só avisa sobre javascript: href (não bloqueia), então validamos aqui.
// Sem scheme http(s) → sem href → o card continua renderizado porém não clicável.
const safeSourceHref = (u?: string): string | undefined =>
  (typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : undefined);

const IdeaSession: React.FC<IdeaSessionProps> = ({ language, onNavigate }) => {
  const { t } = useTranslation(language);
  const { sharedContext, setSharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Partial<IdeaData>>({});
  const [activeTab, setActiveTab] = useState<'trends' | 'hashtags' | 'ideas' | 'sources' | 'search' | 'content' | 'enemies'>('search');
  const [activeContentFormat, setActiveContentFormat] = useState<'infographic' | 'video_script' | 'article'>('infographic');
  const [generatedOnce, setGeneratedOnce] = useState(false);
  // Fase 1 (instantânea, custo 0) → Fase 2 (LLM em background). Nunca bloqueia a tela.
  const [phase, setPhase] = useState<'idle' | 'research' | 'generating' | 'done'>('idle');
  const [genSince, setGenSince] = useState<number | null>(null);
  const [genElapsed, setGenElapsed] = useState(0);
  // Geração por aba: só a aba clicada gera (rápido, ~1/4 do custo).
  const [busySection, setBusySection] = useState<null | 'ideas' | 'trends' | 'content' | 'enemies'>(null);

  // Contador de tempo da Fase 2 — prova que não travou, só está gerando.
  useEffect(() => {
    if (phase !== 'generating' || genSince === null) return;
    setGenElapsed(0);
    const id = setInterval(() => setGenElapsed(Math.floor((Date.now() - genSince) / 1000)), 1000);
    return () => clearInterval(id);
  }, [phase, genSince]);
  const [quick, setQuick] = useState<RankedSnippet[]>([]);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('top');
  const [researchNote, setResearchNote] = useState<string | null>(null);
  // Escopo da pesquisa: onde o sistema procura. Default `geral` (1 fonte, ~2-3s).
  const [scope, setScope] = useState<ResearchScope>(() => {
    try {
      const saved = localStorage.getItem(RESEARCH_SCOPE_STORAGE_KEY);
      return saved === 'auto' || saved === 'geral' || saved === 'noticias' || saved === 'academico' ? (saved as ResearchScope) : 'geral';
    } catch { return 'geral'; }
  });

  const handleScopeChange = (s: ResearchScope) => {
    setScope(s);
    try { localStorage.setItem(RESEARCH_SCOPE_STORAGE_KEY, s); } catch {}
  };

  const SCOPE_HINT: Record<ResearchScope, string> = {
    geral: 'Blogs/Guias/Sites — como no Google (~8s)',
    noticias: 'Só jornais e portais',
    academico: 'Teses, monografias e papers',
    auto: 'Automático (detecta intenção)',
  };

  const ideaHelpDescription = `
Sessão de Ideias — vasculhador gratuito: cruza Google Grounding + arXiv/PubMed/SciELO/OpenAlex (papers) + Google News RSS (jornais/blogs) + enriquecimento HTML. Retorna 12 copies por funil (4 Topo/4 Meio/4 Fundo, cada uma com hook + headline + texto + CTA), 3 tendências, formatos de conteúdo (infográfico/roteiro/artigo) e inimigos comuns do nicho. Cache local 6h.
`;

  const handleImportGlobal = () => {
    setNiche(sharedContext);
  };

  const handleGenerate = async () => {
    if (!niche) {
      setError("Por favor, insira um nicho.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setData({}); 
    setGeneratedOnce(true);
    setActiveTab('search');

    // FASE 1 — Pesquisa Instantânea (tipo Google, custo 0, <3s): renderiza já.
    setPhase('research');
    setQuick([]);
    setResearchNote(null);
    let snippets: RankedSnippet[] = [];
    try {
        const raw = await quickResearch(niche, language, { maxPerType: 2, scope });
        const ranked = rankSnippets(raw, niche, { scope });
        // Gate de irrelevância: tese sem relação nunca vira "Mais aderente".
        // Geral usa gate relaxado (Google-like: mostra top parcial com aviso).
        snippets = filterByRelevance(ranked, niche, { scope });
        setQuick(snippets);
        if (!snippets.length) {
            if (scope === 'geral' && ranked.length) {
                // Geral é Google-like: nunca devolve vazio se há algo ranqueado —
                // exibe o top parcial com aviso em vez de "sem resultados".
                snippets = ranked.slice(0, 6);
                setQuick(snippets);
                setResearchNote('Resultados com aderência parcial — refine o nicho para melhorar. A IA segue gerando com busca web em background.');
            } else {
                setResearchNote(ranked.length
                    ? 'Nenhum resultado com aderência suficiente — descartei fontes sem relação (ex.: teses acadêmicas). A IA segue gerando com busca web em background.'
                    : (scope === 'noticias')
                        ? 'Nenhum resultado neste escopo — tente Geral ou Auto. A IA segue gerando com busca web em background.'
                        : 'Nenhum resultado instantâneo — a IA segue gerando com busca web em background.');
                // Mantém o ranking bruto fora da tela para o grounding do LLM não herdar lixo:
                // a Fase 2 recebe só o filtrado.
                snippets = [];
            }
        } else if (snippets.length < ranked.length && detectCommercialIntent(niche)) {
            const topic = niche.trim().slice(0, 48);
            setResearchNote(`Filtrei ${ranked.length - snippets.length} fonte(s) sem relação com "${topic}" — exibindo só o aderente.`);
        }
    } catch {
        setResearchNote('Pesquisa instantânea indisponível — a IA segue gerando normalmente.');
    }

    // FASE 2 — LLM em background reaproveitando o grounding já coletado.
    // try/finally: NUNCA trava em "Arquitetando..." — qualquer throw vira erro
    // visível em vez de loading infinito. Ao concluir com dados, pula sozinho
    // para a aba Ideias de Copy (usuário não fica olhando a pesquisa).
    setPhase('generating');
    setGenSince(Date.now());
    try {
        const { data: resultData, error: serviceError } = await generateIdeaSessionService(niche, language, snippets);

        // Parcial conta: mescla o que veio (nunca descarta útil por causa de erro parcial).
        if (resultData && hasAnyData(resultData)) {
            setData((prev) => mergeData(prev, resultData));
            if (serviceError) {
                setError(toFriendlyError(serviceError) + ' (parcial: o que gerou foi mantido)');
            }
            if (resultData.contentIdeas?.length) setActiveTab('ideas');
        } else if (serviceError) {
            setError(toFriendlyError(serviceError));
        } else {
            setError('A IA não retornou dados desta vez (instabilidade do plano gratuito). Tente novamente.');
        }
    } catch (e: any) {
        setError(toFriendlyError(e?.message || String(e)));
    } finally {
        setPhase('done');
        setLoading(false);
        setGenSince(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleDevelopIdea = (ideaContent: string) => {
      setSharedContext(ideaContent);
      if (onNavigate) {
          onNavigate('copy');
      } else {
          setAppActiveTab('copy');
      }
  };

  const handleDevelopTrend = (title: string, description: string, analysis: string) => {
      setSharedContext(`TENDÊNCIA: ${title}\n\n${description}\n\nANÁLISE ESTRATÉGICA: ${analysis}`);
      if (onNavigate) {
          onNavigate('copy');
      } else {
          setAppActiveTab('copy');
      }
  };

  const copyIdeaText = (idea: CopyIdea): string => {
      const parts = [`TÍTULO: ${idea.title}`];
      if (idea.hook) parts.push(`HOOK: ${idea.hook}`);
      if (idea.headline) parts.push(`HEADLINE: ${idea.headline}`);
      parts.push(`TEXTO:\n${idea.body || idea.content}`);
      if (idea.cta) parts.push(`CTA: ${idea.cta}`);
      return parts.join('\n\n');
  };

  // Mescla resultado parcial sem zerar o que já existe (abas geram separado).
  const mergeData = (prev: Partial<IdeaData>, part: Partial<IdeaData>): Partial<IdeaData> => {
      const next: Partial<IdeaData> = { ...prev };
      if (part.contentIdeas?.length) next.contentIdeas = part.contentIdeas;
      if (part.trends?.length) next.trends = part.trends;
      if (part.hashtags && Object.values(part.hashtags).some((a) => (a as string[])?.length)) next.hashtags = part.hashtags;
      if (part.contentFormats && (part.contentFormats.infographic?.length || part.contentFormats.video_script?.length || part.contentFormats.article?.length)) {
          next.contentFormats = {
              infographic: part.contentFormats.infographic?.length ? part.contentFormats.infographic : (prev.contentFormats?.infographic || []),
              video_script: part.contentFormats.video_script?.length ? part.contentFormats.video_script : (prev.contentFormats?.video_script || []),
              article: part.contentFormats.article?.length ? part.contentFormats.article : (prev.contentFormats?.article || []),
          };
      }
      if (part.commonEnemies?.length) next.commonEnemies = part.commonEnemies;
      if (part.sources?.length) next.sources = part.sources;
      return next;
  };

  const hasAnyData = (d: Partial<IdeaData>) =>
      !!(d.contentIdeas?.length || d.trends?.length ||
          d.contentFormats?.infographic?.length || d.contentFormats?.video_script?.length ||
          d.contentFormats?.article?.length || d.commonEnemies?.length);

  // Gera UMA seção (botão por aba): rápido e barato, mescla sem zerar o resto.
  const handleGenerateSection = async (section: 'ideas' | 'trends' | 'content' | 'enemies') => {
      if (!niche || busySection || loading) return;
      setBusySection(section);
      setError(null);
      try {
          const svc = section === 'ideas' ? generateCopyIdeasService
              : section === 'trends' ? generateTrendsService
              : section === 'content' ? generateContentFormatsService
              : generateEnemiesService;
          const { data: part, error: svcError } = await svc(niche, language, quick.length ? quick : undefined);
          if (part && hasAnyData(part)) {
              setData((prev) => mergeData(prev, part as Partial<IdeaData>));
              setGeneratedOnce(true);
              if (svcError) setError(toFriendlyError(svcError) + ' (parcial: o que gerou foi mantido)');
          } else {
              setError(toFriendlyError(svcError || 'A IA não retornou dados desta seção. Tente novamente.'));
          }
      } catch (e: any) {
          setError(toFriendlyError(e?.message || String(e)));
      } finally {
          setBusySection(null);
      }
  };

  const SectionGenerateButton = ({ section, label }: { section: 'ideas' | 'trends' | 'content' | 'enemies'; label: string }) => (
      <div className="flex flex-col items-center gap-3 py-10">
          <p className="text-sm text-slate-500 text-center">{label}</p>
          <button onClick={() => handleGenerateSection(section)} disabled={busySection !== null || loading}
              className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-950 font-black py-3 px-8 rounded-xl transition-all shadow-xl flex items-center gap-2 text-sm uppercase">
              {busySection === section ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {busySection === section ? 'Gerando…' : 'Gerar agora'}
          </button>
      </div>
  );

  const handleDownloadSessionPDF = () => {
      if (!data || (!data.trends && !data.contentIdeas && !data.hashtags)) return;

      let content = `PLANO DE CONTEÚDO ESTRATÉGICO\nNICHO: ${niche.toUpperCase()}\nDATA: ${new Date().toLocaleDateString()}\n\n`;

      if (data.trends && data.trends.length > 0) {
          content += `TENDÊNCIAS DO MOMENTO\n\n`;
          data.trends.forEach((t, i) => {
              content += `${i + 1}. ${t.title}\n${t.description}\nANÁLISE: ${t.analysis}\n\n`;
          });
      }

      if (data.contentIdeas && data.contentIdeas.length > 0) {
          content += `IDEIAS DE COPY (FUNIL DE VENDAS — TEXTO)\n\n`;
          data.contentIdeas.forEach((idea) => {
              content += `ESTÁGIO: ${idea.stage} | OPÇÃO: ${idea.option}\nTÍTULO: ${idea.title}\n`;
              if (idea.hook) content += `HOOK: ${idea.hook}\n`;
              if (idea.headline) content += `HEADLINE: ${idea.headline}\n`;
              content += `\nTEXTO:\n${idea.body || idea.content}\n`;
              if (idea.cta) content += `\nCTA: ${idea.cta}\n`;
              content += `\n-------------------\n\n`;
          });
      }

      if (data.contentFormats && (data.contentFormats.infographic?.length || data.contentFormats.video_script?.length || data.contentFormats.article?.length)) {
          content += `IDEIAS DE CONTEÚDO (FORMATOS)\n\n`;
          const fmt: Array<[string, { title: string; outline: string }[] | undefined]> = [
              ['INFOGRÁFICO', data.contentFormats.infographic],
              ['ROTEIRO DE VÍDEO', data.contentFormats.video_script],
              ['ARTIGO', data.contentFormats.article],
          ];
          fmt.forEach(([label, items]) => {
              (items || []).forEach((f, i) => {
                  content += `${label} ${i + 1}: ${f.title}\n${f.outline}\n\n`;
              });
          });
          content += `-------------------\n\n`;
      }

      if (data.commonEnemies && data.commonEnemies.length > 0) {
          content += `INIMIGOS COMUNS DO NICHO\n\n`;
          data.commonEnemies.forEach((e, i) => {
              content += `${i + 1}. ${e.label}${e.kind ? ` (${e.kind})` : ''}\n`;
              if (e.whyItWorks) content += `POR QUE FUNCIONA: ${e.whyItWorks}\n`;
              content += `ÂNGULO: ${e.angle}\n`;
              if (e.exampleHook) content += `GANCHO PRONTO: ${e.exampleHook}\n`;
              content += `\n`;
          });
      }

      downloadPDF(`Plano de Conteúdo - ${niche}`, content);
  };

  const LoadingState = () => (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500 animate-in fade-in">
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-yellow-500" />
          <p className="text-lg font-bold text-slate-300">Vasculhando jornais, blogs, papers e teses...</p>
           <p className="text-sm text-slate-400 mt-2">arXiv · PubMed · SciELO · OpenAlex · Google News + Grounding</p>
      </div>
  );

  return (
    <div className="max-w-6xl mx-auto h-full overflow-y-auto custom-scrollbar p-1 pb-10">
      <div className="bg-slate-900 border border-yellow-900/30 p-8 rounded-2xl mb-8 flex-shrink-0 shadow-lg">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-black flex items-center gap-3 text-yellow-400 uppercase tracking-tighter">
                <Lightbulb className="w-10 h-10" /> {t('ideas_title')}
                <OutputKindBadge kind="text" />
                <SectionHelp title={t('ideas_title')} description={ideaHelpDescription} sessionId="ideas" />
            </h2>
            <button onClick={() => onNavigate ? onNavigate('home') : setAppActiveTab('home')} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all"><Home className="w-4 h-4" /> Início</button>
        </div>
        <p className="text-slate-400 mb-6 text-lg">{t('ideas_subtitle')}</p>

        <div className="flex flex-wrap items-center gap-2 mb-4" role="group" aria-label="Onde pesquisar">
            {([['geral', 'Geral'], ['noticias', 'Notícias'], ['academico', 'Acadêmico'], ['auto', 'Auto']] as [ResearchScope, string][]).map(([key, label]) => (
                <button key={key} onClick={() => handleScopeChange(key)} aria-pressed={scope === key} title={SCOPE_HINT[key]}
                    className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${scope === key ? 'bg-yellow-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'}`}>{label}</button>
            ))}
            <span className="text-[11px] text-slate-500 ml-1">{SCOPE_HINT[scope]}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <input aria-label={t('ideas_niche_placeholder')}
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder={t('ideas_niche_placeholder')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-5 pr-14 text-xl text-white placeholder:text-slate-700 focus:border-yellow-500 outline-none transition-all shadow-inner"
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            {sharedContext && (
                <button onClick={handleImportGlobal} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-slate-950 rounded-lg border border-yellow-500/30 transition-all shadow-lg" title="Importar do Cérebro Central">
                    <Brain className="w-5 h-5" />
                </button>
            )}
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !niche}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-950 font-black py-5 px-10 rounded-xl transition-all shadow-xl flex items-center justify-center gap-3 text-lg active:scale-95 uppercase"
          >
            {loading || phase === 'research' ? <Loader2 className="animate-spin w-6 h-6" /> : <Wand2 className="w-6 h-6" />}
            {phase === 'research' ? 'Pesquisando...' : loading ? 'Arquitetando...' : 'Gerar Estratégia'}
          </button>
        </div>
      </div>

      {generatedOnce && (
        <div className="animate-in fade-in slide-in-from-bottom-5 duration-500">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-2 px-2">
              <div className="flex flex-wrap gap-2" role="tablist" aria-label="Seções da estratégia">
                  <button onClick={() => setActiveTab('search')} role="tab" aria-selected={activeTab === 'search'} className={`px-6 py-3 rounded-t-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'search' ? 'bg-yellow-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}><Search className="w-3 h-3"/> Pesquisa Instantânea{quick.length > 0 && <span className="ml-1 text-[10px] bg-slate-950/20 px-1.5 py-0.5 rounded-full">{quick.length}</span>}</button>
                  <button onClick={() => setActiveTab('ideas')} role="tab" aria-selected={activeTab === 'ideas'} className={`px-6 py-3 rounded-t-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'ideas' ? 'bg-yellow-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>Ideias de Copy{(loading || phase === 'generating') && <Loader2 className="w-3 h-3 animate-spin" />}</button>
                  <button onClick={() => setActiveTab('content')} role="tab" aria-selected={activeTab === 'content'} className={`px-6 py-3 rounded-t-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'content' ? 'bg-yellow-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>Conteúdo</button>
                  <button onClick={() => setActiveTab('enemies')} role="tab" aria-selected={activeTab === 'enemies'} className={`px-6 py-3 rounded-t-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'enemies' ? 'bg-yellow-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>Inimigo Comum</button>
                  <button onClick={() => setActiveTab('trends')} role="tab" aria-selected={activeTab === 'trends'} className={`px-6 py-3 rounded-t-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'trends' ? 'bg-yellow-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>Tendências</button>
                  <button onClick={() => setActiveTab('hashtags')} role="tab" aria-selected={activeTab === 'hashtags'} className={`px-6 py-3 rounded-t-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'hashtags' ? 'bg-yellow-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}>Hashtags</button>
                  <button onClick={() => setActiveTab('sources')} role="tab" aria-selected={activeTab === 'sources'} className={`px-6 py-3 rounded-t-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'sources' ? 'bg-yellow-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}><FileText className="w-3 h-3"/> Fontes</button>
              </div>
              {!loading && <button onClick={handleDownloadSessionPDF} className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-2 bg-slate-900 px-4 py-2 rounded-lg border border-slate-800"><Download className="w-4 h-4"/> Baixar Relatório</button>}
          </div>

          {error && !loading && (
            <div className="mb-4 bg-red-950/40 border border-red-800 rounded-xl p-4 flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-red-300 break-words">{error}</p>
                <p className="text-xs text-red-300/60 mt-1">Dica: verifique a chave do seu Motor Primário no Centro de Comando. Se usa 9Router, rode `9router` no terminal. O sistema tenta 9Router → Groq/NVIDIA/Mistral/PolinAI (do seu .env) com fallback automático.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={handleGenerate} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold">Tentar novamente</button>
                  <button onClick={() => onNavigate ? onNavigate('settings') : setAppActiveTab('settings')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold">Abrir Centro de Comando</button>
                </div>
              </div>
            </div>
          )}
          <div className="bg-slate-900/30 rounded-xl min-h-[400px]">
            {loading && !(activeTab === 'search' && quick.length > 0) ? <LoadingState /> : (
                <div className="p-4 animate-in fade-in">
                    {error && !data.contentIdeas?.length && !data.trends?.length ? (
                      <p className="text-sm text-slate-500 py-12 text-center">Nenhum dado gerado. Veja o erro acima e tente novamente.</p>
                    ) : null}
                    {activeTab === 'search' && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar pesquisa">
                                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                                {([['top', 'Mais aderentes'], ['recent', 'Recentes'], ['papers', 'Papers'], ['news', 'Notícias']] as [QuickFilter, string][]).map(([key, label]) => (
                                    <button key={key} onClick={() => setQuickFilter(key)} aria-pressed={quickFilter === key} className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${quickFilter === key ? 'bg-yellow-500 text-slate-950' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'}`}>{label}</button>
                                ))}
                                {phase === 'research' && <span className="text-[11px] text-slate-500 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> Buscando fontes gratuitas…</span>}
                                {phase === 'generating' && <span className="text-[11px] text-yellow-500/80 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> IA arquitetando as 12 copies em background… {genElapsed > 3 ? `(${genElapsed}s)` : ''}</span>}
                            </div>
                            {researchNote && <p className="text-xs text-slate-500">{researchNote}</p>}
                            {quick.length === 0 && phase !== 'research' ? (
                                <p className="text-sm text-slate-500 py-8 text-center">Sem resultados instantâneos para este nicho.</p>
                            ) : (
                                <ul className="grid grid-cols-1 gap-3">
                                    {filterSnippets(quick, quickFilter).map((s, i) => (
                                        <li key={`${s.url}-${i}`} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-yellow-500/30 transition-colors">
                                            <div className="flex items-start justify-between gap-3">
                                                <a href={s.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
                                                    <p className="text-sm font-bold text-slate-100 leading-snug hover:text-yellow-300">{s.title}</p>
                                                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{s.snippet}</p>
                                                </a>
                                                <span className="shrink-0 text-[10px] font-black text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-lg" title="Aderência ao nicho (TF título×3 + tipo + recentismo)">{s.score}</span>
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-[10px] text-slate-400 truncate">{s.source} · {s.sourceType}{s.date ? ` · ${s.date}` : ''}</p>
                                                <button onClick={() => copyToClipboard(`${s.title} — ${s.url}`)} className="text-[10px] font-bold text-indigo-400 hover:text-white uppercase transition-colors" aria-label={`Copiar fonte ${s.title}`}>Copiar</button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {activeTab === 'ideas' && (
                        <div className="space-y-12">
                            {!data.contentIdeas?.length && (
                                <SectionGenerateButton section="ideas" label="Nenhuma copy ainda — gere só as 12 copies (rápido, ~1 min)." />
                            )}
                            {['Topo de Funil', 'Meio de Funil', 'Fundo de Funil'].filter((stage) => data.contentIdeas?.some(i => i.stage === stage)).map((stage) => (
                                <section key={stage} className="space-y-4">
                                    <h3 className={`text-sm font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded w-fit ${stage === 'Topo de Funil' ? 'bg-blue-900/40 text-blue-400' : stage === 'Meio de Funil' ? 'bg-purple-900/40 text-purple-400' : 'bg-emerald-900/40 text-emerald-400'}`}>
                                        {stage} · {data.contentIdeas?.filter(i => i.stage === stage).length} opções
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {data.contentIdeas?.filter(i => i.stage === stage).map((idea, idx) => (
                                            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col hover:border-yellow-500/20 transition-all shadow-lg group">
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Opção {idea.option}</span>
                                                    <button onClick={() => copyToClipboard(copyIdeaText(idea))} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all" title="Copiar copy completa"><Copy className="w-4 h-4"/></button>
                                                </div>
                                                <h4 className="text-lg font-bold text-slate-100 mb-4 leading-tight">{idea.title}</h4>
                                                {idea.hook && (
                                                    <div className="mb-3 bg-yellow-500/5 border-l-4 border-yellow-500 p-3 rounded-r-xl">
                                                        <p className="text-[10px] font-black text-yellow-500 uppercase mb-1">Hook</p>
                                                        <p className="text-sm text-slate-200 leading-relaxed">{idea.hook}</p>
                                                    </div>
                                                )}
                                                {idea.headline && (
                                                    <div className="mb-3">
                                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Headline</p>
                                                        <p className="text-sm font-bold text-slate-100 leading-snug">{idea.headline}</p>
                                                    </div>
                                                )}
                                                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 text-slate-400 text-sm leading-relaxed mb-3 flex-1 whitespace-pre-wrap overflow-y-auto max-h-60 custom-scrollbar">
                                                    {idea.body || idea.content}
                                                </div>
                                                {idea.cta && (
                                                    <div className="mb-6 bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl">
                                                        <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">CTA</p>
                                                        <p className="text-sm text-slate-300">{idea.cta}</p>
                                                    </div>
                                                )}
                                                {!idea.cta && <div className="mb-6" />}
                                                <button onClick={() => handleDevelopIdea(copyIdeaText(idea))} className="w-full bg-slate-800 hover:bg-yellow-600 text-slate-400 hover:text-slate-950 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                                    <PenTool className="w-4 h-4"/> Desenvolver no Editor
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}

                    {activeTab === 'trends' && (
                        (!data.trends?.length ? (
                            <SectionGenerateButton section="trends" label="Nenhuma tendência ainda — gere só tendências + hashtags (rápido)." />
                        ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {data.trends?.map((trend, i) => (
                                <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-yellow-500/30 transition-all flex flex-col">
                                    <div className="flex items-center gap-2 text-yellow-500 mb-4"><TrendingUp className="w-5 h-5" /><span className="text-xs font-black uppercase tracking-widest">Tendência #{i+1}</span></div>
                                    <h4 className="text-xl font-bold text-white mb-3">{trend.title}</h4>
                                    <p className="text-slate-400 text-sm mb-6">{trend.description}</p>
                                    <div className="bg-slate-950 p-4 rounded-xl border-l-4 border-yellow-500 mb-6">
                                        <p className="text-[10px] font-black text-yellow-500 uppercase mb-2">Análise Estratégica</p>
                                        <p className="text-xs text-slate-300 italic">{trend.analysis}</p>
                                    </div>
                                    <button onClick={() => handleDevelopTrend(trend.title, trend.description, trend.analysis)} className="mt-auto w-full bg-slate-800 hover:bg-yellow-600 text-slate-400 hover:text-slate-950 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                        <PenTool className="w-4 h-4"/> Desenvolver na Edição
                                    </button>
                                </div>
                            ))}
                        </div>
                        ))
                    )}

                    {activeTab === 'content' && (
                        <div className="space-y-6">
                            {!data.contentFormats || (!data.contentFormats.infographic?.length && !data.contentFormats.video_script?.length && !data.contentFormats.article?.length) ? (
                                <SectionGenerateButton section="content" label="Nenhum formato ainda — gere só infográfico, roteiro e artigo (rápido)." />
                            ) : (
                                <>
                                    <div className="flex flex-wrap gap-2" role="group" aria-label="Formato de conteúdo">
                                        {([['infographic', 'Infográfico'], ['video_script', 'Roteiro de Vídeo'], ['article', 'Artigo']] as const).map(([key, label]) => (
                                            <button key={key} onClick={() => setActiveContentFormat(key)} aria-pressed={activeContentFormat === key} className={`px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all ${activeContentFormat === key ? 'bg-yellow-500 text-slate-950' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'}`}>{label}</button>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {(data.contentFormats?.[activeContentFormat] || []).map((f, i) => (
                                            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col hover:border-yellow-500/20 transition-all shadow-lg group">
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Ideia {i + 1}</span>
                                                    <button onClick={() => copyToClipboard(`${f.title}\n\n${f.outline}`)} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all" title="Copiar"><Copy className="w-4 h-4"/></button>
                                                </div>
                                                <h4 className="text-lg font-bold text-slate-100 mb-4 leading-tight">{f.title}</h4>
                                                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 text-slate-400 text-sm leading-relaxed mb-6 flex-1 whitespace-pre-wrap overflow-y-auto max-h-60 custom-scrollbar">
                                                    {f.outline}
                                                </div>
                                                <button onClick={() => handleDevelopIdea(`${f.title}\n\n${f.outline}`)} className="w-full bg-slate-800 hover:bg-yellow-600 text-slate-400 hover:text-slate-950 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                                    <PenTool className="w-4 h-4"/> Desenvolver no Editor
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTab === 'enemies' && (
                        <div className="space-y-4">
                            {!data.commonEnemies || data.commonEnemies.length === 0 ? (
                                <SectionGenerateButton section="enemies" label="Nenhum inimigo ainda — gere só os 6 inimigos do nicho (rápido)." />
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {data.commonEnemies!.map((e, i) => (
                                        <div key={i} className="bg-slate-900 border border-red-900/30 rounded-2xl p-6 hover:border-red-500/40 transition-all flex flex-col shadow-lg group">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">{e.kind || 'inimigo comum'}</span>
                                                <button onClick={() => copyToClipboard(`${e.label}\n\nÂNGULO: ${e.angle}${e.exampleHook ? `\n\nGANCHO: ${e.exampleHook}` : ''}`)} className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-800 rounded-lg text-slate-500 hover:text-white transition-all" title="Copiar"><Copy className="w-4 h-4"/></button>
                                            </div>
                                            <h4 className="text-lg font-bold text-slate-100 mb-2 leading-tight">{e.label}</h4>
                                            {e.whyItWorks && <p className="text-xs text-slate-500 italic mb-4">Por que funciona: {e.whyItWorks}</p>}
                                            <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 text-sm text-slate-300 leading-relaxed mb-3 whitespace-pre-wrap">
                                                {e.angle}
                                            </div>
                                            {e.exampleHook && (
                                                <div className="mb-6 bg-yellow-500/5 border-l-4 border-yellow-500 p-3 rounded-r-xl">
                                                    <p className="text-[10px] font-black text-yellow-500 uppercase mb-1">Gancho pronto</p>
                                                    <p className="text-sm text-slate-200">“{e.exampleHook}”</p>
                                                </div>
                                            )}
                                            <button onClick={() => handleDevelopIdea(`INIMIGO COMUM: ${e.label}\n\nÂNGULO: ${e.angle}${e.exampleHook ? `\n\nGANCHO: ${e.exampleHook}` : ''}`)} className="mt-auto w-full bg-slate-800 hover:bg-yellow-600 text-slate-400 hover:text-slate-950 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                                <PenTool className="w-4 h-4"/> Explorar na Edição
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'hashtags' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {data.hashtags && Object.entries(data.hashtags).map(([key, value]) => {
                                const tags = value as string[];
                                return (
                                    <div key={key} className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                                        <div className="flex items-center justify-between mb-6">
                                            <h4 className="font-black text-xs uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                {key === 'instagram' ? <Instagram className="w-4 h-4" /> : key === 'linkedin' ? <Linkedin className="w-4 h-4" /> : key === 'twitter' ? <Twitter className="w-4 h-4" /> : <Hash className="w-4 h-4 text-emerald-400" />} {key === 'seoKeywords' ? 'Palavras-Chave SEO' : key}
                                            </h4>
                                            <button onClick={() => copyToClipboard(tags.join(' '))} className="text-[10px] font-bold text-indigo-400 hover:text-white uppercase transition-colors">Copiar Todas</button>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {tags.map((tag: string, i: number) => (
                                                <span key={i} className="text-xs bg-slate-950 border border-slate-800 text-slate-400 px-3 py-1.5 rounded-lg hover:border-yellow-500/50 transition-colors select-all">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'sources' && (
                        <div className="space-y-4">
                            {!data.sources || data.sources.length===0 ? <p className="text-sm text-slate-500 py-8 text-center">Nenhuma fonte capturada para este nicho. O grounding usou apenas busca web.</p> : (
                                <div className="grid grid-cols-1 gap-3">
                                    {data.sources!.map((s, i) => (
                                        <a key={i} href={safeSourceHref(s.url)} target="_blank" rel="noreferrer noopener" className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-yellow-500/30 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                {s.type==='paper' ? <GraduationCap className="w-4 h-4 text-violet-400 shrink-0"/> : s.type==='news' ? <Newspaper className="w-4 h-4 text-sky-400 shrink-0"/> : <FileText className="w-4 h-4 text-emerald-400 shrink-0"/>}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-bold text-slate-100 truncate">{s.title}</p>
                                                    <p className="text-[10px] text-slate-500 truncate">{s.source} · {s.type}</p>
                                                </div>
                                            </div>
                                            <ExternalLink className="w-3.5 h-3.5 text-slate-600 shrink-0"/>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IdeaSession;