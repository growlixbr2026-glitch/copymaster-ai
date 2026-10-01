
import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface SpeechInputProps {
  onTranscript: (text: string) => void;
  language: string;
  className?: string;
}

// Definição de tipos para a Web Speech API (que pode não existir no TS padrão)
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const SpeechInput: React.FC<SpeechInputProps> = ({ onTranscript, language, className }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      setIsSupported(false);
    }
  }, []);

  const getLangCode = (fullLang: string) => {
    const lower = fullLang.toLowerCase();
    if (lower.includes('english')) return 'en-US';
    if (lower.includes('español')) return 'es-ES';
    return 'pt-BR'; // Default
  };

  const handleToggleListen = () => {
    if (!isSupported) {
      alert("Seu navegador não suporta reconhecimento de voz nativo. Tente usar o Google Chrome ou Edge.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false; // Para assim que terminar de falar
    recognition.interimResults = false;
    recognition.lang = getLangCode(language);

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        onTranscript(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert("Acesso ao microfone negado. Por favor, verifique as permissões do seu navegador e tente novamente.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  if (!isSupported) return null;

  return (
    <button
      onClick={handleToggleListen}
      type="button"
      className={`p-2 rounded-full transition-all flex items-center justify-center gap-2 ${
        isListening 
          ? 'bg-red-500/20 text-red-400 animate-pulse border border-red-500/50' 
          : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
      } ${className}`}
      title={isListening ? "Ouvindo... (Clique para parar)" : "Falar em vez de digitar"}
    >
      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      {isListening && <span className="text-xs font-bold">Ouvindo...</span>}
    </button>
  );
};

export default SpeechInput;