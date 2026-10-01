import { callAI, VISUAL_MASTER_PROTOCOL, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { buildPlatformBlock, SESSION_HIERARCHY_RULE } from './platformProfiles';

export const generateMagazineCoverService = async (params: any, onChunk?: (text: string) => void) => {
    const platformBlock = buildPlatformBlock(params.aiModel, { aspectRatio: params.aspectRatio || params.ratio || '4:5', customText: params.headline });
    const prompt = `
    ${VISUAL_MASTER_PROTOCOL}

    === SESSION FUNCTION: editorial magazine cover prompt for ${params.magazine} on ${params.aiModel} ===
    Respect every user selector: headline "${params.headline}", subheadline "${params.subheadline || 'Nenhuma'}", footer "${params.footerText || 'Nenhuma'}", mood ${params.mood}.

    === TARGET ENGINE SYNTAX (mandatory, overrides generic protocol) ===
    ${platformBlock}
    ${SESSION_HIERARCHY_RULE}
    ⚠️ **MODO OPERAÇÃO: DIRETOR DE ARTE EDITORIAL (ITEM 6 & 24)** ⚠️
    ${params.referenceImages && params.referenceImages.length > 0 ? `⚠️ **INSTRUÇÃO OBRIGATÓRIA (REGRA #6 — há foto de referência anexada):**
    Inicie o prompt visual com a frase EXATA:
    "Usar a imagem em anexo para compor a imagem gerada".` : `⚠️ **SEM FOTO DE REFERÊNCIA:** crie o sujeito da capa do zero a partir do Contexto da Foto abaixo (NUNCA mencione "imagem em anexo").`}

    TASK: Criar Prompt de Capa de Revista para a marca ${params.magazine}.
    
    INPUTS TÉCNICOS:
    - Manchete: "${params.headline}"
    - Submanchete: "${params.subheadline || 'Nenhuma'}"
    - Rodapé/Edição: "${params.footerText || 'Nenhuma'}"
    - Atitude/Mood: ${params.mood}
    - Contexto da Foto: ${params.context}

    ⚠️ **ARQUITETURA DO PROMPT (EM INGLÊS):**
    1. Base Image Reference Rule.
    2. Magazine DNA Style (${params.magazine}).
    3. Lighting (Editorial studio quality).
    4. Typography details for headlines and subheadlines.
    5. Subject pose and attitude (${params.mood}).

    FORMATO: [Apenas o Prompt Técnico em Inglês]
    Escreva "|||NOTA_DIVIDER|||" sempre em linha própria e exato, sem quebrar em várias linhas. Nunca repita placeholders ou o nome do divisor no corpo do prompt.
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA (RELATÓRIO DE AUTORIDADE):**
    📋 **FICHA TÉCNICA DA CAPA:**
    *   **Motor IA Sugerido:** ${params.aiModel}
    *   **Estilo de Publicação:** ${params.magazine}
    *   **Vibe Psicológica:** ${params.mood}
    *   **Layout Tipográfico:** Manchete + Submanchete + Footer
    
    🧠 **ESTRATÉGIA DE STATUS:** [Por que este enquadramento comunica autoridade inquestionável?]
    `;

    return callAI(prompt, "You are a Senior Art Director for High-End Magazines.", 'gemini-3-pro-preview', onChunk, { taskType: 'visual', images: params.referenceImages || [], maxTokens: 8192 });
};