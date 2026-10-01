
import React, { useState } from 'react';
import { Info, X } from 'lucide-react';
import TextToSpeech from './TextToSpeech';

interface SectionHelpProps {
  title: string;
  description: string;
}

export const SectionHelp: React.FC<SectionHelpProps> = ({ title, description }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Função para processar quebras de linha e identificar títulos baseados em palavras-chave ou estrutura
  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return null;

      // Identifica títulos se a linha terminar com ':' ou começar com palavras-chave de instrução
      // Removemos a dependência de emojis ou asteriscos
      const isTitle = 
        (trimmed.endsWith(':') && trimmed.length < 60) ||
        ['Como usar', 'Dica', 'O que é', 'Modos', 'Funcionalidades', 'Ideal para', 'Saída da IA', 'Configuração', 'Elementos Chave'].some(keyword => trimmed.startsWith(keyword));
      
      // Identifica listas numéricas ou com hífens
      const isList = /^\d+\.|^-/.test(trimmed);
      
      return (
        <p key={i} className={`mb-2 ${isTitle ? 'font-bold text-white mt-4 text-base border-b border-slate-800 pb-1' : 'text-slate-300'} ${isList ? 'pl-4 border-l-2 border-slate-700 ml-1' : ''}`}>
          {line}
        </p>
      );
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="ml-auto sm:ml-2 text-slate-500 hover:text-indigo-400 transition-colors p-1 rounded-full hover:bg-slate-800/50"
        aria-label="Guia da Ferramenta"
        title="Como usar esta ferramenta?"
      >
        <Info className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-lg w-full relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950/50 rounded-t-xl shrink-0">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-400" />
                Guia: {title}
              </h3>
              <div className="flex items-center gap-2">
                {/* O TextToSpeech recebe o texto limpo */}
                <TextToSpeech text={description} language="pt-BR" className="bg-slate-800 border-slate-700 hover:bg-indigo-600 hover:text-white" />
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg">
                    <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content com Scroll */}
            <div className="p-6 overflow-y-auto custom-scrollbar text-sm leading-relaxed bg-slate-900">
              {renderContent(description)}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/30 rounded-b-xl flex justify-end shrink-0">
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition-colors border border-slate-700"
              >
                Entendi, fechar guia
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
