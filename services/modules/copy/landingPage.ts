
import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

export const generateLandingPageService = async (params: any, onChunk?: (text: string) => void) => {
    const prompt = `
    ⚠️ **MODO OPERAÇÃO: ARQUITETO DE CONVERSÃO (CRO) - ITEM 24** ⚠️
    
    TASK: Estrutura de Wireframe e Copy de alta conversão.
    TIPO DE PÁGINA: ${params.type || 'Automático (IA Escolhe)'}
    PRODUTO: ${params.productName} | PÚBLICO: ${params.targetAudience}
    PROMESSA: ${params.promise} | OFERTA: ${params.offer}
    CONTEXTO: ${params.context}
    LANGUAGE: ${params.language}

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

    FORMATO: [Wireframe + copy de cada seção em TEXTO PURO NO IDIOMA ${params.language || 'Português (Brasil)'} (inclusive títulos e rótulos do wireframe) COPIA-COLA: proibido *, **, #, -, —, •, >, numeração com ponto e crases no corpo dos textos. Apenas frases e parágrafos. Rótulos de seção entre colchetes são permitidos.]
    |||NOTA_DIVIDER|||
    **NOTA DO ESPECIALISTA (AUDITORIA V22):**
    📊 **PARÂMETROS:** Estética: ${params.style} | Framework: ${params.framework}
    🧠 **ANÁLISE DE PSICOLOGIA (ITEM 20):** [Por que esta copy converte?]
    `;

    return callAI(prompt, "You are a World-Class CRO and Direct Response Copywriter.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-pro-preview', onChunk, { tools: [{ googleSearch: {} }] });
};

export const generateLandingPageTechPromptService = async (params: any, onChunk?: (text: string) => void) => {
    const prompt = `
    ⚠️ **MODO OPERAÇÃO: ENGENHEIRO DE PROMPT TECH (VIBE CODING) - ITEM 24** ⚠️
    TASK: Prompt PRD para ${params.targetPlatform}.
    PRODUTO: ${params.productName} | CONTEXTO/BRIEFING (verdade absoluta — todo o site nasce daqui): ${params.context || 'não informado'}
    ESTILO: ${params.visualStyle} | COMPONENTES: ${params.sections} | INTERATIVIDADE: ${params.interactivity || 'padrão da plataforma alvo'}
    LANGUAGE DO NEGÓCIO: ${params.language || 'pt'} (o produto é neste idioma; o prompt técnico abaixo sai em INGLÊS TÉCNICO).

    ⚠️ **REGRA #31 (ORDEM INTERNA):** Defina primeiro a stack técnica antes do layout visual.
    O prompt deve ser gerado em INGLÊS TÉCNICO.
    STATIC ONLY (Vercel SSG: sem auth, sem banco de dados, sem pagamento, sem CMS, sem blog; formulário via webhook/WhatsApp). PROIBIDO PostgreSQL, micro-serviços, Express, text-davinci-003, GPT-4 como backend. Stack default se vazia: Astro ou Next.js SSG + Tailwind.
    Estrutura mínima: Hero → Problema → Solução → Prova → Como Funciona → FAQ → CTA → Footer. Se ESTILO/COMPONENTES vazios, usar editorial minimalista quente, raio 16/24.

    FORMATO: [Prompt Técnico Pronto]
    `;
    return callAI(prompt, "You are a Senior Fullstack Architect.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-pro-preview', onChunk);
};
