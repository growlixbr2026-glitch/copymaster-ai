import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

export interface WritingToolsMCPResponse {
    correctedText: string;
    analysis: {
        grammarScore: number;
        styleScore: number;
        readabilityScore: number;
        suggestions: string[];
    };
    timestamp: string;
}

export interface WritingVariantsResponse {
    variants: string[];
    analysis: {
        anglesUsed: string[];
        qualityIndicators: {
            flow: number;
            persuasion: number;
            clarity: number;
        };
    };
    timestamp: string;
}

// Remove cercas de código antes de parsear (modelos :free adoram embrulhar JSON em ```json).
const parseJson = <T>(text: string | undefined): T | null => {
    if (!text || !text.trim()) return null;
    try {
        return JSON.parse(text.replace(/```json|```/g, '').trim()) as T;
    } catch {
        return null;
    }
};

const nowIso = () => new Date().toISOString();

const failedAnalysis = (suggestion: string): WritingToolsMCPResponse['analysis'] => ({
    grammarScore: 0,
    styleScore: 0,
    readabilityScore: 0,
    suggestions: [suggestion],
});

const score = (value: unknown, fallback: number): number => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback;
};

export const analyzeWritingQuality = async (text: string, language: string = 'pt'): Promise<WritingToolsMCPResponse> => {
    const prompt = `
    ⚠️ **ANÁLISE DE QUALIDADE DE TEXTO (Item 7, 22, 37)** ⚠️
    Analise o seguinte texto considerando:
    1. Correção gramatical e ortográfica (Item 7 - Integridade Factual)
    2. Fluidez e coerência (Item 22 - Limites de Criatividade)
    3. Impacto persuasivo e ângulo único (Item 9 - Ângulo Único)
    4. Adaptação cultural para ${language.toUpperCase()} (Item 13 - Idioma e Localização)

    TEXTO A SER ANALISADO:
    ${text}

    RETORNE EM JSON:
    {
        "correctedText": "texto corrigido com manutenção do sentido original",
        "analysis": {
            "grammarScore": number,
            "styleScore": number,
            "readabilityScore": number,
            "suggestions": ["sugestão 1", "sugestão 2", ...]
        },
        "timestamp": "ISO timestamp"
    }
    `;

    const systemInstruction = `ATUE COMO: Editor-chefe e analista de qualidade de copywriting. Aplique a Constituição da IA V20 rigorosamente. Responda APENAS com o JSON solicitado.`;

    const raw = await callAI(prompt, systemInstruction, 'gemini-3-flash-preview', undefined, { maxTokens: 4096 });

    const parsed = parseJson<{
        correctedText?: string;
        analysis?: {
            grammarScore?: number;
            styleScore?: number;
            readabilityScore?: number;
            suggestions?: string[];
        };
        timestamp?: string;
    }>(raw.text);

    if (parsed && typeof parsed.correctedText === 'string') {
        return {
            correctedText: parsed.correctedText,
            analysis: {
                grammarScore: score(parsed.analysis?.grammarScore, 0),
                styleScore: score(parsed.analysis?.styleScore, 0),
                readabilityScore: score(parsed.analysis?.readabilityScore, 0),
                suggestions: Array.isArray(parsed.analysis?.suggestions)
                    ? parsed.analysis.suggestions.map(s => String(s))
                    : [],
            },
            timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : nowIso(),
        };
    }

    // Sem JSON utilizável: devolve o texto cru (não descarta trabalho do modelo).
    return {
        correctedText: raw.error ? '' : (raw.text || ''),
        analysis: failedAnalysis(raw.error || 'Não foi possível gerar análise'),
        timestamp: nowIso(),
    };
};

