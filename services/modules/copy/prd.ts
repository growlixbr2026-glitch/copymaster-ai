import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { personaBlock } from './crewaiPersona';

export const PRD_DIVIDER = '|||PRD_DIVIDER|||';

// JSON Schema para PRD estruturado (modo CrewAI)
export const PRD_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    prdMd: { type: 'string' },
    tokensJson: { type: 'string' },
    strategistNote: { type: 'string' }
  },
  required: ['prdMd', 'tokensJson', 'strategistNote']
};

export interface PRDParams {
    businessName: string;
    niche: string;
    promise: string;
    audience: string;
    differential?: string;
    tone?: string;
    methodology?: string;
    prdType?: string;
    prdPlatform?: string;
    sections?: string[];
    integrations?: string;
    visualStyle?: string;
    bgColor?: string;
    fontColor?: string;
    texture?: string;
    siteRefUrl?: string;
    siteDnaBlock?: string;
    q1?: string;
    q2?: string;
    q3?: string;
    q4?: string;
    q5?: string;
    context?: string;
    language?: string;
    /** Ativa modo CrewAI com output JSON estruturado */
    useCrewAI?: boolean;
    /** ID da persona CrewAI (data/crewai-personas.ts) */
    crewPersona?: string;
}

export const generatePRDService = async (params: PRDParams, onChunk?: (text: string) => void) => {
    const { useCrewAI = false, ...p } = params;
    const answered = [p.q1, p.q2, p.q3, p.q4, p.q5].filter((q) => q && q.trim().length > 1);
    
    if (useCrewAI) {
        // Modo CrewAI: output JSON estruturado
        const prompt = `
⚠️ **MODO CREWAI: PRODUCT ARCHITECT + TECH WRITER** ⚠️
${personaBlock(p.crewPersona)}

TASK: Produza PRD.md + tokens.json em JSON estruturado.

NEGÓCIO: ${p.businessName} | NICHO: ${p.niche}
PROMESSA: ${p.promise} | PÚBLICO: ${p.audience}
DIFERENCIAL: ${p.differential || 'não informado'}
TOM: ${p.tone || 'Automático'} | MÉTODO: ${p.methodology || 'Automático'}
TIPO: ${p.prdType || 'Automático'} | PLATAFORMA: ${p.prdPlatform || 'Automático'}
SEÇÕES: ${p.sections?.join(' → ') || 'Hero → Problema → Solução → Prova → FAQ → CTA → Footer'}
INTEGRAÇÕES: ${p.integrations || 'nenhuma'}
CONTEXTO: ${p.context || 'não informado'}
SITE REF: ${p.siteRefUrl || 'sem referência'}
DNA: ${p.siteDnaBlock || 'não extraído'}

REGRAS VIBE CODING:
- STATIC ONLY: Vercel SSG (Astro/Next.js), no auth/DB/CMS/pagamentos/blog
- Form: webhook/WhatsApp only
- Tokens: CSS custom properties (colors, spacing, typography, radii, shadows)
- Copy: verbatim do briefing, [INSERIR DADO] p/ faltante, NUNCA lorem
- Paleta: do DNA extraído, nunca gradiente genérico
- A11y: WCAG 2.2 AA | Perf: LCP<2.5s, CLS<0.1, JS<180kb
- SEO/AEO: meta, JSON-LD, sitemap

OUTPUT: JSON (prdMd, tokensJson, strategistNote)
`;
        return callAI(prompt, "You are a Senior Product Architect + Tech Writer for AI Agents (Lovable, v0, Cursor). Output ONLY valid JSON.", 'gemini-3-pro-preview', onChunk, { 
            responseMimeType: 'application/json', 
            responseSchema: PRD_RESPONSE_SCHEMA,
            maxTokens: 8192 
        });
    }

    // Modo tradicional (compatibilidade)
    const prompt = `
⚠️ **MODO OPERAÇÃO: SENIOR PRODUCT ARCHITECT + CRO — PRD VIBE CODING ESTÁTICO** ⚠️
${personaBlock(p.crewPersona)}
ESCREVA TODO O PRD EM PT-BR (blocos de código/tokens técnicos permanecem em ENGLISH técnico: hex, Tailwind, JSON, className).

=== NEGÓCIO (fonte de verdade) ===
NOME: ${p.businessName} | NICHO: ${p.niche}
PROMESSA ÚNICA: ${p.promise} | PÚBLICO: ${p.audience}
DIFERENCIAL: ${p.differential || 'não informado — deduza do nicho sem inventar dados'}
TOM: ${p.tone || 'Automático'} | MÉTODO: ${p.methodology || 'Automático'}
TIPO: ${p.prdType || 'Automático'} | PLATAFORMA ALVO: ${p.prdPlatform || 'Automático (IA Escolhe)'}
SEÇÕES EXIGIDAS (nesta ordem): ${(p.sections && p.sections.length ? p.sections.join(' → ') : 'Hero → Problema → Solução → Prova Social → Como Funciona → FAQ → CTA Final → Footer')}
INTEGRAÇÕES (só se compatível com estático puro): ${p.integrations || 'nenhuma — form via webhook/WhatsApp, analytics leve'}
CONTEXTO LIVRE: ${p.context || '—'}

=== 5 PERGUNTAS OPCIONAIS (${answered.length}/5 respondidas) ===
Q1 Pra quem é (persona/dor/desejo): ${p.q1 || '[NÃO RESPONDIDA — marcar como ASSUNÇÃO na Nota]'}
Q2 ÚNICA ação + destino do clique: ${p.q2 || '[NÃO RESPONDIDA — assumir 1 CTA primário p/ #contato e marcar ASSUNÇÃO]'}
Q3 O que já tem pronto (copy/fotos/prova) ou inventar placeholders: ${p.q3 || '[NÃO RESPONDIDA — usar copy real verbatim + [INSERIR DADO] onde faltar]'}
Q4 Site que AMA + estilo que ODEIA: ${p.q4 || '[NÃO RESPONDIDA — seguir estética editorial minimalista quente]'}
Q5 O que NÃO pode existir + onde hospeda: ${p.q5 || '[NÃO RESPONDIDA — sem auth/DB/CMS, Vercel SSG]'}

=== SITE DE REFERÊNCIA (precedência máxima quando presente) ===
URL: ${p.siteRefUrl || 'sem referência'}
${p.siteDnaBlock || ''}

REGRA DE PRECEDÊNCIA: DNA extraído do site ref SOBRESCREVE selects manuais e Automático. Overrides manuais só valem onde o DNA não definiu.

⚠️ **REGRAS DE OURO APLICADAS:**
- STATIC ONLY: sem auth, sem banco, sem pagamento, sem CMS, sem blog. Form só via webhook/WhatsApp. Se o usuário pedir algo dinâmico, registre em Fora de Escopo em vez de especificar.
- Sem inventar dados: use [INSERIR DADO]. Sem URL fake: só links do briefing ou google.com/search?q=. Separe fato/opinião/criação.
- Anti-cara-de-IA: copy real verbatim (nunca lorem), paleta do DNA (nunca gradiente roxo genérico), trio estético editorial+swiss+minimal quente, raio 16/24, sombra soft, fotos cinematic 35mm, ícones lucide.
- Comece direto no PRD. Sem saudação, sem explicar o processo no corpo.

⚠️ **FORMATO DE RESPOSTA MANDATÓRIO (PT-BR, divisores em linha própria, exatos):**
[PRD.md completo e estruturado: 1 Meta+Intenção 1-linha, 2 Objetivo Único (CTA primário verbatim + destino), 3 Persona JTBD + 3 objeções mapeadas p/ seção, 4 Mapa IA ordenado com id âncora, 5 Tokens em code fence json, 6 Spec de Componentes em tabela Component|Desktop|Mobile|Estados, 7 Copy Real verbatim com limites de chars, 8 SEO/AEO + A11y WCAG 2.2 AA + Perf Budget (LCP<2.5, CLS<0.1, <180kb JS) + Analytics (cta_click/hero_view/form_submit), 9 Critérios Given/When/Then, 10 Fora de Escopo/Negative Prompt]
|||PRD_DIVIDER|||
[tokens.json pronto p/ tailwind.config: colors{primary,accent,bg,muted,text,border} typography{head,body,scale} spacing radius shadow]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA (AUDITORIA):**
📊 **PARÂMETROS:** Tipo: ${p.prdType || 'Automático'} | Plataforma: ${p.prdPlatform || 'Automático'} | Ref: ${p.siteRefUrl ? 'sim' : 'não'}
🧠 **DECISÕES:** [por que esta IA map / estes tokens / este CTA único]
⚠️ **[ASSUNÇÕES] Qs não respondidas:** [listar Q1-Q5 puladas como ASSUNÇÃO + risco]
🚫 **RISCOS:** [o que pode quebrar na geração + como validar no preview]
`;

    return callAI(prompt, "ATUE COMO: Senior Product Architect e CRO especialista em vibe coding (Lovable, v0, Bolt, Cursor). Entregue PRDs executáveis que geram sites estáticos bonitos e que convertem. Respeite 100% os seletores e a precedência do SITE_DNA.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-pro-preview', onChunk, { maxTokens: 8192 });
};
