import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

export interface DtcpillInsight {
    id: string;
    category: 'marketing' | 'copywriting' | 'design' | 'psychology' | 'e-commerce';
    title: string;
    content: string;
    relevanceScore: number;
    tags: string[];
}

export interface DtcpillResponse {
    insights: DtcpillInsight[];
    totalAvailable: number;
    fetchTimestamp: string;
    /** Presente apenas quando o provedor falhou — insights estará vazio. */
    error?: string;
}

export const fetchDtcpillInsights = async (
    category: 'marketing' | 'copywriting' | 'design' | 'psychology' | 'e-commerce' = 'marketing',
    language: string = 'pt',
    limit: number = 10
): Promise<DtcpillResponse> => {
    const prompt = `
    ⚠️ **INSIGHTS DE MARKETING DTC VIA MCP (Item 9, 22 & #18)** ⚠️
    Busque e apresente insights curados de marketing DTC (Direct-to-Consumer) nas seguintes categorias:
    - Marketing geral
    - Copywriting
    - Design
    - Psicologia aplicada ao marketing
    - E-commerce

    RESTRIÇÕES IMPORTANTÍSSIMAS (Itens 7, 18, 19, 32, 33):
    - NÃO invente estatísticas, dados, números ou URLs (use [INSERIR DADO] se desconhecido)
    - NÃO cite fontes não confirmadas ou URLs fictícias
    - Diferencie fato de opinião/criação (Item 20)
    - Bloqueie suposições não solicitadas (Item 19)
    - Maintenha fidelidade aos dados reais disponíveis via MCP

    SOLICITAÇÃO:
    Categoria: ${category}
    Idioma: ${language.toUpperCase()}
    Limite de insights: ${limit}

    RETORNE EM JSON:
    {
        "insights": [
            {
                "id": "insight- único identificador",
                "category": "categoria",
                "title": "título curto e impactante",
                "content": "conteúdo do insight - máximo 300 palavras, TEXT PURO, sem Markdown",
                "relevanceScore": number (0 a 100),
                "tags": ["tag1", "tag2", ...]
            }
        ],
        "totalAvailable": number,
        "fetchTimestamp": "ISO timestamp"
    }
    `;

    const systemInstruction = `ATUE COMO: Analista de marketing DTC e estrategista de copy. Aplique a Constituição da IA V20 rigorosamente. Não invente dados, nunca invente estatísticas ou URLs. Responda APENAS com o JSON solicitado.`;

    return fetchInsightsAsJson(prompt, systemInstruction, 'Não foi possível carregar os insights DTC');
};

// Converte a resposta do callAI em DtcpillResponse; falhas viram lista vazia + campo error
// (nunca devolve "sucesso" silencioso quando o provedor errou).
const fetchInsightsAsJson = async (
    prompt: string,
    systemInstruction: string,
    fallbackIssue: string
): Promise<DtcpillResponse> => {
    const raw = await callAI(prompt, systemInstruction, 'gemini-3-flash-preview', undefined, { maxTokens: 8192 });
    const now = new Date().toISOString();

    if (raw.error && !(raw.text || '').trim()) {
        return { insights: [], totalAvailable: 0, fetchTimestamp: now, error: raw.error };
    }

    try {
        const parsed = JSON.parse((raw.text || '{}').replace(/```json|```/g, '').trim());
        const list = Array.isArray(parsed.insights) ? parsed.insights : [];
        return {
            insights: list.map((i: Record<string, unknown>, idx: number) => normalizeInsight(i, idx)),
            totalAvailable: Number(parsed.totalAvailable) || list.length,
            fetchTimestamp: typeof parsed.fetchTimestamp === 'string' ? parsed.fetchTimestamp : now,
        };
    } catch {
        return { insights: [], totalAvailable: 0, fetchTimestamp: now, error: fallbackIssue };
    }
};

const normalizeInsight = (raw: Record<string, unknown>, idx: number): DtcpillInsight => ({
    id: String(raw.id ?? `insight-${idx + 1}`),
    category: (raw.category as DtcpillInsight['category']) || 'marketing',
    title: String(raw.title ?? 'Sem título'),
    content: String(raw.content ?? ''),
    relevanceScore: Number(raw.relevanceScore) || 0,
    tags: Array.isArray(raw.tags) ? raw.tags.map(t => String(t)) : [],
});

