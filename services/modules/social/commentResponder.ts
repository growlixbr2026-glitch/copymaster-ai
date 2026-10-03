import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

/**
 * Responder Comentários (Engajamento & Autoridade).
 *
 * O usuário cola a postagem (texto/artigo), envia imagem ou PDF — ou o
 * comentário recebido — e a sessão gera respostas CONTEXTUAIS que seguem a
 * fórmula ouro da pesquisa de engajamento 2026: reforçar um ponto específico
 * + acrescentar valor novo + terminar com pergunta aberta (fio com resposta
 * vale mais que comentário solto — sinal de conversa para o algoritmo).
 *
 * CONTRATO DE SAÍDA: N variações separadas por `|||COMMENT_DIVIDER|||`
 * (divisor em linha própria, exato) + `|||NOTA_DIVIDER|||` com a Nota do
 * Estrategista isolada. Com 1 variação, só NOTA_DIVIDER. Texto puro PT-BR
 * copia-cola — badge T.
 */

export const COMMENT_DIVIDER = '|||COMMENT_DIVIDER|||';

export interface CommentResponderParams {
    /** post = deixar comentário NA postagem; comment = responder comentário recebido. */
    mode?: 'post' | 'comment';
    platform?: string;
    objective?: string;
    tone?: string;
    /** curto | medio | longo */
    length?: string;
    variations?: number;
    /** Fonte obrigatória: postagem (modo post) ou comentário recebido (modo comment). */
    context: string;
    /** Contexto adicional opcional (quem sou eu, post ao qual o comentário pertence...). */
    extra?: string;
    language?: string;
}

/** Normas por rede (janela de resposta, densidade, registro) — pesquisa 2026. */
const PLATFORM_NOTES: Array<{ match: string[]; note: string }> = [
    { match: ['automático', 'automatic'], note: 'Rede não definida: identifique a rede pelo formato da fonte (extensão, tom, menções) e aplique a janela ideal — X = minutos, LinkedIn = 1ª hora, Instagram/Threads = primeiras horas, YouTube = dias.' },
    { match: ['linkedin'], note: 'LinkedIn: profissional e específico — 15+ palavras, dado ou observação concreta + pergunta; a primeira hora tem ~3x mais respostas.' },
    { match: ['instagram'], note: 'Instagram: caloroso e pessoal, emoji com moderação, 2-3 linhas; responda nas primeiras horas enquanto o post ainda é testado.' },
    { match: ['tiktok'], note: 'TikTok: direto, leve e com linguagem jovem; humor leve funciona; fuja de tom corporativo.' },
    { match: ['twitter', 'x ('], note: 'X (Twitter): curto e afiado, opinião clara, sem hashtags; a janela de resposta é IMEDIATA (minutos).' },
    { match: ['youtube'], note: 'YouTube: pensado e específico; pergunta que puxa resposta; janela de dias — mas responda tudo.' },
    { match: ['threads'], note: 'Threads: conversacional; resposta encadeada vale muito mais que elogio solto.' },
    { match: ['facebook'], note: 'Facebook: pessoal e comunitário; o primeiro dia ainda conta.' },
    { match: ['reddit', 'discord', 'medium', 'substack'], note: 'Comunidade/leitura: direto, sem cheiro de marketing; autenticidade acima de tudo.' },
    { match: ['blog', 'seo', 'email', 'whatsapp', 'telegram'], note: 'Texto longo/mensageria: responda como gente, citando o ponto exato do interlocutor.' },
];

const platformNote = (platform?: string): string => {
    const p = (platform || '').toLowerCase();
    const hit = PLATFORM_NOTES.find((e) => e.match.some((m) => p.includes(m)));
    return hit ? hit.note : 'Responda no padrão da rede: específica, humana, com pergunta aberta no final.';
};

/** Objetivo da resposta → diretriz de escrita. */
const OBJECTIVE_NOTES: Record<string, string> = {
    autoridade: 'Demonstre expertise com um dado, exemplo real ou método — sem vender. O objetivo é ser lembrado como especialista.',
    engajar: 'Abra conversa: reaja a um ponto específico e termine com pergunta aberta que convida ao fio.',
    'adicionar-valor': 'Acrescente algo que o autor NÃO disse: dado, ângulo, ferramenta ou exemplo prático.',
    'concordar-e-ampliar': 'Concorde citando um detalhe concreto e leve o ponto adiante com um caso real.',
    'contra-argumentar': 'Discorde com educação: reconheça o que o outro acertou antes de apresentar sua visão alternativa.',
    'pergunta-aberta': 'Deixe uma pergunta de fio que convida terceiros a comentarem também.',
    'agradecer-e-conversa': 'Agradeça referenciando um detalhe concreto do texto (nunca "obrigado!" genérico) e devolva com pergunta.',
    'vender-sutil': 'Autoridade primeiro: mencione experiência/resultado de forma natural, sem oferta explícita nem link.',
};

const LENGTH_NOTES: Record<string, string> = {
    curto: '1-2 frases, cerca de 30 palavras — reação rápida.',
    medio: '3-4 frases, cerca de 70 palavras — ponto + valor + pergunta.',
    longo: 'parágrafo encadeado, cerca de 130 palavras — só onde a rede comporta (LinkedIn, blog, artigo).',
};

