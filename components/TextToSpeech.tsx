
import React, { useState, useEffect } from 'react';
import { Volume2, StopCircle } from 'lucide-react';

interface TextToSpeechProps {
  text: string;
  language: string;
  className?: string;
  autoPlay?: boolean;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ text, language, className, autoPlay = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setIsSupported(false);
    }
  }, []);

  // Para a fala se o componente for desmontado
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const getLangCode = (fullLang: string) => {
    if (!fullLang) return 'pt-BR';
    const lower = fullLang.toLowerCase();
    if (lower.includes('english')) return 'en-US';
    if (lower.includes('español')) return 'es-ES';
    return 'pt-BR'; // Default
  };

  const handlePlay = () => {
    if (!isSupported || !text) return;

    // Cancela qualquer fala anterior
    window.speechSynthesis.cancel();

    try {
        const safeText = String(text);
        const newUtterance = new SpeechSynthesisUtterance(safeText);
        newUtterance.lang = getLangCode(language);
        newUtterance.rate = 1.0;
        newUtterance.pitch = 1.0;

        newUtterance.onstart = () => setIsPlaying(true);
        newUtterance.onend = () => setIsPlaying(false);
        newUtterance.onerror = () => setIsPlaying(false);

        window.speechSynthesis.speak(newUtterance);
    } catch (e) {
        console.error("Speech Synthesis Error:", e);
        setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  if (!isSupported) return null;

  return (
    <button
      onClick={isPlaying ? handleStop : handlePlay}
      className={`flex items-center justify-center gap-2 transition-all active:scale-95 ${
        isPlaying 
          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50' 
          : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border-slate-600'
      } border rounded-lg px-3 py-2 text-sm font-medium ${className}`}
      title={isPlaying ? "Parar leitura" : "Ler em voz alta"}
      aria-label={isPlaying ? "Parar leitura em voz alta" : "Ler resultado em voz alta"}
      disabled={!text}
    >
      {isPlaying ? (
        <>
          <StopCircle className="w-4 h-4 animate-pulse" /> 
          <span className="hidden sm:inline">Parar</span>
        </>
      ) : (
        <>
          <Volume2 className="w-4 h-4" /> 
          <span className="hidden sm:inline">Ouvir</span>
        </>
      )}
    </button>
  );
};

export default TextToSpeech;
