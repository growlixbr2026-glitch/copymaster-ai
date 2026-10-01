import { callAI, VISUAL_MASTER_PROTOCOL, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { buildPlatformBlock, SESSION_HIERARCHY_RULE } from './platformProfiles';

export const generateVideoPromptService = async (params: any, onChunk?: (text: string) => void) => {
    const platformBlock = buildPlatformBlock(params.aiModel, { aspectRatio: params.aspectRatio, customText: params.customText });
    const prompt = `
    ${VISUAL_MASTER_PROTOCOL}

    === SESSION FUNCTION: video keyframe/scene prompt for ${params.platform} on ${params.aiModel} ===
    Respect every user selector: style ${params.style}, aspect ${params.aspectRatio}, duration ${params.duration}, scenes ${params.sceneCount}, on-screen text ${params.customText || 'none'}.

    === TARGET ENGINE SYNTAX (mandatory, overrides generic protocol) ===
    ${platformBlock}
    ${SESSION_HIERARCHY_RULE}
    ⚠️ **MODO OPERAÇÃO: DIRETOR DE VÍDEO IA (ITEM 5 & 24)** ⚠️

    TASK: Create professional video prompts for ${params.aiModel}.
    PLATAFORMA DESTINO: ${params.platform}
    CONTÉM TEXTO: ${params.customText || 'Não'}
    
    ARQUITETURA DE 10 PASSOS DO PROMPT (EM INGLÊS):
    1. [Shot Type] 2. [Main Subject] 3. [Action] 4. [Environment] 5. [Lighting] 6. [Color Grade] 7. [Physics] 8. [Atmospheric Effects] 9. [Cinematic Style: ${params.style}] 10. [Tech Specs]: --ar ${params.aspectRatio.replace(/[^0-9:]/g, '')} --duration ${params.duration}

    OUTPUT:
    Gere ${params.sceneCount} cena(s). Se mais de 1, use "|||SCENE_DIVIDER|||".

    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA (DIREÇÃO CINEMATOGRÁFICA):**
    📋 **FICHA TÉCNICA DO PROJETO:**
    *   **Motor de Vídeo:** ${params.aiModel}
    *   **Rede Social:** ${params.platform}
    *   **Proporção:** ${params.aspectRatio}
    *   **Duração:** ${params.duration}
    *   **Estilo Visual:** ${params.style}
    *   **Volume de Cenas:** ${params.sceneCount}

    🧠 **TESES DE NARRATIVA:** [Por que este movimento de câmera favorece a retenção?]
    `;
    return callAI(prompt, "You are an AI Video Director.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', onChunk, { taskType: 'visual', maxTokens: 8192 });
};