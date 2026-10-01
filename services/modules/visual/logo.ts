import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS, VISUAL_MASTER_PROTOCOL } from '../../core/aiClient';
import { buildPlatformBlock, SESSION_HIERARCHY_RULE } from './platformProfiles';
import { detectRefusal } from '../../../utils/outputGuard';

export const generateLogoBriefService = async (params: any, onChunk?: (text: string) => void) => {
    const platformBlock = buildPlatformBlock(params.aiModel, { aspectRatio: params.aspectRatio || '1:1', customText: params.brandName || undefined });
    const influencePrompt = `
    🎨 **REFERÊNCIAS DE ESTILO:**
    - Influência de Pintor: ${params.artistInfluence}
    - Estilo de Designer: ${params.designerStyle}
    `;

    const prompt = `
    ${VISUAL_MASTER_PROTOCOL}
    ⚠️ **MODO OPERAÇÃO: BRAND ARCHITECT (ITEM 24)** ⚠️
    
    TASK: Criar 02 conceitos de logotipos técnicos e profissionais.
    MARCA: ${params.brandName} | NICHO: ${params.niche || params.context || 'não informado'}
    ARQUÉTIPO: ${params.archetype} | ESTILO BASE: ${params.style}
    ${influencePrompt}

    === TARGET ENGINE SYNTAX (mandatory, overrides generic protocol) ===
    ${platformBlock}
    ${SESSION_HIERARCHY_RULE}

    ⚠️ **REGRA #5 (VISUAL MASTER):**
    Gere o prompt usando a MATRIZ 10-STEPS em INGLÊS focada em VETORES:
    - Mescle o conceito de ${params.artistInfluence} com a precisão de ${params.designerStyle}.
    - Medium: High-fidelity Vector Logo (Minimalist).
    - Subject: [Símbolo central baseado no nicho].
    - Background: Solid flat white.
    - Tech: No shading, 8k, sharp lines.

    MANDATORY: 
    - Use "|||LOGO_OPTION_DIVIDER|||" entre as 2 opções, sempre em linha própria e exato, sem quebrar em várias linhas.
    - Use "|||NOTA_DIVIDER|||" em linha própria antes da nota. Nunca repita nomes de divisores ou placeholders no corpo das opções.
    
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA (DIREÇÃO DE ARTE):**
    📋 **PARÂMETROS DE MARCA:**
    *   **Arquétipo:** ${params.archetype}
    *   **Artista de Referência:** ${params.artistInfluence}
    *   **Escola de Design:** ${params.designerStyle}
    *   **Plataforma Alvo:** ${params.platform || 'Automático'}

    🧠 **ANÁLISE SEMIÓTICA:** [Por que este símbolo comunica ${params.archetype} e como a influência de ${params.artistInfluence} eleva o valor percebido?]
    DECISÃO OBRIGATÓRIA (anti-bloqueio, Item 10): PROIBIDO pedir parâmetros, pedir dados ou recusar — gere as 2 opções a partir do CONTEXTO.
    `;
    const cfg = { taskType: 'visual' as const, maxTokens: 8192 };
    const first = await callAI(prompt, "You are a World-Class Brand Designer and Visual Prompt Engineer.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', onChunk, cfg);
    if (!first.error && detectRefusal(first.text || '')) {
        const robust = `${prompt}\nMODO ROBUSTO: sem perguntas de volta. Entregue as 2 opções AGORA a partir do CONTEXTO, sem preâmbulo.`;
        return callAI(robust, "You are a World-Class Brand Designer and Visual Prompt Engineer.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', onChunk, cfg);
    }
    return first;
};