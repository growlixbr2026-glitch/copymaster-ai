import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { personaBlock } from '../copy/crewaiPersona';

export interface ContentBriefParams {
    primaryKeyword: string;
    topic: string;
    targetAudience?: string;
    searchIntent?: string;
    answerIntent?: string;
    secondaryKeywords?: string;
    brandVoice?: string;
    wordCountRange?: string;
    language?: string;
    crewPersona?: string;
}

export const generateContentBriefService = async (params: ContentBriefParams, onChunk?: (text: string) => void) => {
    const prompt = `
    ⚠️ **MODO OPERAÇÃO: SEARCH CONTENT BRIEF (2026)** ⚠️
    ${personaBlock(params.crewPersona)}
    
    ⚠️ **HIERARQUIA DE VERDADE:**
    - KEYWORD PRIMÁRIA: ${params.primaryKeyword}
    - TÓPICO: ${params.topic}
    - PÚBLICO-ALVO: ${params.targetAudience || 'não informado'}
    - INTENÇÃO DE BUSCA: ${params.searchIntent || 'informational'}
    - INTENÇÃO DE RESPOSTA: ${params.answerIntent || 'não informado'}
    - KEYWORDS SECUNDÁRIAS: ${params.secondaryKeywords || 'nenhuma'}
    - VOZ DA MARCA: ${params.brandVoice || 'não informada'}
    - CONTAGEM DE PALAVRAS: ${params.wordCountRange || '1500-2000'}
    
    ⚠️ **DIRETRIZ DE QUALIDADE:**
    - Crie um briefing completo para redator ou IA.
    - Inclua estrutura H1-H3, subtópicos obrigatórios, perguntas a responder.
    - Recomende schema markup (FAQPage, HowTo, Article).
    - Inclua critérios de aceitação claros.
    - Não invente dados — use [INSERIR DADO] quando necessário.
    
    ⚠️ **FORMATO DE RESPOSTA MANDATÓRIO:**
    Texto puro, sem Markdown. Divisores em linha própria.
    
    Estrutura:
    [TÍTULO SUGERIDO]

    [META DESCRIPTION]

    [ESTRUTURA H1-H3]

    [SUBTÓPICOS OBRIGATÓRIOS]

    [PERGUNTAS A RESPONDER]

    [LINKS INTERNOS SUGERIDOS]

    [FONTES CONFIÁVEIS]

    [SCHEMA MARKUP RECOMENDADO]

    [CRITÉRIOS DE ACEITAÇÃO]
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    `;

    const systemInstruction = `ATUE COMO: Estrategista de Conteúdo SEO com 10+ anos de experiência. Conhece briefs para redatores e IA. Siga a Constitution da IA rigorosamente.\n${GOLDEN_SYSTEM_INSTRUCTIONS}`;

    return callAI(prompt, systemInstruction, 'gemini-3-pro-preview', onChunk, { maxTokens: 8192 });
};
