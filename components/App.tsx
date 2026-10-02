

import React, { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import { PenTool, Flame, ImagePlus, Youtube, Menu, X, Link2, GalleryHorizontal, BookOpen, PieChart, Quote, Newspaper, Settings, Wallet, Video, Instagram, Globe, MonitorPlay, Users, Mail, Play, LayoutTemplate, Megaphone, Type as TypeIcon, Notebook, Smile, Tv, Lightbulb, Sparkles, AlertTriangle, Palette, Moon, Sun, Paintbrush, Home, Stethoscope, FileText, TrendingUp, Swords, Send, BarChart2, DollarSign, Target, Briefcase, Wrench, UserMinus, Magnet, Rocket, TrendingDown, Map, RefreshCw, HeartHandshake } from 'lucide-react';
import { GLOBAL_LANGUAGES } from '../constants';
import { useTranslation } from '../hooks/useTranslation';
import { SharedContextProvider, useSharedContext } from '../contexts/SharedContext';
import { getCurrentCycleUsage } from '../services/usageService';
import { useTheme, ThemeMode } from '../contexts/ThemeContext';

// --- PERFORMANCE: Lazy load all tool components ---
const WelcomeScreen = lazy(() => import('./WelcomeScreen'));
const CopyGenerator = lazy(() => import('./CopyGenerator'));
const SexyCanvas = lazy(() => import('./SexyCanvas'));
const MediaPrompts = lazy(() => import('./MediaPrompts'));
const YouTubeSuite = lazy(() => import('./YouTubeSuite'));
const TikTokSuite = lazy(() => import('./TikTokSuite'));
const ReelsSuite = lazy(() => import('./ReelsSuite'));
const CarouselGenerator = lazy(() => import('./CarouselGenerator'));
const ComicGenerator = lazy(() => import('./ComicGenerator'));
const AdultAnimationGenerator = lazy(() => import('./AdultAnimationGenerator'));
const MemeGenerator = lazy(() => import('./MemeGenerator'));
const InfographicGenerator = lazy(() => import('./InfographicGenerator'));
const PresentationGenerator = lazy(() => import('./PresentationGenerator'));
const QuoteGenerator = lazy(() => import('./QuoteGenerator'));
const CitationGenerator = lazy(() => import('./CitationGenerator'));
const LetteringStudio = lazy(() => import('./LetteringStudio'));
const ArticleGenerator = lazy(() => import('./ArticleGenerator'));
const SettingsCenter = lazy(() => import('./SettingsCenter'));
const TokenDashboard = lazy(() => import('./TokenDashboard'));
const PersonaManager = lazy(() => import('./PersonaManager'));
const EmailStudio = lazy(() => import('./EmailStudio'));
const VSLStudio = lazy(() => import('./VSLStudio'));
const LandingPageStudio = lazy(() => import('./LandingPageStudio'));
const AdsStudio = lazy(() => import('./AdsStudio'));
const NotebookLMStudio = lazy(() => import('./NotebookLMStudio'));
const MagazineCoverStudio = lazy(() => import('./MagazineCoverStudio'));
const IdeaSession = lazy(() => import('./IdeaSession'));
const LogoStudio = lazy(() => import('./LogoStudio')); 
const QuotaErrorModal = lazy(() => import('./QuotaErrorModal'));
const StressDiagnostic = lazy(() => import('./StressDiagnostic'));
const InspirationStudio = lazy(() => import('./InspirationStudio'));
const PRDStudio = lazy(() => import('./PRDStudio'));
const SEOAuditStudio = lazy(() => import('./SEOAuditStudio'));
const KeywordStudio = lazy(() => import('./KeywordStudio'));
const ContentBriefStudio = lazy(() => import('./ContentBriefStudio'));
const CompetitorStudio = lazy(() => import('./CompetitorStudio'));
const OutreachStudio = lazy(() => import('./OutreachStudio'));
const RevOpsBriefStudio = lazy(() => import('./RevOpsBriefStudio'));
const PricingStrategyStudio = lazy(() => import('./PricingStrategyStudio'));
const ColdEmailStudio = lazy(() => import('./ColdEmailStudio'));
const BattleCardStudio = lazy(() => import('./BattleCardStudio'));
const EnablementStudio = lazy(() => import('./EnablementStudio'));
const DealDeskStudio = lazy(() => import('./DealDeskStudio'));
const AEPrepStudio = lazy(() => import('./AEPrepStudio'));
const SalesEngineerStudio = lazy(() => import('./SalesEngineerStudio'));
const CustomerSuccessStudio = lazy(() => import('./CustomerSuccessStudio'));
const SalesOperationsStudio = lazy(() => import('./SalesOperationsStudio'));
const LeadMagnetStudio = lazy(() => import('./LeadMagnetStudio'));
const LaunchPlanStudio = lazy(() => import('./LaunchPlanStudio'));
const ChurnPreventionStudio = lazy(() => import('./ChurnPreventionStudio'));
const PMFCanvasStudio = lazy(() => import('./PMFCanvasStudio'));
const GrowthFlywheelStudio = lazy(() => import('./GrowthFlywheelStudio'));
const PartnershipsStudio = lazy(() => import('./PartnershipsStudio'));
const ChannelEconomicsStudio = lazy(() => import('./ChannelEconomicsStudio'));


// --- ENGINE OPTIMIZATION: External Component ---
interface NavItemProps {
  id: string;
  label: string;
  icon: React.ElementType;
  colorClass: string;
  activeTab: string;
  onClick: (id: any) => void;
  isNew?: boolean;
}

const NavItem: React.FC<NavItemProps> = React.memo(({ id, label, icon: Icon, colorClass, activeTab, onClick, isNew }) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all font-medium text-sm group relative border ${
      activeTab === id 
      ? `bg-slate-950 border-slate-700 ${colorClass} shadow-lg shadow-black/20` 
      : 'text-slate-400 border-transparent hover:bg-slate-800/50 hover:text-slate-200'
    }`}
    aria-controls={`panel-${id}`}
    aria-selected={activeTab === id}
    role="tab"
  >
    <Icon className={`w-4 h-4 transition-colors ${activeTab === id ? colorClass : 'group-hover:text-white'}`} aria-hidden="true" />
    <span className="truncate">{label}</span>
    {isNew && (
      <span className="absolute right-3 w-1.5 h-1.5 bg-lime-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(132,204,22,0.6)]"></span>
    )}
  </button>
));

const UsageIndicator: React.FC<{ onNavigate: (id: string) => void, language: string }> = ({ onNavigate, language }) => {
    const { t } = useTranslation(language);
    const [usage, setUsage] = useState({ percent: 0, used: 0, limit: 1_000_000 });
    const [isVisible, setIsVisible] = useState(false);
    const [providerLabel, setProviderLabel] = useState('9Router');
    const [lastVia, setLastVia] = useState<string | null>(null);

    useEffect(() => {
        const calculateUsage = () => {
            try {
                const primary = localStorage.getItem('primary_text_provider') || 'openrouter';
                setProviderLabel(primary === '9router' ? '9Router' : primary.charAt(0).toUpperCase() + primary.slice(1));
                const usageData = getCurrentCycleUsage(primary);
                if (usageData && usageData.limit > 0) {
                    const percent = Math.min(100, Math.round((usageData.totalUsed / usageData.limit) * 100));
                    setUsage({
                        percent: isNaN(percent) ? 0 : percent,
                        used: usageData.totalUsed,
                        limit: usageData.limit,
                    });
                    setIsVisible(true);
                }
                try {
                    const raw = localStorage.getItem('copymaster_last_via');
                    if (raw) {
                        const v = JSON.parse(raw);
                        if (v && v.provider && Date.now() - (v.at || 0) < 3600_000) {
                            const short = String(v.model || '').split('/').pop()?.replace(/:free$/, '') || '';
                            setLastVia(`${v.provider}${short ? ` • ${short.slice(0, 28)}` : ''}`);
                        } else setLastVia(null);
                    } else setLastVia(null);
                } catch { setLastVia(null); }
            } catch (e) {
                console.error("Error calculating usage:", e);
                setIsVisible(false);
            }
        };

        calculateUsage();
        const interval = setInterval(calculateUsage, 15000);

        return () => clearInterval(interval);
    }, []);

    if (!isVisible) return null;

    let progressColor = 'bg-emerald-500';
    if (usage.percent > 75) progressColor = 'bg-yellow-500';
    if (usage.percent > 90) progressColor = 'bg-red-500';

    return (
        <div 
            className="px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 text-xs cursor-pointer hover:border-slate-700"
            onClick={() => onNavigate('wallet')}
            title="Clique para ver o Dashboard de Tokens"
        >
            <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-1.5 text-slate-400 font-bold">
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    <span>Uso {providerLabel}</span>
                </div>
                <div className={`font-bold ${usage.percent > 90 ? 'text-red-400' : 'text-slate-300'}`}>
                    {usage.percent}%
                </div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden border border-slate-900">
                <div className={`h-full rounded-full transition-all duration-300 ${progressColor}`} style={{ width: `${usage.percent}%` }}></div>
            </div>
            {lastVia && (
                <div className="text-slate-500 text-[10px] mt-1.5 flex items-center gap-1" title="Motor que serviu a última geração (fallback automático quando difere do primário)">
                    <Link2 className="w-3 h-3 text-emerald-500" />
                    <span>via {lastVia}</span>
                </div>
            )}
            {usage.percent > 90 && (
                 <div className="text-red-400/80 text-[10px] mt-1.5 flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3"/> Limite próximo. Considere usar sua própria chave API.
                 </div>
            )}
        </div>
    );
};

const ThemeSelector: React.FC = () => {
    const { theme, setTheme } = useTheme();

    return (
        <div className="flex bg-slate-950 rounded-lg border border-slate-800 p-1 mb-4 mx-4">
            <button 
                onClick={() => setTheme('normal')} 
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${theme === 'normal' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                title="Modo Normal (Foco)"
            >
                <Moon className="w-3 h-3" /> Normal
            </button>
            <button 
                onClick={() => setTheme('write')} 
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${theme === 'write' ? 'bg-slate-200 text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                title="Modo Escrita (Claro)"
            >
                <Sun className="w-3 h-3" /> Write
            </button>
            <button 
                onClick={() => setTheme('color')} 
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${theme === 'color' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                title="Modo Color (Criativo)"
            >
                <Paintbrush className="w-3 h-3" /> Color
            </button>
        </div>
    );
}

const AppContent: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState(GLOBAL_LANGUAGES[0]);
  const { t } = useTranslation(language);
  const { activeTab, setActiveTab, globalError, setGlobalError } = useSharedContext();
  const { theme } = useTheme(); 
  
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(['home']));

  useEffect(() => {
    setVisitedTabs(prev => new Set(prev).add(activeTab));
  }, [activeTab]);

  const handleNavClick = (id: any) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  // --- MEMOIZATION OPTIMIZATION ---
  const components = useMemo(() => ({
    'copy': <CopyGenerator language={language} />,
    'ideas': <IdeaSession language={language} onNavigate={handleNavClick} />,
    'personas': <PersonaManager language={language} />,
    'sexy': <SexyCanvas language={language} />,
    'carousel': <CarouselGenerator language={language} />,
    'youtube': <YouTubeSuite language={language} />,
    'article': <ArticleGenerator language={language} />,
    'quote': <QuoteGenerator language={language} />,
    'citation': <CitationGenerator language={language} />,
    'comic': <ComicGenerator language={language} />,
    'adultAnimation': <AdultAnimationGenerator language={language} />,
    'meme': <MemeGenerator language={language} />,
    'infographic': <InfographicGenerator language={language} />,
    'ppt': <PresentationGenerator language={language} />,
    'media': <MediaPrompts language={language} />,
    'notebook': <NotebookLMStudio language={language} />,
    'email': <EmailStudio language={language} />,
    'vsl': <VSLStudio language={language} />,
    'lp': <LandingPageStudio language={language} />,
    'ads': <AdsStudio language={language} />,
    'tiktok': <TikTokSuite language={language} />,
    'reels': <ReelsSuite language={language} />,
    'lettering': <LetteringStudio language={language} />,
    'magazine': <MagazineCoverStudio language={language} />,
    'logo': <LogoStudio language={language} />, 
    'settings': <SettingsCenter language={language} />,
    'wallet': <TokenDashboard language={language} />,
    'inspiration': <InspirationStudio language={language} />,
    'prd': <PRDStudio language={language} />,
    'seoAudit': <SEOAuditStudio language={language} />,
    'keywords': <KeywordStudio language={language} />,
    'contentBrief': <ContentBriefStudio language={language} />,
    'competitor': <CompetitorStudio language={language} />,
    'outreach': <OutreachStudio language={language} />,
    'revops': <RevOpsBriefStudio language={language} />,
    'pricing': <PricingStrategyStudio language={language} />,
    'coldEmail': <ColdEmailStudio language={language} />,
    'battleCard': <BattleCardStudio language={language} />,
    'enablement': <EnablementStudio language={language} />,
    'dealDesk': <DealDeskStudio language={language} />,
    'aePrep': <AEPrepStudio language={language} />,
    'salesEngineer': <SalesEngineerStudio language={language} />,
    'customerSuccess': <CustomerSuccessStudio language={language} />,
    'salesOps': <SalesOperationsStudio language={language} />,
    'leadMagnet': <LeadMagnetStudio language={language} />,
    'launch': <LaunchPlanStudio language={language} />,
    'churn': <ChurnPreventionStudio language={language} />,
    'pmf': <PMFCanvasStudio language={language} />,
    'flywheel': <GrowthFlywheelStudio language={language} />,
    'partnerships': <PartnershipsStudio language={language} />,
    'channelEconomics': <ChannelEconomicsStudio language={language} />,
    'stress': <StressDiagnostic language={language} />
  }), [language]); 
  
  const loadingFallback = (
    <div className="w-full h-full flex items-center justify-center text-slate-500 animate-pulse bg-slate-950">
        <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium">Carregando Módulo...</span>
        </div>
    </div>
  );

  // Layout ÚNICO (sessão e home). Um early-return `if (activeTab === 'home')`
  // trocava a forma da árvore raiz → React desmontava a árvore inteira →
  // "Voltar ao Início" perdia form/resultado/scroll de TODAS as sessões,
  // violando o contrato de keep-alive do §2 ("painel visitado nunca desmonta").
  // Agora a home é overlay por cima; os painéis ficam montados por baixo.
  const isHome = activeTab === 'home';
  return (
    <div className="flex h-screen h-[100dvh] bg-slate-950 overflow-hidden font-sans">
      {!isHome && (
      <button 
        className="lg:hidden absolute top-3 right-3 z-50 text-slate-300 bg-slate-800/80 backdrop-blur-md p-2 rounded-lg border border-slate-700 shadow-lg active:scale-95 transition-transform"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>
      )}

      {!isHome && (
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `} aria-label="Navegação Principal">
        
        <div className="p-4 pb-2">
          {/* Botão Voltar para Tela Inicial */}
          <button 
            onClick={() => handleNavClick('home')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg py-3 px-4 flex items-center justify-center gap-2 font-bold mb-4 transition-all hover:shadow-lg active:scale-95"
          >
            <Home className="w-4 h-4" /> 
            <span>Voltar ao Início</span>
          </button>

          <div className="flex items-center gap-3 px-2 mb-6">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <PenTool className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 leading-tight tracking-tight">{t('app_name')}</h1>
              <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">{t('subtitle')}</span>
            </div>
          </div>

          <div className="px-1 relative">
             <Globe className="w-3.5 h-3.5 absolute left-4 top-3 text-slate-500 z-10" aria-hidden="true" />
              <select 
                 className="w-full bg-slate-950 border border-slate-800 text-slate-400 text-xs rounded-lg py-2.5 pl-9 pr-3 outline-none focus:border-indigo-500 appearance-none font-semibold hover:border-slate-700 transition-colors cursor-pointer"
                 value={language}
                 aria-label="Idioma / Language"
                 onChange={(e) => setLanguage(e.target.value)}
              >
                {GLOBAL_LANGUAGES.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                ))}
             </select>
          </div>
        </div>

        {/* Theme Selector */}
        <ThemeSelector />

        <nav role="tablist" className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-4 space-y-6">
            {/* Menu da Sidebar mantido para navegação rápida entre ferramentas sem voltar à home */}
            <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Estratégia & Core</div>
                <div className="space-y-1">
                    <NavItem id="ideas" label={t('nav_ideas')} icon={Lightbulb} colorClass="text-yellow-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="copy" label={t('nav_copy')} icon={PenTool} colorClass="text-indigo-400" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="notebook" label={t('nav_notebook')} icon={Notebook} colorClass="text-lime-400" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="personas" label={t('nav_personas')} icon={Users} colorClass="text-emerald-400" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="prd" label={t('nav_prd')} icon={FileText} colorClass="text-cyan-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                </div>
            </div>
            <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Vendas & Conversão</div>
                <div className="space-y-1">
                    <NavItem id="email" label={t('nav_email')} icon={Mail} colorClass="text-sky-400" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="vsl" label={t('nav_vsl')} icon={Play} colorClass="text-red-500" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="lp" label={t('nav_lp')} icon={LayoutTemplate} colorClass="text-violet-400" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="ads" label={t('nav_ads')} icon={Megaphone} colorClass="text-emerald-500" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="sexy" label={t('nav_sexy')} icon={Flame} colorClass="text-rose-400" activeTab={activeTab} onClick={handleNavClick} />
                </div>
            </div>
            <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Vídeo Social</div>
                <div className="space-y-1">
                    <NavItem id="tiktok" label={t('nav_tiktok')} icon={Video} colorClass="text-fuchsia-400" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="reels" label={t('nav_reels')} icon={Instagram} colorClass="text-pink-500" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="youtube" label={t('nav_youtube')} icon={Youtube} colorClass="text-red-400" activeTab={activeTab} onClick={handleNavClick} />
                </div>
            </div>
            <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Visual & Design</div>
                <div className="space-y-1">
                    <NavItem id="logo" label={t('logo_title')} icon={Palette} colorClass="text-fuchsia-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="carousel" label={t('nav_carousel')} icon={GalleryHorizontal} colorClass="text-teal-400" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="magazine" label={t('mag_title')} icon={BookOpen} colorClass="text-fuchsia-400" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="quote" label={t('nav_quote')} icon={Quote} colorClass="text-cyan-400" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="citation" label={t('nav_citation')} icon={Quote} colorClass="text-amber-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="lettering" label={t('let_title')} icon={TypeIcon} colorClass="text-lime-400" activeTab={activeTab} onClick={handleNavClick} /> 
                    <NavItem id="comic" label={t('nav_comic')} icon={BookOpen} colorClass="text-yellow-400" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="adultAnimation" label={t('nav_adult_animation')} icon={Tv} colorClass="text-orange-400" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="meme" label={t('nav_meme')} icon={Smile} colorClass="text-violet-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} /> 
                    <NavItem id="infographic" label={t('nav_infographic')} icon={PieChart} colorClass="text-emerald-400" activeTab={activeTab} onClick={handleNavClick} />
                </div>
            </div>
            <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Geral & Mídia</div>
                <div className="space-y-1">
                    <NavItem id="article" label={t('nav_article')} icon={Newspaper} colorClass="text-blue-400" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="ppt" label={t('nav_ppt')} icon={MonitorPlay} colorClass="text-orange-400" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="media" label={t('nav_media')} icon={ImagePlus} colorClass="text-pink-400" activeTab={activeTab} onClick={handleNavClick} />
                    <NavItem id="inspiration" label={t('insp_title')} icon={Sparkles} colorClass="text-yellow-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                </div>
            </div>
            <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Marketing Avançado</div>
                <div className="space-y-1">
                    <NavItem id="seoAudit" label="SEO/AEO/GEO Audit" icon={Stethoscope} colorClass="text-cyan-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="keywords" label="Keyword Discovery" icon={TrendingUp} colorClass="text-emerald-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="contentBrief" label="Content Brief" icon={FileText} colorClass="text-blue-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="competitor" label="Competitor Analysis" icon={Swords} colorClass="text-red-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="outreach" label="Sales Outreach" icon={Send} colorClass="text-pink-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                </div>
            </div>
            <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Growth & MVP</div>
                <div className="space-y-1">
                    <NavItem id="leadMagnet" label="Lead Magnet" icon={Magnet} colorClass="text-indigo-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="launch" label="Launch Plan" icon={Rocket} colorClass="text-rose-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="churn" label="Churn Prevention" icon={TrendingDown} colorClass="text-red-500" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="pmf" label="PMF Canvas" icon={Map} colorClass="text-emerald-500" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="flywheel" label="Growth Flywheel" icon={RefreshCw} colorClass="text-blue-500" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="partnerships" label="Partnerships" icon={HeartHandshake} colorClass="text-pink-500" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="channelEconomics" label="Channel Economics" icon={PieChart} colorClass="text-amber-500" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                </div>
            </div>
            <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">RevOps & B2B Sales</div>
                <div className="space-y-1">
                    <NavItem id="revops" label="RevOps Brief" icon={BarChart2} colorClass="text-emerald-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="pricing" label="Pricing Strategy" icon={DollarSign} colorClass="text-amber-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="coldEmail" label="Cold Email B2B" icon={Mail} colorClass="text-sky-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="battleCard" label="Battle Card" icon={Swords} colorClass="text-red-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="enablement" label="Sales Enablement" icon={FileText} colorClass="text-violet-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="dealDesk" label="Deal Desk" icon={Target} colorClass="text-orange-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="aePrep" label="AE Prep" icon={Briefcase} colorClass="text-teal-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="salesEngineer" label="Sales Engineer" icon={Wrench} colorClass="text-cyan-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="customerSuccess" label="Customer Success" icon={UserMinus} colorClass="text-lime-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                    <NavItem id="salesOps" label="Sales Operations" icon={Users} colorClass="text-fuchsia-400" activeTab={activeTab} onClick={handleNavClick} isNew={true} />
                </div>
            </div>
            <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">Sistema</div>
                <div className="space-y-1">
                    <NavItem id="stress" label="Auditoria do Sistema" icon={Stethoscope} colorClass="text-emerald-400" activeTab={activeTab} onClick={handleNavClick} />
                </div>
            </div>
        </nav>

        <div className="p-4 pt-0">
            <UsageIndicator onNavigate={handleNavClick} language={language} />
        </div>

        <div className="p-4 pt-2 border-t border-slate-800 bg-slate-900 z-10">
             <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => { setActiveTab('wallet'); setSidebarOpen(false); }}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all font-bold text-xs border ${
                    activeTab === 'wallet' 
                    ? 'bg-slate-800 text-white border-slate-600' 
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <Wallet className="w-4 h-4" /> {t('nav_wallet')}
                </button>
                <button
                  onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg transition-all font-bold text-xs border ${
                    activeTab === 'settings' 
                    ? 'bg-slate-800 text-white border-slate-600' 
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <Settings className="w-4 h-4" /> {t('nav_settings')}
                </button>
             </div>

              <div className="px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center gap-2 text-[10px] text-slate-400">
                <Link2 className="w-3 h-3 text-emerald-500" />
                <span>Sistemas Integrados v10</span>
             </div>
        </div>
      </aside>
      )}

      <main className="flex-1 overflow-hidden relative bg-slate-950" aria-hidden={isHome || undefined}>
        {!isHome && (
        <button
          onClick={() => document.getElementById(`panel-${activeTab}`)?.focus()}
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:text-xs focus:font-bold"
        >
          Pular para o conteúdo
        </button>
        )}
        <div className="h-full overflow-y-auto p-2 lg:p-8 pt-16 lg:pt-8 custom-scrollbar scroll-smooth" role="tabpanel" id={`panel-${activeTab}`} aria-label={`Painel ${activeTab}`} tabIndex={-1}>
          <Suspense fallback={loadingFallback}>
            {Object.entries(components).map(([key, component]) => {
              const isActive = activeTab === key;
              return (
                <div
                    key={key}
                    style={{ display: isActive ? 'block' : 'none', contentVisibility: isActive ? 'visible' : 'auto' }}
                    className="h-full"
                    aria-hidden={!isActive}
                >
                    {visitedTabs.has(key) ? component : null}
                </div>
              );
            })}
          </Suspense>
        </div>
      </main>

      {/* HOME: overlay full-screen. Os painéis continuam montados dentro de
          <main> por baixo (aria-hidden), preservando estado entre sessões. */}
      {isHome && (
        <div className="fixed inset-0 z-40 bg-slate-950 overflow-y-auto">
          <Suspense fallback={loadingFallback}>
            <WelcomeScreen onNavigate={handleNavClick} language={language} />
          </Suspense>
        </div>
      )}

      {sidebarOpen && !isHome && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        ></div>
      )}

      {globalError && (
          <Suspense fallback={null}>
              <QuotaErrorModal 
                  onClose={() => setGlobalError(null)} 
                  onNavigate={handleNavClick}
                  message={typeof globalError === 'string' ? globalError : null}
              />
          </Suspense>
      )}
    </div>
  );
};

const App: React.FC = () => (
  <SharedContextProvider>
    <AppContent />
  </SharedContextProvider>
);

export default App;