export const generateCommentResponseService = async (params: CommentResponderParams, onChunk?: (text: string) => void) => {
    const mode = params.mode || 'post';
    const platform = params.platform || 'Automático';
    const objective = params.objective || 'autoridade';
    const tone = params.tone || 'Profissional';
    const length = params.length || 'medio';
    const language = params.language || 'português';
    const context = (params.context || '').trim();

    // Item 18: sem fonte não há resposta contextual — bloqueia em vez de supor.
    if (!context) {
        return {
            text: '',
            error: 'Cole o conteúdo da postagem ou o comentário recebido — sem a fonte não há como responder no contexto (Item 18).',
        };
    }

    const n = Math.max(1, Math.min(3, Number(params.variations) || 3));
    const blocks: string[] = [];
    for (let i = 1; i <= n; i++) {
        const divider = i < n ? `\n${COMMENT_DIVIDER}` : '';
        blocks.push(`Variação ${i}\n[resposta ${i} contextualizada]${divider}`);
    }
    const outputTemplate = blocks.join('\n');

    const prompt = `
    ⚠️ **MODO OPERAÇÃO: RESPONDEDOR DE COMENTÁRIOS (ENGAJAMENTO & AUTORIDADE)** ⚠️

    ⚠️ **REGRAS DE ENGAJAMENTO (pesquisa 2026 — responder comentário é a distribuição mais barata que existe):**
    1. FÓRMULA OURO de cada resposta: (a) reforce UM ponto específico do que foi escrito; (b) acrescente valor NOVO (dado, exemplo, micro-história ou framework); (c) termine com pergunta aberta que convida a fio. Fio com resposta vale mais que comentário solto — a rede distribui conversa, não aprovação.
    2. PROIBIDO genérico: nada de "obrigado!", "muito bom!", "top!". Referencie um detalhe concreto da fonte (nome, produto, número, afirmação) e cite pelo menos UM termo concreto do texto-fonte em cada variação.
    3. Sinal de qualidade > volume: 15+ palavras com detalhe real soam como autoridade; resposta curta e genérica soa como ruído.
    4. Autoridade sem venda: demonstre domínio (número, exemplo real, método) sem oferecer produto, link ou desconto. O jogo é ser lembrado como especialista — não fechar venda no comentário.
    5. Nunca invente estatística, citação, nome ou URL. Fato só se vier do texto-fonte; sem dado real, use opinião/exemplo claramente marcados.
    6. Cordial e seguro: NUNCA ataque, ironia pesada ou discordância agressiva. Crítica educada constrói reputação; discussão pública destrói.
    7. Se a fonte for hostil/ofensiva (modo comment): responda com calma e convide para DM — não alimente a briga.
    8. Responda no idioma ${language}. Entregável é TEXTO PURO copia-cola: sem Markdown (*, #, -, listas), sem saudação, sem "Aqui estão...".

    ⚠️ **SELETORES (respeite à risca):**
    - MODO: ${mode} — ${mode === 'comment' ? 'comment = responder UM comentário recebido (a fonte é o comentário; a resposta fala com quem comentou).' : 'post = deixar UM comentário NA postagem de terceiro (a fonte é a postagem; a resposta conversa com o autor do post).'}
    - REDE: ${platform}. ${platformNote(platform)}
    - OBJETIVO: ${objective}. ${OBJECTIVE_NOTES[objective] || OBJECTIVE_NOTES.autoridade}
    - TOM: ${tone}
    - TAMANHO: ${length}. ${LENGTH_NOTES[length] || LENGTH_NOTES.medio}
    - VARIACÕES: ${n}

    ⚠️ **FONTE DE DADOS OBRIGATÓRIA (${mode === 'comment' ? 'comentário recebido' : 'postagem'}) — contexto verdadeiro, nunca desconsidere:**
    """
    ${context}
    """
    ${params.extra?.trim() ? `\n    CONTEXTO EXTRA (quem você é / objetivo): ${params.extra.trim()}\n` : ''}
    ⚠️ **FORMATO DE RESPOSTA MANDATÓRIO:**
    Texto puro, sem Markdown. Divisores EM LINHA PRÓPRIA, exatos, nunca quebrados.
    Exatamente ${n} variação(ões) no formato abaixo${n === 1 ? ' (sem COMMENT_DIVIDER)' : ''}:

    ${outputTemplate}
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    [tipo da fonte detectado (pergunta, elogio, crítica, objeção, debate), janela ideal de resposta desta rede, o que personalizar antes de publicar, risco a evitar]
    `;

    const systemInstruction = `ATUE COMO: Especialista em Engajamento e Autoridade em redes sociais — transforma comentários em prova de expertise (fórmula ouro: ponto específico + valor novo + pergunta aberta). Siga a Constitution da IA rigorosamente.\n${GOLDEN_SYSTEM_INSTRUCTIONS}`;

    return callAI(prompt, systemInstruction, 'gemini-3-pro-preview', onChunk, { maxTokens: 8192 });
};
