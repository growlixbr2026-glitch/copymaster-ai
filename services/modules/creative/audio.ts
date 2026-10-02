import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import {
    getTTSPlatform,
    estimateWordsForDuration,
    clampDuration
} from '../../../data/tts';

/** Divisor entre o JSON de configuração da plataforma TTS e o roteiro de fala. */
export const CONFIG_END_DIVIDER = '|||CONFIG_END|||';

/** Parâmetros para geração de roteiro TTS (Sessão Áudio). */
export interface AudioScriptParams {
    /** ID do provedor TTS (ex: 'elevenlabs', 'google_cloud', 'gemini_tts', etc.) */
    provider: string;
    /** ID da voz escolhida (ou 'auto' para seleção automática pela IA) */
    voice: string;
    /** ID do modelo TTS da plataforma */
    model: string;
    /** Duração alvo em segundos (10-120) */
    duration: number;
    /** Contexto/briefing do usuário para o roteiro */
    context: string;
    /** Código do idioma de saída (ex: 'pt', 'en', 'es') */
    language: string;
}

/** Parâmetros para geração de prompt Suno (Sessão Música). */
export interface SunoPromptParams {
    /** Modo de geração (ex: 'Hit Completo', 'Letra Apenas', etc.) */
    mode: string;
    /** Gênero musical (ex: 'Pop', 'Hip Hop', 'Electronic', etc.) */
    style: string;
    /** Mood/vibe emocional (ex: 'Energético', 'Melancólico', 'Relaxante', etc.) */
    mood: string;
    /** Contexto/tema da música */
    context: string;
    /** Código do idioma de saída */
    language: string;
}

// Sessão Áudio (Media) — roteiro TTS para a plataforma escolhida.
// Contrato (AGENTS §4 sessão 23 + §7): entrada { provider, voice, model, duration,
// context, language } → saída JSON de configuração + "|||CONFIG_END|||" (linha própria)
// + roteiro com N palavras alvo da duração + "|||NOTA_DIVIDER|||".
/**
 * Gera um roteiro de áudio otimizado para a plataforma TTS escolhida.
 * @param params - Parâmetros de geração de áudio (provider, voice, model, duration, context, language)
 * @param onChunk - Callback opcional para streaming de resposta
 * @returns Promise resolvendo para resposta da IA com config JSON + divisor + roteiro + nota
 */
export const generateAudioScriptService = async (
    params: AudioScriptParams,
    onChunk?: (text: string) => void
) => {
    const platform = getTTSPlatform(params.provider);
    const duration = clampDuration(params.duration ?? 30);
    const targetWords = estimateWordsForDuration(duration);
    const wMin = Math.round(targetWords * 0.9);
    const wMax = Math.round(targetWords * 1.1);

    const voiceId = params.voice || 'auto';
    const voice = platform.voices.find(v => v.id === voiceId);
    const isAuto = !voice || voice.id === 'auto';
    const voiceInstruction = isAuto
        ? `🚨 SELEÇÃO AUTOMÁTICA: escolha 1 voz desta plataforma para o idioma do texto e justifique na Nota. VOZES DISPONÍVEIS (id → label): ${platform.voices.filter(v => v.id !== 'auto').map(v => `${v.id} → ${v.label}`).join(' | ')}`
        : `Use a voz exata: ${voice!.label} (id: ${voice!.id}). NÃO troque por outra voz.`;

    const modelId = params.model || platform.models[0]?.id || '';
    const modelLabel = platform.models.find(m => m.id === modelId)?.label || modelId;

    // Esqueleto real de configuração da plataforma com os valores obrigatórios já preenchidos
    const config = platform.configTemplate
        .replace(/\{\{model\}\}/g, modelId)
        .replace(/\{\{voice\}\}/g, isAuto ? '<ID_DA_VOZ_ESCOLHIDA>' : voiceId)
        .replace(/\{\{duration\}\}/g, String(duration))
        .replace(/\{\{words\}\}/g, String(targetWords));

    const prompt = `
    ⚠️ **MODO OPERAÇÃO: ROTEIRISTA DE ÁUDIO (REGRA #2)** ⚠️

    TASK: Create a professional audio script for TTS on ${platform.label}.
    Context: ${params.context}
    Language: ${params.language}

    🎙️ PLATAFORMA ALVO: ${platform.label}
    COMO FUNCIONA: ${platform.brief}
    CONTROLE DE DURAÇÃO: ${platform.durationNote}

    ⏱️ **DURAÇÃO OBRIGATÓRIA: ${duration} segundos → roteiro com ${targetWords} palavras (aceito ${wMin} a ${wMax}, ±10%).**
    Ritmo de referência: 156 palavras por minuto em português. Conte as palavras do roteiro e respeite a faixa — o tempo do áudio é o texto dividido pelo ritmo.

    🎤 VOZ: ${voiceInstruction}
    MODELO: ${modelLabel} (id: ${modelId})

    ⚠️ **DIRETRIZES DE SAÍDA (ZERO RÓTULOS):**
    1. Comece a resposta com o bloco JSON de configuração da plataforma (abaixo). Preencha apenas os parâmetros de qualidade (stability/style/speed/instructions/pitch/rate/emotion) conforme o contexto — NÃO altere voice/voice_id, model, duration_seconds nem target_words; se a voz for automática, troque o placeholder pelo id real da voz escolhida.
    2. Use o separador "${CONFIG_END_DIVIDER}" em linha própria entre o JSON e o roteiro.
    3. Depois do divisor: só o roteiro de ${targetWords} palavras para narração — fala pura, sem rótulos, sem instruções de palco, sem saudação.

    FORMATO OBRIGATÓRIO:
    ${config}
    ${CONFIG_END_DIVIDER}
    [Texto da Fala — ${targetWords} palavras]

    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    📋 **PARÂMETROS DE ÁUDIO:**
    *   **Plataforma:** ${platform.label}
    *   **Modelo:** ${modelLabel}
    *   **Voz:** ${isAuto ? '<voz escolhida + justificativa>' : `${voice!.label} (${voice!.id})`}
    *   **Duração alvo:** ${duration}s = ${targetWords} palavras (${wMin}–${wMax})

    🧠 **DIREÇÃO DE VOZ:** [Análise de entonação e ritmo. Se a voz foi automática, explique por que o perfil escolhido maximiza a conversão para este contexto.]
    `;
    // Passa undefined para usar o modelo padrão do callAI (evita hardcode)
    return callAI(prompt, "You are a Voice Director specializing in high-conversion ads.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, undefined, onChunk);
};

/**
 * Gera um prompt musical para o Suno AI.
 * @param params - Parâmetros de geração musical (mode, style, mood, context, language)
 * @param onChunk - Callback opcional para streaming de resposta
 * @returns Promise resolvendo para resposta da IA com letra/estrutura + nota
 */
export const generateSunoPromptService = async (
    params: SunoPromptParams,
    onChunk?: (text: string) => void
) => {
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
    // Passa undefined para usar o modelo padrão do callAI (evita hardcode)
    return callAI(prompt, "You are a Music Producer and Songwriter. Follow the output format strictly.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, undefined, onChunk);
};