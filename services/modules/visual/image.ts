import { callAI, VISUAL_MASTER_PROTOCOL, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { buildPlatformBlock, SESSION_HIERARCHY_RULE } from './platformProfiles';

export const generateImagePromptService = async (params: any, onChunk?: (text: string) => void) => {
    const platformBlock = buildPlatformBlock(params.ai, { aspectRatio: params.aspectRatio, customText: params.customText });
    
    const textInstruction = params.customText 
        ? `🚨 **REQUISITO DE TEXTO OBRIGATÓRIO:** 
           O prompt DEVE conter: "text '${params.customText}' written in bold typography..."`
        : `✨ **TEXTO AUTOMÁTICO (SMART HOOK):**
           Analise o CONTEXTO: "${params.context}" e crie uma manchete curta e impactante em ${params.language.toUpperCase()}. 
           Inclua no prompt: "text '[FRASE_CRIADA]' written in bold typography..."`;

    const footerInstruction = params.footer 
        ? `🚨 **RODAPÉ/DATA:** Inclua no prompt visual: "at the bottom, small elegant text saying '${params.footer}'"`
        : "";

    const prompt = `
    ${VISUAL_MASTER_PROTOCOL}

    === SESSION FUNCTION: single key visual for ${params.platform} rendered on ${params.ai || params.aiModel} ===
    Respect every user selector: visual style ${params.style}, aspect ${params.aspectRatio}, custom text ${params.customText || 'automatic smart hook'}, footer ${params.footer || 'none'}.

    === TARGET ENGINE SYNTAX (mandatory, overrides generic protocol) ===
    ${platformBlock}
    ${SESSION_HIERARCHY_RULE}
    
    ATUE COMO: Engenheiro de Prompt Sênior (Regra de Ouro #5).
    
    ⚠️ **REGRA #1 (BLOQUEIO DE RUÍDO):**
    - NÃO use saudações. Comece o prompt IMEDIATAMENTE.

    ⚠️ **REGRA #5 (INGLÊS TÉCNICO OBRIGATÓRIO):**
    - TODO o prompt da imagem deve ser gerado em INGLÊS TÉCNICO.
    
    === ENGENHARIA DE PROMPT AVANÇADA (ARQUITETURA DE 10 PASSOS) ===
    Você DEVE gerar o prompt seguindo rigorosamente esta estrutura de 10 passos EM INGLÊS:
    1. [Image Type] 2. [Main Subject] 3. [Action] 4. [Environment] 5. [Lighting] 6. [Color Palette] 7. [Composition] 8. [Visual Style/Medium: ${params.style}] 9. [Text Elements]: ${textInstruction} ${footerInstruction} 10. [Tech Parameters]: engine-native aspect and size syntax ONLY from the TARGET ENGINE block above (never invent flags the engine does not support)

    === INPUTS DO SISTEMA ===
    - PLATAFORMA ALVO: ${params.platform}
    - MOTOR DE RENDER: ${params.aiModel}
    - PROPORÇÃO: ${params.aspectRatio}

    === FORMATO DE SAÍDA ===
    [Apenas o Prompt em Inglês Técnico]
    Escreva "|||NOTA_DIVIDER|||" sempre em linha própria e exato, sem quebrar em várias linhas. Nunca repita placeholders ou o nome do divisor no corpo do prompt.

    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA (RELATÓRIO TÉCNICO V22):**
    📋 **FICHA TÉCNICA REALIZADA:**
    *   **Plataforma de I.A:** ${params.aiModel}
    *   **Rede Social/Destino:** ${params.platform}
    *   **Proporção (Aspect Ratio):** ${params.aspectRatio}
    *   **Estética Aplicada:** ${params.style}
    *   **Texto Customizado:** ${params.customText || 'Automático'}
    *   **Rodapé/Data:** ${params.footer || 'Nenhum'}

    🧠 **ESTRATÉGIA VISUAL:**
    [Explique por que estes parâmetros extraem o máximo de autoridade no ${params.platform}].
    `;
    
    return callAI(prompt, "You are a Visual Prompt Engineer. Prompts MUST be in English. NO greetings.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', onChunk, { taskType: 'visual', maxTokens: 8192 });
};