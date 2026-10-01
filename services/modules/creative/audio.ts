import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

export const generateAudioScriptService = async (params: any, onChunk?: (text: string) => void) => {
    const voiceInstruction = params.voice.includes("Automático") 
        ? "🚨 SELEÇÃO AUTOMÁTICA: Analise o contexto e determine o melhor perfil vocal (Idade, Gênero, Sotaque, Energia). Informe sua escolha na Nota do Estrategista."
        : `Use o perfil da voz: ${params.voice}`;

    const prompt = `
    ⚠️ **MODO OPERAÇÃO: ROTEIRISTA DE ÁUDIO (REGRA #2)** ⚠️

    TASK: Create a professional audio script for TTS.
    Context: ${params.context}
    Language: ${params.language}
    ${voiceInstruction}

    ⚠️ **DIRETRIZES DE SAÍDA (ZERO RÓTULOS):**
    1. Comece a resposta com um bloco JSON de configuração técnica.
    2. Use o separador "|||CONFIG_END|||" entre o JSON e o roteiro.

    FORMATO OBRIGATÓRIO:
    { "voice_settings": { "stability": 0.5, "similarity": 0.8 }, "model": "${params.model}" }
    |||CONFIG_END|||
    [Texto da Fala Aqui]
    
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    📋 **PARÂMETROS DE ÁUDIO:**
    *   **Provedor Selecionado:** ${params.provider}
    *   **Voz de Referência:** ${params.voice}
    *   **Modelo Técnico:** ${params.model}
    *   **Duração Estimada:** ${params.duration}s

    🧠 **DIREÇÃO DE VOZ:** [Análise de entonação e ritmo. Se a voz foi automática, explique por que o perfil escolhido maximiza a conversão para este contexto.]
    `;
    return callAI(prompt, "You are a Voice Director specializing in high-conversion ads.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', onChunk);
};

export const generateSunoPromptService = async (params: any, onChunk?: (text: string) => void) => {
    const prompt = `
    ⚠️ **MODO OPERAÇÃO: PRODUTOR MUSICAL (REGRA #4 & 24)** ⚠️
    
    TASK: Gerar uma letra de música e estrutura para o Suno AI, baseada no contexto do usuário.
    GÊNERO: ${params.style} | VIBE: ${params.mood}
    CONTEXTO PRINCIPAL: ${params.context}
    IDIOMA: ${params.language}

    ⚠️ **DIRETRIZES TÉCNICAS (REGRAS #5 & #29):**
    - A saída deve ser um prompt PRONTO para ser colado no Suno.
    - Estruture a música com seções claras (ex: [Verse], [Chorus], [Bridge]).
    - A letra deve ser original e refletir o contexto, estilo e mood solicitados.
    - PROIBIDO saudações ou explicações. Vá direto para a letra.

    FORMATO OBRIGATÓRIO:
    [Letra e Estrutura Musical]
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA (DIREÇÃO MUSICAL):**
    📋 **COMPOSIÇÃO TÉCNICA:**
    *   **Modo de Hit:** ${params.mode}
    *   **Gênero Musical:** ${params.style}
    *   **Vibe/Emoção:** ${params.mood}
    *   **Tese Criativa:** [Resumo da trilha sonora e da história da letra]
    `;
    return callAI(prompt, "You are a Music Producer and Songwriter. Follow the output format strictly.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', onChunk);
};