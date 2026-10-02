import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { personaBlock } from './crewaiPersona';

// JSON Schema para Article estruturado (modo CrewAI)
export const ARTICLE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    article: { type: 'string' },
    jsonLd: { type: 'string' },
    strategistNote: { type: 'string' }
  },
  required: ['article', 'jsonLd', 'strategistNote']
};

export interface ArticleParams {
  type?: string;
  tone?: string;
  citeSources?: boolean;
  includeBibliography?: boolean;
  targetLength?: number;
  writerStyle?: string;
  context: string;
  language: string;
  /** Ativa modo CrewAI com output JSON estruturado */
  useCrewAI?: boolean;
  /** ID da persona CrewAI (data/crewai-personas.ts) */
  crewPersona?: string;
}

export const generateArticleService = async (params: ArticleParams, onChunk?: (text: string) => void) => {
  const { useCrewAI = false, ...p } = params;
  const lengthStr = (() => { 
    const n = Number(p.targetLength); 
    if (!(n > 0)) return 'livre'; 
    return `aproximadamente ${Math.min(n, 12000)} caracteres (tolerância +/- 10%)`; 
  })();
  
  if (useCrewAI) {
    // Modo CrewAI: output JSON estruturado
    const prompt = `
⚠️ **MODO CREWAI: SEO ARCHITECT + WRITER** ⚠️
${personaBlock(p.crewPersona)}

TASK: Artigo completo + JSON-LD em JSON estruturado.

TIPO: ${p.type || 'Automático (IA Define)'} | TOM: ${p.tone || 'Automático'}
FONTES: ${p.citeSources === false ? 'SEM citações — só análise' : 'Citar fontes reais com [FONTE]'}
BIBLIOGRAFIA: ${p.includeBibliography === false ? 'omitir' : 'incluir ao final'}
META: ${lengthStr}
CONTEXTO: ${p.context}
LANGUAGE: ${p.language}

ESTRUTURA AEO/E-E-A-T:
- H1: 3 opções (escolha a melhor)
- Hook: prende em 3s
- TOC: navegável
- H2s: com target keywords + PAA questions
- Dados: cite fontes como [FONTE N], faltando → [INSERIR DADO]
- FAQ Schema: 5-8 Q&A prontos para markup
- Conclusion + CTA

REGRAS:
- TEXTO PURO COPIA-COLA (sem markdown no corpo)
- Separe FATOS [FONTE N] de ANÁLISE [opinião]
- E-E-A-T: Experience, Expertise, Authoritativeness, Trustworthiness
- JSON-LD: FAQ Schema + Article Schema

OUTPUT: JSON conforme schema (article, jsonLd, strategistNote)
`;
    return callAI(prompt, "You are a World-Class SEO Strategist + Content Writer (AEO/E-E-A-T). Output ONLY valid JSON.", 'gemini-3-flash-preview', onChunk, { 
      responseMimeType: 'application/json', 
      responseSchema: ARTICLE_RESPONSE_SCHEMA,
      maxTokens: 8192,
      tools: [{ googleSearch: {} }]
    });
  }

  // Modo tradicional (compatibilidade)
  const prompt = `
⚠️ **MODO OPERAÇÃO: JORNALISTA & ESTRATEGISTA SEO (ITEM 24 & 32)** ⚠️
${personaBlock(p.crewPersona)}

TASK: Artigo Full + JSON-LD (AEO Optimized).
TIPO DE ARTIGO: ${p.type || 'Automático (IA Define)'} | TOM: ${p.tone || 'Automático'}
FONTES: ${p.citeSources === false ? 'SEM citações — só análise' : 'Citar fontes reais com [FONTE]'} | BIBLIOGRAFIA: ${p.includeBibliography === false ? 'omitir' : 'incluir ao final'}
META DE TAMANHO: ${lengthStr}
CONTEXTO: ${p.context}
LANGUAGE: ${p.language}

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
- Modo Editorial: ${p.writerStyle || 'Jornalístico'}
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
