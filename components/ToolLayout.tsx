
import React from 'react';
import { Lock, Unlock, AlertCircle, Home, ExternalLink } from 'lucide-react';
import { SectionHelp } from './SectionHelp';
import { useSharedContext } from '../contexts/SharedContext';
import { getPlatformLink } from '../services/modules/visual/platformProfiles';

export type OutputKind = 'image' | 'text';

export const OutputKindBadge: React.FC<{ kind: OutputKind }> = ({ kind }) => (
  <span
    title={kind === 'image' ? 'Esta sessão gera PROMPT para criar imagens em outra IA (Midjourney, DALL-E, etc.)' : 'Esta sessão gera TEXTO pronto para copiar e colar'}
    className={`text-[9px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-md border whitespace-nowrap ${
      kind === 'image'
        ? 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/40'
        : 'bg-sky-500/10 text-sky-300 border-sky-500/40'
    }`}
  >
    {kind === 'image' ? 'Prompt imagem' : 'Texto'}
  </span>
);

// Link oficial da plataforma de imagem selecionada (abre em nova aba).
export const EngineLink: React.FC<{ engine?: string }> = ({ engine }) => {
  const link = getPlatformLink(engine);
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-fuchsia-300/80 hover:text-fuchsia-200 transition-colors"
    >
      <ExternalLink className="w-3 h-3" aria-hidden="true" /> {link.hint}
    </a>
  );
};

interface ToolLayoutProps {
  title: string;
  icon: React.ElementType;
  iconColorClass: string;
  description: string;
  loading: boolean;
  error: string | null;
  isLocked: boolean;
  onToggleLock: () => void;
  sidebarContent: React.ReactNode;
  mainContent: React.ReactNode;
  hasResults: boolean;
  actions?: React.ReactNode;
  outputKind?: OutputKind;
  sessionId?: string; // Para guia F1 detalhado
}

export const ToolLayout: React.FC<ToolLayoutProps> = ({
  title,
  icon: Icon,
  iconColorClass,
  description,
  loading,
  error,
  isLocked,
  onToggleLock,
  sidebarContent,
  mainContent,
  hasResults,
  actions,
  outputKind = 'text',
  sessionId
}) => {
  const { setActiveTab } = useSharedContext();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-y-auto custom-scrollbar">
      {/* Sidebar Inputs */}
      <div className="lg:col-span-4 flex flex-col h-full">
        <div className={`bg-slate-900 border p-6 rounded-xl mb-6 flex-shrink-0 transition-all ${isLocked ? 'border-indigo-500/30 bg-slate-900/80 relative' : 'border-slate-700'}`}>
          
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-bold flex items-center gap-2 ${iconColorClass}`}>
              <Icon className="w-6 h-6" aria-hidden="true" /> {title}
              <OutputKindBadge kind={outputKind} />
              <SectionHelp title={title} description={description} sessionId={sessionId} />
            </h2>
            
            <div className="flex items-center gap-2 relative z-10">
                <button 
                    onClick={() => setActiveTab('home')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-all border border-transparent"
                    title="Voltar para o Início"
                >
                    <Home className="w-4 h-4" />
                    <span className="hidden sm:inline">Início</span>
                </button>

                <button 
                    onClick={onToggleLock}
                    className={`p-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold ${isLocked ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}
                >
                    {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    {isLocked ? "BLOQUEADO" : "LIVRE"}
                </button>
            </div>
          </div>
          
          <div className={`space-y-4 transition-opacity duration-300 ${isLocked ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
            {sidebarContent}
            
            {error && (
              <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm flex items-center gap-2" role="alert" aria-live="assertive">
                  <AlertCircle className="w-4 h-4" aria-hidden="true" /> {error}
              </div>
            )}

            {actions}
          </div>
        </div>
      </div>

      {/* Main Content / Output */}
      <div className="lg:col-span-8 flex flex-col h-full mb-10">
         <div className={`flex-1 bg-slate-950 rounded-xl border border-slate-800 flex flex-col relative shadow-2xl ${hasResults ? 'min-h-[500px]' : ''}`}>
            {mainContent}
         </div>
      </div>
    </div>
  );
};
