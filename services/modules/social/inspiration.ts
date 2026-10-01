import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS, VISUAL_MASTER_PROTOCOL } from '../../core/aiClient';
import { buildPlatformBlock, SESSION_HIERARCHY_RULE } from '../visual/platformProfiles';

export const generateInspirationService = async (params: any, onChunk?: (text: string) => void) => {
    const platformBlock = buildPlatformBlock(params.aiModel, { aspectRatio: params.aspectRatio, customText: params.footer || undefined });
    const prompt = `
    ${VISUAL_MASTER_PROTOCOL}

    === SESSION FUNCTION: inspiration cards (verified real quote + 10-step IMAGE prompt) on ${params.aiModel || 'motor automático'} ===
    Respect every user selector: category ${params.category} (${params.subCategory}), visual style ${params.visualStyle}, mood ${params.texture}, background ${params.bgColor || 'automático'}, font ${params.fontColor || 'automático'}. Quotes must be real and verified; visual prompt follows the engine syntax below.

    === TARGET ENGINE SYNTAX (mandatory) ===
    ${platformBlock}
    ${SESSION_HIERARCHY_RULE}
    ⚠️ **MODO OPERAÇÃO: CONTENT CURATOR (REGRA #32 & #4)** ⚠️
    
    TASK: Gerar cards de inspiração de alto impacto.
    CATEGORIA: ${params.category} (${params.subCategory})
    ESTILO VISUAL: ${params.visualStyle} | MOOD: ${params.texture}
    CORES: fundo ${params.bgColor || 'Automático'} | texto ${params.fontColor || 'Automático'}
    CONTEXTO: ${params.context}

    ⚠️ **GROUNDING OBRIGATÓRIO (PESQUISA REAL):**
    Use o Google Search para encontrar 03 citações REAIS e VERIFICADAS relacionadas a "${params.subCategory}" e ao tema "${params.context}". Evite frases genéricas "estilo coach".
    Sem evidência: marque a opção como [NÃO VERIFICADA]. PROIBIDO alegar verificação ("verificada", fonte, data) sem lastro real — espelhar citation.ts:121.

    ⚠️ **MATRIZ VISUAL DE CONTRASTE:**
    - O prompt deve garantir que o texto seja legível. 
    - Especifique: "High contrast", "Deep depth of field", "Clean typography area".

    MANDATORY: Separe as opções com "|||INSP_DIVIDER|||", sempre em linha própria e exato, sem quebrar em várias linhas. Nunca repita placeholders ou nomes de divisores no corpo. 
    Termine com "|||NOTA_DIVIDER|||" e Nota do Estrategista.

    FORMATO (cada opção é CANDIDATA até o juiz selar — nunca alegue verificação aqui):
    [Citação candidata (NÃO verificada)]
    [Prompt Visual 10-Steps em Inglês]
    ...
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    [Explique a origem da citação e por que a estética ${params.visualStyle} combina com a mensagem].
    `;
    return callAI(prompt, "You are an Art Director and Content Curator. Always verify facts using Google Search.", 'gemini-3-flash-preview', onChunk, { 
        tools: [{ googleSearch: {} }],
        taskType: 'visual' 
    });
};