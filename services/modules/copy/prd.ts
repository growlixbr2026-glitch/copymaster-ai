import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

export const PRD_DIVIDER = '|||PRD_DIVIDER|||';

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
}

export const generatePRDService = async (params: PRDParams, onChunk?: (text: string) => void) => {
    const answered = [params.q1, params.q2, params.q3, params.q4, params.q5].filter((q) => q && q.trim().length > 1);
    const prompt = `
    ⚠️ **MODO OPERAÇÃO: SENIOR PRODUCT ARCHITECT + CRO — PRD VIBE CODING ESTÁTICO** ⚠️
    ESCREVA TODO O PRD EM PT-BR (blocos de código/tokens técnicos permanecem em ENGLISH técnico: hex, Tailwind, JSON, className).

    === NEGÓCIO (fonte de verdade) ===
    NOME: ${params.businessName || '[INSERIR DADO]'} | NICHO: ${params.niche || '[INSERIR DADO]'}
    PROMESSA ÚNICA: ${params.promise || '[INSERIR DADO]'} | PÚBLICO: ${params.audience || '[INSERIR DADO]'}
    DIFERENCIAL: ${params.differential || 'não informado — deduza do nicho sem inventar dados'}
    TOM: ${params.tone || 'Automático'} | MÉTODO: ${params.methodology || 'Automático'}
    TIPO: ${params.prdType || 'Automático'} | PLATAFORMA ALVO: ${params.prdPlatform || 'Automático (IA Escolhe)'}
    SEÇÕES EXIGIDAS (nesta ordem): ${(params.sections && params.sections.length ? params.sections.join(' → ') : 'Hero → Problema → Solução → Prova Social → Como Funciona → FAQ → CTA Final → Footer')}
    INTEGRAÇÕES (só se compatível com estático puro): ${params.integrations || 'nenhuma — form via webhook/WhatsApp, analytics leve'}
    CONTEXTO LIVRE: ${params.context || '—'}

    === 5 PERGUNTAS OPCIONAIS (${answered.length}/5 respondidas) ===
    Q1 Pra quem é (persona/dor/desejo): ${params.q1 || '[NÃO RESPONDIDA — marcar como ASSUNÇÃO na Nota]'}
    Q2 ÚNICA ação + destino do clique: ${params.q2 || '[NÃO RESPONDIDA — assumir 1 CTA primário p/ #contato e marcar ASSUNÇÃO]'}
    Q3 O que já tem pronto (copy/fotos/prova) ou inventar placeholders: ${params.q3 || '[NÃO RESPONDIDA — usar copy verbatim do briefing; o que faltar vira [INSERIR DADO], nunca lorem]'}
    Q4 Site que AMA + estilo que ODEIA: ${params.q4 || '[NÃO RESPONDIDA — usar DNA extraído se houver, senão trio editorial+swiss]'}
    Q5 O que NÃO pode existir + onde hospeda: ${params.q5 || '[NÃO RESPONDIDA — assumir: sem auth/DB/pagamento/blog, Vercel SSG estático]'}

    === SITE DE REFERÊNCIA (precedência máxima quando presente) ===
    URL: ${params.siteRefUrl || 'nenhuma'}
    ${params.siteDnaBlock || '(sem DNA extraído — usar Automático de alta conversão)'}
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
    📊 **PARÂMETROS:** Tipo: ${params.prdType || 'Automático'} | Plataforma: ${params.prdPlatform || 'Automático'} | Ref: ${params.siteRefUrl || 'nenhuma'}
    🧠 **DECISÕES:** [por que esta IA map / estes tokens / este CTA único]
    ⚠️ **[ASSUNÇÕES] Qs não respondidas:** [listar Q1-Q5 puladas como ASSUNÇÃO + risco]
    🚫 **RISCOS:** [o que pode quebrar na geração + como validar no preview]
    `;

    return callAI(prompt, `ATUE COMO: Senior Product Architect e CRO especialista em vibe coding (Lovable, v0, Bolt, Cursor). Entregue PRDs executáveis que geram sites estáticos bonitos e que convertem. Respeite 100% os seletores e a precedência do SITE_DNA.\n${GOLDEN_SYSTEM_INSTRUCTIONS}`, 'gemini-3-pro-preview', onChunk, { maxTokens: 8192 });
};
