import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { personaBlock } from '../copy/crewaiPersona';

export interface SEOAuditParams {
    siteUrl: string;
    focusArea?: string;
    competitorUrl?: string;
    notes?: string;
    language?: string;
    crewPersona?: string;
}

export const generateSEOAuditService = async (params: SEOAuditParams, onChunk?: (text: string) => void) => {
    const focusArea = params.focusArea || 'all';
    const competitorUrl = params.competitorUrl || '';
    const notes = params.notes || '';

    const prompt = `
    ⚠️ **MODO OPERAÇÃO: SEO/AEO/GEO AUDIT (2026)** ⚠️
    ${personaBlock(params.crewPersona)}
    
    ⚠️ **HIERARQUIA DE VERDADE:**
    - URL DO SITE: ${params.siteUrl}
    - FOCO: ${focusArea}
    - CONCORRENTE: ${competitorUrl || 'não informado'}
    - NOTAS: ${notes || 'nenhuma'}
    
    ⚠️ **DIRETRIZ DE QUALIDADE:**
    - Entregue uma auditoria completa em 3 camadas: SEO tradicional, AEO (Answer Engine Optimization), GEO (Generative Engine Optimization).
    - Use checklists 2026 atualizados.
    - Priorize P0 (crítico), P1 (importante), P2 (melhoria).
    - Não invente dados — use [INSERIR DADO] quando necessário.
    
    ⚠️ **FORMATO DE RESPOSTA MANDATÓRIO:**
    Texto puro, sem Markdown. Divisores em linha própria.
    
    Estrutura:
    [RESUMO EXECUTIVO]

    [PONTOS CRÍTICOS]

    [CHECKLIST TÉCNICO SEO]

    [CHECKLIST ON-PAGE SEO]

    [CHECKLIST AEO]

    [CHECKLIST GEO]

    [OPORTUNIDADES DE CONTEÚDO]

    [PRIORIZAÇÃO P0/P1/P2]
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    `;

    const systemInstruction = `ATUE COMO: Especialista em SEO, AEO e GEO com 15+ anos de experiência. Conhece os algoritmos do Google, Bing, ChatGPT, Perplexity e Gemini. Siga a Constituição da IA rigorosamente.\n${GOLDEN_SYSTEM_INSTRUCTIONS}`;

    return callAI(prompt, systemInstruction, 'gemini-3-pro-preview', onChunk, { maxTokens: 8192 });
};
