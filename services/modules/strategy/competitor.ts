import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { personaBlock } from '../copy/crewaiPersona';

export interface CompetitorParams {
    productName: string;
    productBrief: string;
    competitors: string;
    focusCriteria?: string;
    language?: string;
    crewPersona?: string;
}

export const generateCompetitorService = async (params: CompetitorParams, onChunk?: (text: string) => void) => {
    const focusCriteria = params.focusCriteria || 'all';

    const prompt = `
    ⚠️ **MODO OPERAÇÃO: COMPETITOR ALTERNATIVES (2026)** ⚠️
    ${personaBlock(params.crewPersona)}
    
    ⚠️ **HIERARQUIA DE VERDADE:**
    - PRODUTO: ${params.productName}
    - DESCRIÇÃO: ${params.productBrief}
    - CONCORRENTES: ${params.competitors}
    - CRITÉRIOS DE FOCO: ${focusCriteria}
    
    ⚠️ **DIRETRIZ DE QUALIDADE:**
    - Compare o produto com os concorrentes/alternativas.
    - Identifique pontos fortes e fracos de cada um.
    - Encontre gaps de mercado.
    - Recomende posicionamento.
    - Não invente dados — use [INSERIR DADO] quando necessário.
    
    ⚠️ **FORMATO DE RESPOSTA MANDATÓRIO:**
    Texto puro, sem Markdown. Divisores em linha própria.
    
    Estrutura:
    [MATRIZ DE COMPARAÇÃO]

    [PONTOS FORTES DOS CONCORRENTES]

    [GAPS IDENTIFICADOS]

    [NOSSO DIFERENCIAL RECOMENDADO]

    [SWOT RESUMIDO]

    [POSICIONAMENTO SUGERIDO]
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    `;

    const systemInstruction = `ATUE COMO: Estrategista de Marketing e Análise Competitiva. Conhece frameworks como SWOT, Porter's Five Jobs, Blue Ocean. Siga a Constitution da IA rigorosamente.\n${GOLDEN_SYSTEM_INSTRUCTIONS}`;

    return callAI(prompt, systemInstruction, 'gemini-3-pro-preview', onChunk, { maxTokens: 8192 });
};
