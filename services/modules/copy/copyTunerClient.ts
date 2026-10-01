import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

export interface CopyTunerClientMCPResponse {
    translatedText: string;
    qualityScore: number;
    detectedIssues: string[];
    timestamp: string;
}

// Converte a resposta do callAI (texto livre ou JSON) no formato CopyTunerClientMCPResponse.
// Tolerante: se o modelo devolver JSON entre crases ou texto puro, ainda assim entrega algo útil.
const toTunerResponse = (
    raw: { text?: string; error?: string },
    fallbackIssue: string
): CopyTunerClientMCPResponse => {
    const now = new Date().toISOString();
    const text = (raw.text || '').trim();

    if (!text) {
        return {
            translatedText: '',
            qualityScore: 0,
            detectedIssues: [raw.error || fallbackIssue],
            timestamp: now,
        };
    }

    try {
        const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
        const score = Number(parsed.qualityScore);
        return {
            translatedText: String(parsed.translatedText ?? ''),
            qualityScore: Number.isFinite(score) ? score : 90,
            detectedIssues: Array.isArray(parsed.detectedIssues)
                ? parsed.detectedIssues.map((i: unknown) => String(i))
                : [],
            timestamp: typeof parsed.timestamp === 'string' ? parsed.timestamp : now,
        };
    } catch {
        // Modelo ignorou o JSON e devolveu texto puro (Item 12) — entrega como está.
        return {
            translatedText: text,
            qualityScore: 90,
            detectedIssues: ['Fora do formato JSON solicitado; entregue como texto puro'],
            timestamp: now,
        };
    }
};

export const translateWithCopyTuner = async (
    text: string,
    targetLanguage: 'pt' | 'en' | 'es' = 'pt',
    sourceLanguage: 'pt' | 'en' | 'es' | 'auto' = 'auto',
    platform: 'copy' | 'email' | 'ads' | 'social' | 'general' = 'general'
): Promise<CopyTunerClientMCPResponse> => {
    const prompt = `
    ⚠️ **TRADUÇÃO OTIMIZADA VIA MCP COPYTUNER (Item 13 & #24)** ⚠️
    Traduza e adapte o seguinte texto de copywriting para o idioma alvo, mantendo:
    1. Significado original e ângulo único (Item 9)
    2. Referências culturais locais do mercado brasileiro (Item 13)
    3. Tom e estilo da copy original (Item 22)
    4. Textos puros - SEM Markdown, asteriscos, cerquilhas, pipes (Item 12)
    5. Adaptação para plataforma: ${platform} (Item 24)

    IDIOMA ORIGINAL: ${sourceLanguage === 'auto' ? 'Detectado automaticamente' : sourceLanguage.toUpperCase()}
    IDIOMA ALVO: ${targetLanguage.toUpperCase()}

    TEXTO A SER TRADUZIDO:
    ${text}

    RETORNE EM JSON:
    {
        "translatedText": "texto traduzido em texto puro, sem formatação Markdown",
        "qualityScore": number (0 a 100),
        "detectedIssues": ["problema 1", "problema 2", ...] ou vazio se perfeito,
        "timestamp": "ISO timestamp"
    }
    `;

    const systemInstruction = `ATUE COMO: Tradutor e localizador de copywriting. Aplique a Constituição da IA V20. Responda APENAS com o JSON solicitado, sem comentários antes ou depois.`;

    const rawResult = await callAI(prompt, systemInstruction, 'gemini-3-flash-preview', undefined, { maxTokens: 8192 });
    return toTunerResponse(rawResult, 'Não foi possível gerar tradução');
};

export const adaptCopyForPlatform = async (
    text: string,
    targetPlatform: 'instagram' | 'facebook' | 'linkedin' | 'twitter' | 'tiktok' | 'email' | 'ads' | 'website',
    language: 'pt' | 'en' | 'es' = 'pt'
): Promise<CopyTunerClientMCPResponse> => {
    const prompt = `
    ⚠️ **ADAPTAÇÃO DE COPY PARA PLATAFORMA VIA MCP (Item 24 & #9)** ⚠️
    Adapte o seguinte texto de copywriting para as especificidades da plataforma indicada:
    
    TEXTO ORIGINAL:
    ${text}
    
    PLATAFORMA: ${targetPlatform}
    IDIOMA: ${language.toUpperCase()}
    
    Diretrizes de adaptação:
    1. Instagram: Máx 30 chars por linha, gancho nas primeiras 3 palavras, uso de emojis estratégicos
    2. Facebook: Textos mais extensos, storytelling, chamada para ação clara
    3. LinkedIn: Tom profissional, dados/resultados, linguagem corporativa
    4. Twitter/X: Máx 280 chars, direto, hashtags relevantes
    5. TikTok: Rítmico, para leitura em telas pequenas, hook visual-first
    6. Email: Personalizado, one-to-one, foco benefício/objeto
    7. Ads: Conciso, gancho imediata, CTA claro, benefício em destaque
    8. Website: SEO-friendly, hierarquia clara, leitura escaneável
    
    REGRA OBRIGATÓRIA (Item 12): Saída em TEXTO PURO - SEM Markdown, SEM *, **, #, -, —, •, >, crases.
    
    RETORNE EM JSON:
    {
        "translatedText": "texto adaptado em texto puro para a plataforma",
        "qualityScore": number (0 a 100),
        "detectedIssues": ["adaptação necessária X", ...] ou vazio,
        "timestamp": "ISO timestamp"
    }
    `;

    const systemInstruction = `ATUE COMO: Especialista em adaptação de copy por plataforma. Aplique a Constituição da IA V20. Responda APENAS com o JSON solicitado, sem comentários antes ou depois.`;

    const rawResult = await callAI(prompt, systemInstruction, 'gemini-3-flash-preview', undefined, { maxTokens: 8192 });
    return toTunerResponse(rawResult, 'Não foi possível adaptar a copy para a plataforma');
};

export const batchTranslateAndOptimize = async (
    texts: string[],
    targetLanguage: 'pt' | 'en' | 'es' = 'pt',
    sourceLanguage: 'pt' | 'en' | 'es' | 'auto' = 'auto',
    platform: 'copy' | 'email' | 'ads' | 'social' | 'general' = 'general'
): Promise<CopyTunerClientMCPResponse[]> => {
    const results: CopyTunerClientMCPResponse[] = [];

    for (let i = 0; i < texts.length; i++) {
        const result = await translateWithCopyTuner(
            texts[i],
            targetLanguage,
            sourceLanguage,
            platform
        );
        results.push(result);

        // Small delay to avoid rate limiting
        if (i < texts.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return results;
};