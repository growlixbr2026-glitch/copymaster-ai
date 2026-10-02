import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { personaBlock } from './crewaiPersona';

// JSON Schema para Landing Page estruturado (modo CrewAI)
export const LANDING_PAGE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          headline: { type: 'string' },
          subheadline: { type: 'string' },
          copy: { type: 'string' }
        },
        required: ['id', 'headline', 'copy']
      }
    },
    fullCopy: { type: 'string' },
    strategistNote: { type: 'string' }
  },
  required: ['sections', 'fullCopy', 'strategistNote']
};

export interface LandingParams {
  type?: string;
  style?: string;
  framework?: string;
  productName: string;
  promise?: string;
  offer?: string;
  targetAudience?: string;
  targetPlatform?: string;
  visualStyle?: string;
  sections?: string;
  interactivity?: string;
  context: string;
  language: string;
  /** Ativa modo CrewAI com output JSON estruturado */
  useCrewAI?: boolean;
  /** ID da persona CrewAI (data/crewai-personas.ts) */
  crewPersona?: string;
}

export const generateLandingPageService = async (params: LandingParams, onChunk?: (text: string) => void) => {
  const { useCrewAI = false, ...p } = params;
  
  if (useCrewAI) {
    // Modo CrewAI: output JSON estruturado
    const prompt = `
⚠️ **MODO CREWAI: LP ARCHITECT + COPYWRITER** ⚠️
${personaBlock(p.crewPersona)}
TASK: Produza Landing Page wireframe + copy em JSON estruturado.

TIPO DE PÁGINA: ${p.type || 'não informado'}
ESTILO DE PÁGINA: ${p.style || 'não informado'}
PRODUTO: ${p.productName} | PÚBLICO: ${p.targetAudience || 'não informado'}
PROMESSA: ${p.promise || 'não informado'} | OFERTA: ${p.offer || 'não informado'}
CONTEXTO: ${p.context}
LANGUAGE: ${p.language}

ESTRUTURA 7 SEÇÕES OBRIGATÓRIAS:
1. HERO: Headline hipnótica (<10 palavras) + Subhead + CTA
2. PAIN AGITATION: O "inferno" do cliente sem a solução
3. UNIQUE MECHANISM: Por que seu método é a única saída
4. BENEFITS BULLETS: Benefício + Mecanismo (skimmers)
5. SOCIAL PROOF: Narrativa SEM nome próprio/aspas literais (use [INSERIR DEPOIMENTO REAL])
6. OFFER & RISK REVERSAL: Garantia + Fechamento
7. FAQ/OBJECTIONS: Trate objeções na copy

REGRAS:
- TEXTO PURO COPIA-COLA (sem markdown no corpo)
- Headlines < 10 palavras
- Bullets: benefício + mecanismo
- Prova: números específicos (não "milhares" → "12.847")
- Sem depoimentos falsos → [INSERIR DEPOIMENTO REAL]
- Rótulos de seção entre [colchetes] permitidos

OUTPUT: JSON conforme schema (sections[], fullCopy, strategistNote)
`;
    return callAI(prompt, "You are a World-Class CRO Architect + Direct Response Copywriter. Output ONLY valid JSON.", 'gemini-3-pro-preview', onChunk, { 
      responseMimeType: 'application/json', 
      responseSchema: LANDING_PAGE_RESPONSE_SCHEMA,
      maxTokens: 8192,
      tools: [{ googleSearch: {} }]
    });
  }

  // Modo tradicional (compatibilidade)
  const prompt = `
⚠️ **MODO OPERAÇÃO: ARQUITETO DE CONVERSÃO (CRO) - ITEM 24** ⚠️
${personaBlock(p.crewPersona)}

TASK: Estrutura de Wireframe e Copy de alta conversão.
TIPO DE PÁGINA: ${p.type || 'não informado'}
ESTILO DE PÁGINA: ${p.style || 'não informado'}
PRODUTO: ${p.productName} | PÚBLICO: ${p.targetAudience || 'não informado'}
PROMESSA: ${p.promise || 'não informado'} | OFERTA: ${p.offer || 'não informado'}
CONTEXTO: ${p.context}
LANGUAGE: ${p.language}

⚠️ **REGRAS DE OURO V22 APLICADAS:**
- ITEM 9 (ÂNGULO ÚNICO): Defenda um "Mecanismo Único" para o produto. Nada de manchetes genéricas.
- ITEM 29 (SILÊNCIO): Não explique por que escolheu o design X. Use a Nota do Especialista.
- ITEM 32 (GROUNDING): Valide dores reais usando busca ativa. Sem fonte: use [INSERIR DADO]/[FONTE NÃO INFORMADA]; NUNCA invente nome de cliente, número de clientes ou depoimento literal.

ESTRUTURA OBRIGATÓRIA:
1. [HERO SECTION]: Headline Hipnótica + Subhead + CTA.
2. [PAIN AGITATION]: O "inferno" do cliente sem a solução.
3. [UNIQUE MECHANISM]: Por que seu método é a única saída.
4. [SOCIAL PROOF]: APENAS estrutura narrativa SEM nome próprio e SEM aspas literais (ex.: "Quando um cliente prova pela primeira vez, o relato típico é…"); sem dado real, escreva [INSERIR DEPOIMENTO REAL].
5. [OFFER & RISK REVERSAL]: Garantia e fechamento.

FORMATO: [Wireframe + copy de cada seção em TEXTO PURO NO IDIOMA ${p.language} (inclusive títulos e rótulos do wireframe) COPIA-COLA: proibido *, **, #, -, —, •, >, numeração com ponto e crases no corpo dos textos. Apenas frases e parágrafos. Rótulos de seção entre colchetes são permitidos.]
|||NOTA_DIVIDER|||
**NOTA DO ESPECIALISTA (AUDITORIA V22):**
📊 **PARÂMETROS:** Estética: ${p.visualStyle || 'não informado'} | Framework: ${p.framework || 'não informado'}
🧠 **ANÁLISE DE PSICOLOGIA (ITEM 20):** [Por que esta copy converte?]
`;

  return callAI(prompt, "You are a World-Class CRO and Direct Response Copywriter.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-pro-preview', onChunk, { tools: [{ googleSearch: {} }] });
};

export const generateLandingPageTechPromptService = async (params: any, onChunk?: (text: string) => void) => {
  const prompt = `
⚠️ **MODO OPERAÇÃO: ENGENHEIRO DE PROMPT TECH (VIBE CODING) - ITEM 24** ⚠️
TASK: Prompt PRD para ${params.targetPlatform || 'Astro/Next.js'}.
PRODUTO: ${params.productName || 'não informado'} | CONTEXTO/BRIEFING (verdade absoluta — todo o site nasce daqui): ${params.context || 'não informado'}
ESTILO: ${params.visualStyle || 'não informado'} | COMPONENTES: ${params.sections || 'não informado'} | INTERATIVIDADE: ${params.interactivity || 'não informado'}
LANGUAGE DO NEGÓCIO: ${params.language || 'não informado'} (o produto é neste idioma; o prompt técnico abaixo sai em INGLÊS TÉCNICO).

⚠️ **REGRA #31 (ORDEM INTERNA):** Defina primeiro a stack técnica antes do layout visual.
O prompt deve ser gerado em INGLÊS TÉCNICO.
STATIC ONLY (Vercel SSG: sem auth, sem banco de dados, sem pagamento, sem CMS, sem blog; formulário via webhook/WhatsApp). PROIBIDO PostgreSQL, micro-serviços, Express, text-davinci-003, GPT-4 como backend. Stack default se vazia: Astro ou Next.js SSG + Tailwind.
Estrutura mínima: Hero → Problema → Solução → Prova → Como Funciona → FAQ → CTA → Footer. Se ESTILO/COMPONENTES vazios, usar editorial minimalista quente, raio 16/24.

FORMATO: [Prompt Técnico Pronto]
`;
  return callAI(prompt, "You are a Senior Fullstack Architect.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-pro-preview', onChunk);
};
