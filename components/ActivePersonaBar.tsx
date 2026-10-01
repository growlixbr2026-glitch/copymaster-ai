
import React from 'react';
import { useSharedContext } from '../contexts/SharedContext';
import { getActivePersona, setActivePersonaId } from '../services/personaService';
import { Users, X, ShieldCheck, UserCheck, ChevronRight } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

export const ActivePersonaBar: React.FC<{ language: string }> = ({ language }) => {
  const { setSharedContext } = useSharedContext();
  const persona = getActivePersona();
  const { t } = useTranslation(language);

  if (!persona) return null;

  const handleDeactivate = () => {
    if (confirm("Deseja desativar esta persona? O contexto global será limpo.")) {
        setActivePersonaId(null);
        setSharedContext('');
        window.location.reload(); // Hard refresh to sync all components
    }
  };

  return (
    <div className="mb-6 flex items-center justify-between bg-emerald-950/20 border border-emerald-500/30 p-2 pl-4 rounded-xl animate-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white shadow-lg border border-emerald-400/50">
          {persona.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">IA Operando Como:</span>
            <span className="text-sm font-bold text-slate-100">{persona.name}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
             <span className="flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5 text-emerald-500" /> Tom {persona.tone}</span>
             <ChevronRight className="w-2.5 h-2.5" />
             <span className="truncate max-w-[150px]">{persona.audience}</span>
          </div>
        </div>
      </div>
      <button 
        onClick={handleDeactivate}
        className="p-2 hover:bg-emerald-900/30 rounded-lg text-slate-500 hover:text-red-400 transition-all group"
        title="Desativar Persona"
      >
        <X className="w-4 h-4 group-hover:rotate-90 transition-transform" />
      </button>
    </div>
  );
};
