import React, { useEffect, useState } from 'react';
import { 
  PenTool, Lightbulb, Users, Notebook, Mail, Play, LayoutTemplate, 
  Megaphone, Flame, Video, Instagram, Youtube, Palette, Sparkles, 
  Target, Rocket, CheckCircle2, TrendingUp, Zap, HelpCircle, Info, 
  ArrowRight, ShieldCheck, Globe, Star, GalleryHorizontal, BookOpen, 
  PieChart, Quote, Newspaper, MonitorPlay, ImagePlus, Type, Tv, Smile, ChevronDown, Lock, Brain, Trophy, Fingerprint, Crown, Mic2, MessageSquare, Briefcase, Share2, Stethoscope, Swords, Send, Magnet, TrendingDown, Map, RefreshCw, HeartHandshake, BarChart2, DollarSign, FileText, UserMinus, Wrench
} from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

interface WelcomeScreenProps {
  onNavigate: (key: string) => void;
  language: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNavigate, language }) => {
  const { t } = useTranslation(language);
  const [visible, setVisible] = useState(false);

  useEffect(() => { setVisible(true); }, []);

  const toolGroups = [
    {
      title: "Cérebro Estratégico & Pesquisa",
      subtitle: "A inteligência fundacional para dominar qualquer nicho.",
      color: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/30", iconColor: "text-amber-400",
      tools: [
        { id: 'ideas', icon: Lightbulb, label: "Sessão de Ideias", desc: "Pesquisa em tempo real via Grounding para encontrar o hype do momento." },
        { id: 'personas', icon: Fingerprint, label: "Gestor de Personas", desc: "Clonagem psicológica de clientes ideais para comunicação ultra-direcionada." },
        { id: 'notebook', icon: Notebook, label: "NotebookLM Studio", desc: "Estruturação de dados brutos em ativos de conhecimento hierárquicos." },
        { id: 'prd', icon: Briefcase, label: "PRD Vibe Studio", desc: "Ideia bruta vira PRD completo em PT-BR + tokens, pronto para Lovable/v0/Bolt gerarem o site." },
        { id: 'sexy', icon: Flame, label: "Sexy Canvas", desc: "Engenharia de desejo baseada nos 7 pecados capitais e instintos viscerais." },
        { id: 'inspiration', icon: Sparkles, label: "Estúdio de Inspiração", desc: "Citações verificadas e sabedoria clássica para autoridade moral." },
      ]
    },
    {
      title: "Motores de Escrita & Alta Conversão",
      subtitle: "Transforme palavras em armas de venda em massa.",
      color: "from-indigo-500/20 to-purple-500/20", border: "border-indigo-500/30", iconColor: "text-indigo-400",
      tools: [
        { id: 'copy', icon: Brain, label: "Copywriting Pro", desc: "Frameworks de elite para textos que anulam a resistência do comprador." },
        { id: 'email', icon: Mail, label: "Máquina de Emails", desc: "Sequências hipnóticas que nutrem e convertem leads no automático." },
        { id: 'vsl', icon: Play, label: "Roteiro VSL", desc: "Scripts de vídeo de vendas baseados nos maiores copywriters do mundo." },
        { id: 'lp', icon: LayoutTemplate, label: "Landing Pages", desc: "Wireframes e Vibe Coding para páginas que carregam e convertem." },
        { id: 'ads', icon: Megaphone, label: "Gestor de Ads", desc: "Criação de anúncios otimizados para ROI máximo em todas as redes." },
        { id: 'article', icon: Newspaper, label: "Redator de Artigos", desc: "Conteúdo denso otimizado para SEO e AEO (Search Engines de IA)." },
      ]
    },
    {
      title: "Domínio das Redes Sociais",
      subtitle: "Onde o algoritmo encontra a retenção absoluta.",
      color: "from-red-500/20 to-pink-500/20", border: "border-red-500/30", iconColor: "text-red-400",
      tools: [
        { id: 'youtube', icon: Youtube, label: "YouTube Studio", desc: "Roteiros de retenção, SEO técnico e prompts para thumbnails clickbait." },
        { id: 'tiktok', icon: Video, label: "TikTok Viral", desc: "Ganchos de 2 segundos para explodir o alcance orgânico e viralizar." },
        { id: 'reels', icon: Instagram, label: "Reels Studio", desc: "Estratégias de feed e reels para construção de comunidade e vendas." },
        { id: 'carousel', icon: GalleryHorizontal, label: "Carrossel Maker", desc: "Narrativas progressivas para maximizar o tempo de tela no Instagram." },
        { id: 'meme', icon: Smile, label: "Fábrica de Memes", desc: "Engenharia de humor para gerar identificação e compartilhamento massivo." },
      ]
    },
    {
      title: "Engajamento & Autoridade",
      subtitle: "Respostas que transformam comentário em autoridade real.",
      color: "from-amber-500/20 to-yellow-500/20", border: "border-amber-500/30", iconColor: "text-amber-400",
      tools: [
        { id: 'commentResponder', icon: MessageSquare, label: "Responder Comentários", desc: "Postagem, artigo, imagem ou comentário vira 3 respostas contextuais com fórmula ouro: ponto específico + valor novo + pergunta aberta." },
      ]
    },
    {
      title: "Engenharia Visual & Design",
      subtitle: "Design de autoridade que comunica poder instantâneo.",
      color: "from-fuchsia-500/20 to-blue-500/20", border: "border-fuchsia-500/30", iconColor: "text-fuchsia-400",
      tools: [
        { id: 'media', icon: ImagePlus, label: "Media Prompts", desc: "Protocolo Visual Master de 10 passos para imagens e vídeos cinematográficos." },
        { id: 'logo', icon: Crown, label: "Logo & Brand", desc: "Arquitetura de identidades visuais baseada em semiótica e branding." },
        { id: 'magazine', icon: BookOpen, label: "Autoridade Visual", desc: "Transforme-se em capa de revista de luxo para elevar seu status social." },
        { id: 'lettering', icon: Type, label: "Tipografia Artística", desc: "Lettering e design de texto para artes onde a mensagem é a arte." },
        { id: 'comic', icon: MessageSquare, label: "HQ & Quadrinhos", desc: "Storyboards e narrativas visuais para treinamentos ou entretenimento." },
        { id: 'citation', icon: Quote, label: "Citações Verificadas", desc: "Frases reais de personalidades, Bíblia e provérbios com checagem anti-alucinação." },
        { id: 'infographic', icon: PieChart, label: "Dados Visuais", desc: "Transforme informações complexas em infográficos fáceis de digerir." },
        { id: 'ppt', icon: MonitorPlay, label: "Apresentações", desc: "Roteirização de Pitch Decks para investidores e treinamentos corporativos." },
        { id: 'adultAnimation', icon: Tv, label: "Animação Adulta", desc: "Scripts ácidos e sarcásticos para vídeos de alto engajamento." },
      ]
    },
    {
      title: "Marketing Avançado",
      subtitle: "Ferramentas profissionais para SEO, AEO, GEO e vendas B2B.",
      color: "from-cyan-500/20 to-blue-500/20", border: "border-cyan-500/30", iconColor: "text-cyan-400",
      tools: [
        { id: 'seoAudit', icon: Stethoscope, label: "SEO/AEO/GEO Audit", desc: "Auditoria completa em 3 camadas: SEO tradicional, Answer Engine e Generative Engine Optimization." },
        { id: 'keywords', icon: TrendingUp, label: "Keyword Discovery", desc: "Descubra e priorize palavras-chave com volume, dificuldade e intenção de busca." },
        { id: 'contentBrief', icon: BookOpen, label: "Content Brief", desc: "Briefings completos de conteúdo com estrutura H1-H3, schema e critérios de aceitação." },
        { id: 'competitor', icon: Swords, label: "Competitor Analysis", desc: "Análise competitiva com matriz de comparação, SWOT e posicionamento." },
        { id: 'outreach', icon: Send, label: "Sales Outreach", desc: "Sequências de outreach personalizadas para e-mail, LinkedIn e telefone." },
      ]
    },
    {
      title: "Growth & MVP",
      subtitle: "Valide seu negócio, lance produtos e escale com loops de crescimento.",
      color: "from-blue-500/20 to-indigo-500/20", border: "border-blue-500/30", iconColor: "text-blue-400",
      tools: [
        { id: 'leadMagnet', icon: Magnet, label: "Lead Magnet Builder", desc: "Estruture iscas digitais com copy de landing e follow-up." },
        { id: 'launch', icon: Rocket, label: "Launch Plan", desc: "Timeline de lançamento em 3 fases com checklist e métricas." },
        { id: 'churn', icon: TrendingDown, label: "Churn Prevention", desc: "Playbook de retenção com ações preventivas e offers de save." },
        { id: 'pmf', icon: Map, label: "PMF Canvas", desc: "Validação de PMF com sinais Sean Ellis e experimentos." },
        { id: 'flywheel', icon: RefreshCw, label: "Growth Flywheel", desc: "Design de flywheel com loops de aquisição, ativação e retenção." },
        { id: 'partnerships', icon: HeartHandshake, label: "Partnerships", desc: "Shortlist de parceiros e proposta de valor." },
        { id: 'channelEconomics', icon: PieChart, label: "Channel Economics", desc: "Unit economics por canal: LTV/CAC, payback e priorização." },
      ]
    },
    {
      title: "RevOps & B2B Sales",
      subtitle: "Operações de receita, habilitação de vendas e qualificação de deals.",
      color: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/30", iconColor: "text-emerald-400",
      tools: [
        { id: 'revops', icon: BarChart2, label: "RevOps Brief", desc: "Métricas, automações e higiene de CRM/pipeline." },
        { id: 'pricing', icon: DollarSign, label: "Pricing Strategy", desc: "Estratégia de precificação em 3 tiers com âncora." },
        { id: 'coldEmail', icon: Mail, label: "Cold Email B2B", desc: "Cadências de cold email com assuntos e CTAs." },
        { id: 'battleCard', icon: Swords, label: "Battle Card", desc: "Matriz competitiva, SWOT e posicionamento." },
        { id: 'enablement', icon: FileText, label: "Sales Enablement", desc: "One-pager, talk track e objeções." },
        { id: 'dealDesk', icon: Target, label: "Deal Desk", desc: "Qualificação BANT/MEDDIC com go/no-go." },
        { id: 'aePrep', icon: Briefcase, label: "AE Prep", desc: "Brief de conta e mapa de stakeholders." },
        { id: 'salesEngineer', icon: Wrench, label: "Sales Engineer", desc: "Discovery técnico, RFP e plano de POC." },
        { id: 'customerSuccess', icon: UserMinus, label: "Customer Success", desc: "Health score, risco de churn e expansão." },
        { id: 'salesOps', icon: Users, label: "Sales Operations", desc: "Capacity planning e territórios." },
      ]
    },
    {
      title: "Sistema & Manutenção",
      subtitle: "Ferramentas para garantir a integridade e performance do sistema.",
      color: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/30", iconColor: "text-emerald-400",
      tools: [
        { id: 'stress', icon: Stethoscope, label: "Auditoria do Sistema", desc: "Verifica se todos os módulos estão operando dentro das Regras de Ouro." },
      ]
    }
  ];

  return (
    <main className={`min-h-screen bg-slate-950 text-slate-200 transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {/* HERO SECTION - FOCO EM COPYWRITING & PROMPT ENGINEERING */}
      <header className="relative pt-24 pb-32 px-6 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-indigo-600/10 blur-[120px] rounded-full"></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900/80 border border-indigo-500/30 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-300">CopyMaster V22 — Sistema de Alta Performance</span>
          </div>
          
          <h1 className="text-6xl lg:text-8xl font-black text-white leading-[0.9] mb-8 tracking-tighter animate-in fade-in slide-in-from-bottom-4 duration-700">
            O Arquiteto da <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-400">Conversão Digital</span>
          </h1>
          
          <p className="text-xl text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-6 duration-1000">
            Domine o mercado com a união entre <span className="text-white border-b border-indigo-500">Copywriting de Elite</span> e <span className="text-white border-b border-fuchsia-500">Engenharia de Prompt Avançada</span>. <br className="hidden md:block" /> 
            Pense como um estrategista, execute com a velocidade da IA.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <button 
              onClick={() => onNavigate('ideas')} 
              className="group relative w-full sm:w-auto px-12 py-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xl transition-all shadow-2xl shadow-indigo-600/40 flex items-center justify-center gap-4 active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              ABRIR SALA DE IDEIAS <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="text-left hidden md:block">
              <div className="flex items-center gap-1 text-amber-400 mb-1">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-3 h-3 fill-current" />)}
              </div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Protocolo Profissional v22</p>
            </div>
          </div>
        </div>
      </header>

      {/* TODAS AS FERRAMENTAS - SEM SIMPLIFICAÇÃO */}
      <section className="py-24 px-6 max-w-7xl mx-auto">
        {toolGroups.map((group, idx) => (
          <div key={idx} className="mb-32 last:mb-0 animate-in fade-in slide-in-from-bottom-10" style={{ animationDelay: `${idx * 200}ms` }}>
            <div className="flex items-center gap-4 mb-12 border-l-4 border-indigo-500 pl-6">
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight uppercase">{group.title}</h2>
                <p className="text-lg text-slate-500 font-medium">{group.subtitle}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {group.tools.map((tool) => (
                <button 
                  key={tool.id} 
                  onClick={() => onNavigate(tool.id)} 
                  className="group bg-slate-900/40 border border-slate-800 rounded-3xl p-6 text-left hover:bg-slate-900 transition-all hover:border-indigo-500/50 hover:-translate-y-2 active:scale-95 flex flex-col h-full relative overflow-hidden"
                >
                  <div className={`w-12 h-12 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${group.iconColor}`}>
                    <tool.icon className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2 tracking-tight group-hover:text-indigo-400 transition-colors">{tool.label}</h4>
                  <p className="text-slate-400 text-xs leading-relaxed flex-1 font-medium">
                    {tool.desc}
                  </p>
                  <div className="mt-6 flex items-center justify-between opacity-40 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Acessar Módulo</span>
                    <ArrowRight className="w-4 h-4 text-indigo-400" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* FOOTER PROFISSIONAL */}
      <footer className="pt-32 pb-16 px-8 border-t border-slate-900 bg-slate-950/80">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-16 mb-20">
          <div className="md:col-span-6">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-indigo-600 rounded-xl">
                <PenTool className="text-white w-6 h-6" />
              </div>
              <span className="text-3xl font-black text-white tracking-tighter uppercase">CopyMaster AI</span>
            </div>
            <p className="text-slate-400 text-lg leading-relaxed max-w-xl mb-10 font-medium">
              Transforme seu marketing em um processo científico de alta fidelidade. Arquite sua autoridade digital com a união perfeita entre Psicologia, Design e Inteligência Artificial de elite.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-[10px] text-emerald-500 bg-emerald-500/10 px-6 py-3 rounded-xl border border-emerald-500/20 font-black uppercase tracking-[0.2em]">
                <ShieldCheck className="w-4 h-4" /> SSL SECURE
              </div>
              <div className="flex items-center gap-2 text-[10px] text-blue-500 bg-blue-500/10 px-6 py-3 rounded-xl border border-blue-500/20 font-black uppercase tracking-[0.2em]">
                <Globe className="w-4 h-4" /> V22.0.2 ALPHA
              </div>
            </div>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-white font-black text-xs uppercase tracking-[0.3em] mb-10">Links Rápidos</h4>
            <ul className="space-y-4 text-sm text-slate-500 font-bold">
              <li><button onClick={() => onNavigate('ideas')} className="hover:text-white transition-all">Estratégia</button></li>
              <li><button onClick={() => onNavigate('copy')} className="hover:text-white transition-all">Copywriting</button></li>
              <li><button onClick={() => onNavigate('media')} className="hover:text-white transition-all">Engenharia Visual</button></li>
              <li><button onClick={() => onNavigate('wallet')} className="hover:text-white transition-all">Dashboard de Uso</button></li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-white font-black text-xs uppercase tracking-[0.3em] mb-10">Configurações</h4>
            <ul className="space-y-4 text-sm text-slate-500 font-bold">
              <li><button onClick={() => onNavigate('settings')} className="hover:text-white transition-all">Gerenciar Chaves API</button></li>
              <li><button onClick={() => onNavigate('personas')} className="hover:text-white transition-all">Gerenciar Marcas</button></li>
              <li className="flex items-center gap-3 text-yellow-500">
                <Star className="w-5 h-5 fill-current" />
                <span className="text-white">Premium Grade AI</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto pt-16 border-t border-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] text-slate-600 font-black uppercase tracking-[0.4em]">
          <span>&copy; {new Date().getFullYear()} COPYMASTER SYSTEMS INC.</span>
          <span className="text-slate-700">28 módulos · 100% client-side</span>
        </div>
      </footer>
    </main>
  );
};

export default WelcomeScreen;