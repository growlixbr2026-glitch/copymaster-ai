
import { useState, useCallback } from 'react';
import { useSharedContext } from '../contexts/SharedContext';
import { toFriendlyError } from '../services/friendlyErrors';

/**
 * Custom hook to handle common AI generation loading/error states.
 */

// Quota/limite: detecção normalizada (case-insensitive) para nunca
// classificar 429/402/quota como erro genérico nem estourar JSON cru na UI.
const isQuotaError = (msg: string): boolean => {
  const low = String(msg || '').toLowerCase();
  return low.includes('quota') || low.includes('429') || low.includes('exceeded')
    || low.includes('402') || low.includes('credit') || low.includes('rate')
    || low.includes('tier_not_allowed') || low.includes('free-models-per-day');
};
export const useAIGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setGlobalError } = useSharedContext();

  // Legacy generate for blocking calls
  const generate = useCallback(async (
    serviceCall: () => Promise<{ text: string; error?: string | null }>,
    onSuccess: (text: string) => any
  ) => {
    setLoading(true);
    setError(null);
    setGlobalError(null); 

    try {
      const { text, error: serviceError } = await serviceCall();
      if (serviceError) {
        if (isQuotaError(serviceError)) {
            setGlobalError(toFriendlyError(serviceError));
        } else {
            setError(toFriendlyError(serviceError));
        }
      } else {
        onSuccess(text);
      }
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      const errorMessage = err.message || 'Ocorreu um erro inesperado durante a geração.';
      if (isQuotaError(errorMessage)) {
          setGlobalError(toFriendlyError(errorMessage));
      } else {
          setError(toFriendlyError(errorMessage));
      }
    } finally {
      setLoading(false);
    }
  }, [setGlobalError]);

  // New generateStream for real-time updates
  const generateStream = useCallback(async (
    serviceCall: (onChunk: (text: string) => void) => Promise<{ text: string; error?: string | null }>,
    onChunk: (text: string) => void,
    onComplete?: (finalText: string) => void
  ) => {
    setLoading(true);
    setError(null);
    setGlobalError(null);

    try {
        const { text, error: serviceError } = await serviceCall(onChunk);
        
        if (serviceError) {
            if (isQuotaError(serviceError)) {
                setGlobalError(toFriendlyError(serviceError));
            } else {
                setError(toFriendlyError(serviceError));
            }
        } else {
            // Provedores blocking (OpenRouter/NVIDIA/Groq/...) nunca chamam onChunk —
            // entrega o texto final aqui (idempotente: handlers reconstroem do texto completo).
            try { onChunk(text); } catch {}
            if (onComplete) onComplete(text);
        }
    } catch (err: any) {
        console.error("Stream Error:", err);
        const errorMessage = err.message || 'Erro no streaming.';
        if (isQuotaError(errorMessage)) {
            setGlobalError(toFriendlyError(errorMessage));
        } else {
            setError(toFriendlyError(errorMessage));
        }
    } finally {
        setLoading(false);
    }
  }, [setGlobalError]);

  return { loading, error, generate, generateStream, setError };
};