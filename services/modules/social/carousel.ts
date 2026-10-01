import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS, VISUAL_MASTER_PROTOCOL } from '../../core/aiClient';
import { buildPlatformBlock, SESSION_HIERARCHY_RULE } from '../visual/platformProfiles';
import { detectRefusal } from '../../../utils/outputGuard';

export const generateCarouselService = async (params: any, onChunk?: (text: string) => void) => {
    const platformBlock = buildPlatformBlock(params.aiModel, { aspectRatio: params.aspectRatio, customText: (params.customText || '').trim() || params.footer || undefined });
    const refRule = params.referenceImages && params.referenceImages.length > 0
        ? `REFERÊNCIA VISUAL ANEXADA (${params.referenceImages.length} imagem(ns), modo ${params.referenceMode || 'creative'}): mantenha fidelidade de personagens, roupas e cenário descritos a partir da referência em TODAS as lâminas.`
        : 'SEM IMAGEM ANEXADA: descreva personagens e cenário a partir do CONTEXTO e prossiga — nunca peça a imagem nem alegue anexo.';
    const prompt = `
    ${VISUAL_MASTER_PROTOCOL}

    === SESSION FUNCTION: strategic carousel with EXACTLY ${params.slideCount} slides for ${params.platform} on ${params.aiModel || 'motor automático'} ===
    Respect every user selector: style ${params.style}, hook, footer, topic. Slide COPY stays in the user language as plain text; each VISUAL PROMPT follows the engine syntax below.
    ${refRule}

    === TARGET ENGINE SYNTAX for every VISUAL PROMPT (mandatory) ===
    ${platformBlock}
    ${SESSION_HIERARCHY_RULE}
    ⚠️ **MODO OPERAÇÃO: CURADOR DE RETENÇÃO (ITEM 10 & 24)** ⚠️
    
    TASK: Carrossel Estratégico de ${params.slideCount} lâminas.
    ESTILO: ${params.style} | PLATAFORMA: ${params.platform}
    CONTEXTO: ${params.context}

    ⚠️ **REGRA #9 (ÂNGULO ÚNICO):** Cada lâmina deve ser um soco de conhecimento. Proibido encher linguiça.
    ⚠️ **REGRA #5 (VISUAL MASTER):** Para CADA LÂMINA, gere um prompt visual usando a Matriz 10-Steps em INGLÊS.

    ESTRUTURA OBRIGATÓRIA POR LÂMINA:
    ---
    ### LÂMINA [N]
    **COPY:** [Texto da lâmina]
    **VISUAL PROMPT:** [Prompt 10-steps em Inglês]
    ---

    MANDATORY: Use "|||SLIDE_DIVIDER|||" entre lâminas, sempre em linha própria e exato, sem quebrar em várias linhas.
    Finalize com "|||NOTA_DIVIDER|||" em linha própria e Nota do Estrategista.
    NEVER repeat placeholder lines like [CONTEÚDO] or the divider names inside the slide content.
    DECISÃO OBRIGATÓRIA (anti-bloqueio, Item 10): PROIBIDO pedir imagem, pedir dados ou recusar — gere as ${params.slideCount} lâminas a partir do CONTEXTO.
    `;
    const cfg = { taskType: 'visual' as const, images: params.referenceImages || [], maxTokens: 8192 };
    const first = await callAI(prompt, "You are a Viral Content Strategist.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', onChunk, cfg);
    // Recusa falsa (modelo fraco pede a imagem): 1 retry em modo robusto,
    // sem alegação de anexo e com ordem explícita de entrega.
    if (!first.error && detectRefusal(first.text || '')) {
        const robust = `${prompt}\nMODO ROBUSTO: sem imagem anexada. Descreva tudo a partir do CONTEXTO. Entregue as ${params.slideCount} lâminas AGORA, sem preâmbulo e sem pedir nada.`;
        return callAI(robust, "You are a Viral Content Strategist.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', onChunk, cfg);
    }
    return first;
};