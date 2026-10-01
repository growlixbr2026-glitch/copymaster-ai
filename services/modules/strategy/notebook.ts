
import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

export const generateNotebookLMService = async (params: any, onChunk?: (text: string) => void) => {
    const prompt = `
    ⚠️ **MODO OPERAÇÃO: ENGENHEIRO DE CONHECIMENTO (ITEM 24)** ⚠️
    
    TASK: Gerar conteúdo fonte para NotebookLM.
    MODO: ${params.mode} | OBJETIVO: ${params.objective}
    CONTEXTO: ${params.context}
    LANGUAGE: ${params.language || 'pt'} (todo o conteúdo fonte e a nota NESTE idioma — ITEM 13).

    ⚠️ **REGRA #32 (VALIDAÇÃO OBRIGATÓRIA):** 
    Use Google Search para capturar 03 fatos ou estatísticas reais para validar o material.

    ⚠️ **REGRA #10 (CURADOR MESTRE):** 
    Organize as informações por densidade. Retire o ruído. Entregue apenas os insights de alto valor.

    FORMATO:
    [Conteúdo Estruturado]
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:** [Explicação da hierarquia de dados aplicada].
    `;
    return callAI(prompt, "You are a Knowledge Engineer Specialized in Structured Data.", 'gemini-3-flash-preview', onChunk, { tools: [{ googleSearch: {} }], maxTokens: 8192 });
};
