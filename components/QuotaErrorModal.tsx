
import React from 'react';
import { AlertTriangle, X, Settings, ExternalLink } from 'lucide-react';

interface QuotaErrorModalProps {
  onClose: () => void;
  onNavigate: (tab: string) => void;
  message?: string | null;
}

const QuotaErrorModal: React.FC<QuotaErrorModalProps> = ({ onClose, onNavigate, message }) => {
  
  const handleNavigate = () => {
    onNavigate('settings');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-red-700/50 rounded-2xl shadow-2xl w-full max-w-lg relative animate-in zoom-in-95 duration-300 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-xl font-bold text-red-400 flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            Cota de API Atingida
          </h3>
        </div>
        <div className="p-6 space-y-4 text-slate-300">
          {message ? (
            <p className="font-bold text-white break-words">{message}</p>
          ) : (
            <>
              <p>A chave de API gratuita compartilhada pela aplicação atingiu o limite de uso diário. Isso acontece quando muitos usuários utilizam o sistema ao mesmo tempo.</p>
              <p className="font-bold text-white">Para continuar usando o CopyMaster AI sem interrupções, você pode adicionar sua própria chave de API do Google AI Studio (Gemini).</p>
            </>
          )}
          <p className="text-xs text-slate-400">Suas chaves são salvas com segurança apenas no seu navegador e nunca são compartilhadas.</p>
        </div>
        <div className="p-6 border-t border-slate-800 bg-slate-950/50 rounded-b-2xl flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleNavigate}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Ir para Configurações
          </button>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            Obter Chave Gratuita
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white p-2 hover:bg-slate-800 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default QuotaErrorModal;