export const getDtcpillInsightByTag = async (
    tag: string,
    language: string = 'pt',
    limit: number = 5
): Promise<DtcpillResponse> => {
    const prompt = `
    ⚠️ **INSIGHT ESPECÍFICO POR TAG VIA MCP (Item 9, 18 & #32)** ⚠️
    Busque insights relacionados à tag: "${tag}" do repositório DTCPill.
    
    Restrições (Itens 7, 18, 19, 32):
    - Apenas insights com fonte/lastro confirmado
    - Diferenciar fato de criação/opinião
    - [FONTE NÃO INFORMADA] se não houver lastro confirmado
    - Máximo ${limit} insights
    - Idioma: ${language.toUpperCase()}

    RETORNO JSON igual ao endpoint anterior.
    `;

    const systemInstruction = `ATUE COMO: Pesquisador de insights de marketing. Siga a Constituição da IA V20. Responda APENAS com o JSON solicitado.`;

    return fetchInsightsAsJson(prompt, systemInstruction, 'Não foi possível buscar insights pela tag');
};

export const integrateDtcpillWithCopy = async (
    baseCopy: string,
    category: 'marketing' | 'copywriting' | 'design' | 'psychology' | 'e-commerce' = 'copywriting',
    language: string = 'pt'
): Promise<{ enhancedCopy: string; insights: DtcpillInsight[]; notes?: string }> => {
    const fetchResponse = await fetchDtcpillInsights(category, language, 3);
    const insights = fetchResponse.insights;

    // Sem insights úteis não há o que integrar — devolve a copy original em vez de
    // gastar uma chamada (e fingir que houve enriquecimento).
    if (fetchResponse.error || insights.length === 0) {
        return {
            enhancedCopy: baseCopy,
            insights: [],
            notes: fetchResponse.error || 'Nenhum insight disponível para integração.',
        };
    }

    const prompt = `
    ⚠️ **INTEGRAÇÃO DTCPILL COM COPYWRITING (Item 9, 22 & #24)** ⚠️
    Integre os seguintes insights ao texto de copy abaixo, enriquecendo sem alterar a estrutura original:
    
    COPY ORIGINAL:
    ${baseCopy}
    
    INSIGHTS DISPONÍVEIS (seleção das melhores ${insights.length}):
    ${insights.map((i, idx) => `${idx + 1}. [${i.title}] - ${i.content.substring(0, 100)}...`).join('\n')}
    
    Tarefa:
    1. Identifique onde os insights podem melhorar a copy (gatilhos, ângulos, provas)
    2. Integre no máximo 2 referências de insights (não encha o texto)
    3. Mantenha o ângulo único original (Item 9)
    4. Texto final em PT puro, sem Markdown (Item 12)
    5. Se algum insight não se aplicar, note-o em vez forçar (Item 18/19)
    
    RETORNE EM JSON:
    {
        "enhancedCopy": "copy enriquecida em texto puro",
        "insightsUsed": ["id-do-insight-1", "id-do-insight-2"],
        "integrationNotes": "notas sobre como os insights foram integrados",
        "timestamp": "ISO timestamp"
    }
    `;

    const systemInstruction = `ATUE COMO: Estrategista sênior de copywriting com dados de mercado. Siga a Constituição da IA V20.`;

    const result = await callAI(prompt, systemInstruction, 'gemini-3-flash-preview', undefined, { maxTokens: 8192 });

    // Parse tolerante (aceita cercas de código); falha devolve a copy original.
    try {
        const parsed = JSON.parse((result.text || '{}').replace(/```json|```/g, '').trim());
        if (!parsed.enhancedCopy) throw new Error('sem enhancedCopy');
        return {
            enhancedCopy: String(parsed.enhancedCopy),
            insights,
            notes: typeof parsed.integrationNotes === 'string' ? parsed.integrationNotes : undefined,
        };
    } catch {
        return {
            enhancedCopy: baseCopy,
            insights: [],
            notes: result.error || 'Resposta inválida ao integrar insights; copy original preservada.',
        };
    }
};