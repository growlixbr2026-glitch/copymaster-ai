import { callAI, VISUAL_MASTER_PROTOCOL, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { buildPlatformBlock, SESSION_HIERARCHY_RULE } from './platformProfiles';

export const generateLetteringService = async (params: any, onChunk?: (text: string) => void) => {
    const platformBlock = buildPlatformBlock(params.aiModel, { aspectRatio: params.aspectRatio, customText: params.text });
    const footerRule = params.footer 
        ? `🚨 **REQUISITO DE RODAPÉ:** Inclua em tipografia pequena no canto inferior: "${params.footer}"`
        : "";

    const prompt = `
    ${VISUAL_MASTER_PROTOCOL}
    ⚠️ **MODO OPERAÇÃO: LETTERING ARTIST (ITEM 5 & 24)** ⚠️
    
    TASK: Prompts técnicos para artes tipográficas cinematográficas.
    TEXTO PRINCIPAL: "${params.text || 'IA decide'}"
    TÉCNICA: ${params.technique} | SUPERFÍCIE: ${params.surface}
    ESTÉTICA: ${params.style} | COMPOSIÇÃO: ${params.composition}
    ${footerRule}

    === TARGET ENGINE SYNTAX (mandatory, overrides generic protocol) ===
    ${platformBlock}
    ${SESSION_HIERARCHY_RULE}

    ⚠️ **REQUISITO TÉCNICO (REGRA #5):**
    O prompt em INGLÊS deve detalhar: Kerning afiado, Ligatures personalizadas, Materialidade (ex: ${params.technique}), e luz atmosférica que valorize a textura de ${params.surface}. Tech Specs: engine-native aspect syntax ONLY from the TARGET ENGINE block (never invent flags).

    FORMATO:
    [Prompt 1] |||LETTERING_DIVIDER||| [Prompt 2]
    Escreva cada divisor em linha própria e exato, sem quebrar em várias linhas. Nunca repita placeholders ou nomes de divisores no corpo.
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA (3 linhas):** motor/proporção/estética + 1 frase de justificativa da técnica sobre a superfície.
    `;
    return callAI(prompt, "You are a Typography and Lettering Master. Prompts in English only.", 'gemini-3-flash-preview', onChunk, { taskType: 'visual', maxTokens: 8192 });
};