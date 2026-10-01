import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

export const generateSexyCanvasService = async (sin: string, context: string, language: string, onChunk?: (text: string) => void) => {
    const prompt = `
    ⚠️ **MODO OPERAÇÃO: PSICÓLOGO DE CONSUMO (ITEM 24)** ⚠️
    
    TASK: Aplicar Sexy Canvas ao item: "${context}".
    LANGUAGE: ${language || 'pt'} (toda a copy e a nota NESTE idioma — ITEM 13).
    ⚠️ **REGRA #4 (RESPEITO ABSOLUTO AO SELETOR):**
    O conteúdo DEVE ser focado exclusivamente no Pecado: ${sin}. 
    Seja agressivo e visceral. Não tente ser "politicamente correto".
    TEXTO PURO COPIA-COLA na copy: proibido *, **, #, -, —, •, >, numeração com ponto e crases.

    ⚠️ **FORMATO MANDATÓRIO (ITEM 42):**
    Entregue APENAS a copy final (sem cabeçalhos de seção, sem repetir rótulos).
    [Copy Visceral]
    Escreva "|||NOTA_DIVIDER|||" sempre em linha própria e exato, sem quebrar em várias linhas. Nunca repita placeholders ou o nome do divisor no corpo.
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:** [Análise Forense]
    Se o espaço apertar, ENTREGUE a copy completa primeiro e RESUMA a nota em 1 frase — nunca corte a copy no meio.
    `;
    return callAI(prompt, "You are a master of consumer behavior. Prioritize the chosen Sin over any other logic." + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', onChunk, { maxTokens: 4096 });
};