export const enhanceCopyWithTools = async (text: string, language: string = 'pt', targetPlatform: string = 'geral'): Promise<WritingToolsMCPResponse> => {
    const prompt = `
    ⚠️ **OTIMIZAÇÃO DE COPY PARA ${targetPlatform.toUpperCase()} (Item 12, 22, 24)** ⚠️
    Otimize o texto abaixo preservando o sentido, o ângulo único (Item 9) e a voz do autor.

    PLATAFORMA ALVO: ${targetPlatform}
    IDIOMA: ${language.toUpperCase()}

    Tarefas:
    1. Corrija erros gramaticais e ortográficos (Item 7)
    2. Melhore fluidez e ritmo sem descaracterizar o texto (Item 22)
    3. Adapte extensão e formato à plataforma (Item 24)
    4. Mantenha fatos e dados exatamente como estão — NÃO invente estatísticas (Item 18)
    5. Entregue TEXTO PURO sem Markdown, *, #, -, listas ou crases (Item 12)

    TEXTO ORIGINAL:
    ${text}

    RETORNE EM JSON:
    {
        "correctedText": "texto otimizado em texto puro",
        "analysis": {
            "grammarScore": number (0 a 100),
            "styleScore": number (0 a 100),
            "readabilityScore": number (0 a 100),
            "suggestions": ["o que foi melhorado e por quê", ...]
        },
        "timestamp": "ISO timestamp"
    }
    `;

    const systemInstruction = `ATUE COMO: Editor sênior de copywriting. Aplique a Constituição da IA V20 rigorosamente. Responda APENAS com o JSON solicitado.`;

    const raw = await callAI(prompt, systemInstruction, 'gemini-3-flash-preview', undefined, { maxTokens: 8192 });

    const parsed = parseJson<{
        correctedText?: string;
        analysis?: {
            grammarScore?: number;
            styleScore?: number;
            readabilityScore?: number;
            suggestions?: string[];
        };
        timestamp?: string;
    }>(raw.text);

    if (parsed && typeof parsed.correctedText === 'string') {
        return {
            correctedText: parsed.correctedText,
            analysis: {
                grammarScore: score(parsed.analysis?.grammarScore, 0),
                styleScore: score(parsed.analysis?.styleScore, 0),
                readabilityScore: score(parsed.analysis?.readabilityScore, 0),
                suggestions: Array.isArray(parsed.analysis?.suggestions)
                    ? parsed.analysis.suggestions.map(s => String(s))
                    : [],
            },
            timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : nowIso(),
        };
    }

    return {
        correctedText: raw.error ? '' : (raw.text || ''),
        analysis: failedAnalysis(raw.error || 'Não foi possível otimizar o texto'),
        timestamp: nowIso(),
    };
};

export const generateWritingVariants = async (text: string, language: string = 'pt', count: number = 2): Promise<WritingVariantsResponse> => {
    const safeCount = Math.max(1, Math.min(5, Math.floor(count) || 2));

    const prompt = `
    ⚠️ **VARIANTES DE COPY — ÂNGULO ÚNICO (Item 9)** ⚠️
    Gere exatamente ${safeCount} variantes do texto abaixo, cada uma com um ângulo distinto,
    mantendo o mesmo fato, oferta e CTA originais.

    IDIOMA: ${language.toUpperCase()}
    QUANTIDADE: ${safeCount}
    REGRAS:
    - NÃO invente dados, números ou URLs (Item 18) — use [INSERIR DADO] se faltar
    - TEXTO PURO por variante, sem Markdown, *, #, listas ou crases (Item 12)
    - Cada variante deve ser usável como está (copiar e colar)

    TEXTO ORIGINAL:
    ${text}

    RETORNE EM JSON:
    {
        "variants": ["variante 1", "variante 2", ...],
        "analysis": {
            "anglesUsed": ["nome do ângulo 1", "nome do ângulo 2", ...],
            "qualityIndicators": { "flow": number, "persuasion": number, "clarity": number }
        },
        "timestamp": "ISO timestamp"
    }
    `;

    const systemInstruction = `ATUE COMO: Diretor criativo de copywriting. Aplique a Constituição da IA V20 rigorosamente. Responda APENAS com o JSON solicitado.`;

    const raw = await callAI(prompt, systemInstruction, 'gemini-3-flash-preview', undefined, { maxTokens: 8192 });

    const parsed = parseJson<{
        variants?: unknown;
        analysis?: {
            anglesUsed?: unknown;
            qualityIndicators?: { flow?: number; persuasion?: number; clarity?: number };
        };
        timestamp?: string;
    }>(raw.text);

    if (parsed && Array.isArray(parsed.variants) && parsed.variants.length > 0) {
        return {
            variants: parsed.variants.map(v => String(v)),
            analysis: {
                anglesUsed: Array.isArray(parsed.analysis?.anglesUsed)
                    ? parsed.analysis.anglesUsed.map(a => String(a))
                    : [],
                qualityIndicators: {
                    flow: score(parsed.analysis?.qualityIndicators?.flow, 0),
                    persuasion: score(parsed.analysis?.qualityIndicators?.persuasion, 0),
                    clarity: score(parsed.analysis?.qualityIndicators?.clarity, 0),
                },
            },
            timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : nowIso(),
        };
    }

    // Sem JSON: se veio texto puro, trata como variante única (não descarta a resposta).
    const fallback = (raw.text || '').trim();
    return {
        variants: raw.error || !fallback ? [] : [fallback],
        analysis: {
            anglesUsed: [],
            qualityIndicators: { flow: 0, persuasion: 0, clarity: 0 },
        },
        timestamp: nowIso(),
    };
};
