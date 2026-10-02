import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { personaBlock } from '../copy/crewaiPersona';

export interface KeywordParams {
    niche: string;
    location?: string;
    language?: string;
    quantity?: number;
    intentFilter?: string;
    crewPersona?: string;
}

export const generateKeywordService = async (params: KeywordParams, onChunk?: (text: string) => void) => {
    const quantity = params.quantity || 20;
    const intentFilter = params.intentFilter || 'all';
    const location = params.location || 'Brasil';

    const prompt = `
    ⚠️ **MODO OPERAÇÃO: KEYWORD DISCOVERY (2026)** ⚠️
    ${personaBlock(params.crewPersona)}
    
    ⚠️ **HIERARQUIA DE VERDADE:**
    - NICHE: ${params.niche}
    - LOCALIZAÇÃO: ${location}
    - QUANTIDADE: ${quantity} keywords
    - FILTRO DE INTENÇÃO: ${intentFilter}
    
    ⚠️ **DIRETRIZ DE QUALIDADE:**
    - Descubra keywords relevantes para o nicho.
    - Priorize por volume estimado, dificuldade e intenção de busca.
    - Agrupe em clusters temáticos.
    - Não invente dados — use [INSERIR DADO] quando necessário.
    
    ⚠️ **FORMATO DE RESPOSTA MANDATÓRIO:**
    JSON válido com a seguinte estrutura:
    {
      "seeds": ["keyword1", "keyword2"],
      "opportunities": [
        {
          "keyword": "string",
          "intent": "informational|commercial|transactional",
          "estimatedVolume": "string",
          "difficulty": "low|medium|high",
          "contentType": "blog|landing|product|video",
          "priorityScore": 0-100
        }
      ],
      "clusters": [
        {
          "clusterName": "string",
          "keywords": ["string"]
        }
      ],
      "notes": "string"
    }
    
    Retorne APENAS o JSON, sem markdown, sem explicações. Depois do JSON, em linha própria: |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    `;

    const systemInstruction = `ATUE COMO: Especialista em SEO e Pesquisa de Palavras-Chave. Conhece Google Keyword Planner, Ahrefs, Semrush. Siga a Constitution da IA rigorosamente.\n${GOLDEN_SYSTEM_INSTRUCTIONS}`;

    return callAI(prompt, systemInstruction, 'gemini-3-pro-preview', onChunk, { maxTokens: 8192 });
};
