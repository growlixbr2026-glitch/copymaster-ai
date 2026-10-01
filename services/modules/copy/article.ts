
import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

export const generateArticleService = async (params: any, onChunk?: (text: string) => void) => {
    const prompt = `
    ⚠️ **MODO OPERAÇÃO: JORNALISTA & ESTRATEGISTA SEO (ITEM 24 & 32)** ⚠️
    
    TASK: Artigo Full + JSON-LD (AEO Optimized).
    TIPO DE ARTIGO: ${params.type || 'Automático (IA Define)'} | TOM: ${params.tone || 'Automático'}
    FONTES: ${params.citeSources === false ? 'SEM citações — só análise' : 'Citar fontes reais com [FONTE]'} | BIBLIOGRAFIA: ${params.includeBibliography === false ? 'omitir' : 'incluir ao final'}
    META DE TAMANHO: ${(() => { const n = Number(params.targetLength); if (!(n > 0)) return 'livre'; return `aproximadamente ${Math.min(n, 12000)} caracteres (tolerância +/- 10%)`; })()}
    CONTEXTO: ${params.context}
    LANGUAGE: ${params.language}

    ⚠️ **CONSTITUIÇÃO V22 - REGRAS APLICADAS:**
    - ITEM 16: Abaixo do artigo, inclua "|||SCHEMA_DIVIDER|||" e o código JSON-LD.
    - ITEM 20: Separe claramente os FATOS (com fontes reais) das ANÁLISES.
    - ITEM 32: Use Google Search para validar dados. Se não houver fonte, use [FONTE NÃO INFORMADA].

    ESTRUTURA DE SAÍDA:
    [Artigo em TEXTO PURO COPIA-COLA: proibido *, **, #, -, —, •, >, numeração com ponto e crases. Apenas frases e parágrafos separados por linha em branco. Títulos de seção em CAIXA ALTA sem símbolos.]
    |||SCHEMA_DIVIDER|||
    [JSON-LD Script]
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    📊 **PARÂMETROS DE EXECUÇÃO:**
    - Motor: Gemini 3 Flash (AEO Specialized)
    - Modo Editorial: ${params.writerStyle}
    - SEO Score: High Priority
    
    🧠 **ANÁLISE DE MERCADO (OPINIÃO):**
    [Interpretação do especialista sobre o tema]
    `;
    
    return callAI(
        prompt, 
        `You are a World-Class Journalist and SEO Specialist. Follow Golden Rules strictly.` + GOLDEN_SYSTEM_INSTRUCTIONS, 
        'gemini-3-flash-preview', 
        onChunk,
        { tools: [{ googleSearch: {} }], maxTokens: 8192 }
    );
};
