import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS, VISUAL_MASTER_PROTOCOL } from '../../core/aiClient';
import { buildPlatformBlock, SESSION_HIERARCHY_RULE } from '../visual/platformProfiles';

export const generateComicService = async (params: any, onChunk?: (text: string) => void) => {
    const platformBlock = buildPlatformBlock(params.aiModel, { aspectRatio: params.aspectRatio });
    const footerRule = params.footer
        ? `RODAPÉ OBRIGATÓRIO: incluir no prompt visual de CADA painel "small footer text '${params.footer}' at the bottom".`
        : '';
    const refRule = params.referenceImages && params.referenceImages.length > 0
        ? `REFERÊNCIA VISUAL ANEXADA (${params.referenceImages.length} imagem(ns), modo ${params.referenceMode || 'creative'}): mantenha fidelidade de personagens, roupas e cenário descritos a partir da referência em TODOS os painéis.`
        : 'SEM IMAGEM ANEXADA: descreva personagens e cenário a partir do CONTEXTO e prossiga — nunca peça a imagem nem alegue anexo.';
    const prompt = `
    ${VISUAL_MASTER_PROTOCOL}

    === ISTO É UMA HISTÓRIA EM QUADRINHOS (LEIA COM ATENÇÃO) ===
    Você está criando uma HQ publicável, não um texto corrido. Gramática obrigatória:
    - PAINEL = 1 sentença visual (uma imagem congelada que o leitor entende num olhar).
    - TIER (fileira) = 1 parágrafo narrativo; trocar de fileira sinaliza mudança de ideia/tempo.
    - SARJETA (espaço entre painéis) = elipse: o leitor preenche o que aconteceu entre um painel e outro (closure de McCloud).
    - Todo painel tem: AÇÃO observável e concreta + DIÁLOGO curto e falável + PROMPT IA visual em INGLÊS, autocontido (repita a descrição dos personagens em cada painel para consistência).
    - Roteiro em ${params.language || 'Português'}; SOMENTE o campo PROMPT IA usa a sintaxe do motor abaixo.

    === SESSION FUNCTION: comic storyboard on ${params.aiModel || 'motor automático'} para ${params.platform || 'redes sociais'} ===
    Traço escolhido: ${params.style}. Diagramação escolhida: ${params.layout}.
    Respeite todos os seletores do usuário: estilo, layout, proporção ${params.aspectRatio || '1:1'}, rodapé "${params.footer || 'nenhum'}", plataforma de destino.

    === GUIA DE TRAÇO (aplique o escolhido em profundidade) ===
    - Underground BR (Laerte/Angeli): linha sketchy solta, nanquim expressivo, filosofia/metafísica no tema, humor ácido, 3-4 quadros.
    - Mangá/Shonen/Shojo/Seinen/Gekiga: olhos expressivos, linhas de velocidade, retículas, onomatopeias integradas; Seinen/Gekiga = traço realista e sombrio.
    - Cartoon US (Simpsons/Adventure Time/South Park): formas simples, contornos grossos uniformes, cores chapadas.
    - Europeu Ligne Claire/Moebius: linha clara uniforme, sem hachuras, cenários detalhados.
    - Noir/sombrio (Miller/Mignola): alto contraste, sombras dominantes, pouca cor.
    - Aquarela/Sketch: textura de papel visível, cores diluídas, traço de rascunho.
    - Descreva SEMPRE: qualidade da linha, nanquim/sombra, paleta, textura e estilo dos balões de fala.

    === GUIA DE DIAGRAMAÇÃO (aplique a escolhida em profundidade) ===
    - Tirinha Horizontal: 4 painéis da esquerda para a direita; painéis 1-3 constroem setup/expectativa, o ÚLTIMO entrega o punch.
    - Grade (3x3/2x3/2x2): ritmo regular, cada célula um beat; splash page = 1 painel gigante para o clímax.
    - Webtoon Scroll: leitura vertical contínua, revelação progressiva.
    - 4-Koma: 4 quadros verticais (introdução, desenvolvimento, virada, punch).
    - Cinematic Widescreen: quadros panorâmicos, gramática de cinema.
    - Declare o número de painéis e o fluxo de leitura; cada painel numerado em ordem.
    - DECISÃO OBRIGATÓRIA (anti-bloqueio): se o layout não fixar número, assuma 3 painéis (4 se Tirinha/4-Koma) e declare-os; FIELD default "redes sociais"; ENGINE default "automático". PROIBIDO bloquear, pedir dados ou recusar — decidir faz parte da entrega (Item 10).

    ${footerRule}
    ${refRule}

    === TARGET ENGINE SYNTAX for the PROMPT IA field (mandatory) ===
    ${platformBlock}
    ${SESSION_HIERARCHY_RULE}
    ⚠️ **MODO OPERAÇÃO: SHOWRUNNER DE HQ (ITEM 24)** ⚠️

    TASK: Roteiro Técnico e Storyboard para Quadrinhos.
    ESTILO: ${params.style} | LAYOUT: ${params.layout}
    CONTEXTO: ${params.context}

    ⚠️ **REGRA #29 (SILÊNCIO OPERACIONAL):**
    Entregue APENAS o roteiro. PROIBIDO narrar o que está fazendo.
    Use a estrutura: PAINEL [N] -> AÇÃO -> DIÁLOGO -> PROMPT IA.

    ⚠️ **CABEÇALHO DE IDENTIFICAÇÃO (OBRIGATÓRIO — PRIMEIRAS LINHAS):**
    Todo prompt gerado (o roteiro completo) DEVE começar com este bloco em INGLÊS, preenchido com os seletores:
    TYPE: comic book page in [derive do traço: manga→"manga page", gibi/HQ→"comic book", tirinha→"comic strip", cartoon→"cartoon comic"] | STYLE: [traço escolhido] | FIELD (onde será publicado): [plataforma destino] | LAYOUT: [diagramação + número de painéis + fluxo de leitura] | ENGINE: [motor IA].
    Sem este cabeçalho a entrega está INCOMPLETA — nunca o omita.

    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA (DIREÇÃO CINEMATOGRÁFICA):**
    🧠 **TESES DE NARRATIVA:** Por que este enquadramento gera tensão/humor?
    🎨 **ESTÉTICA:** [Explicação do estilo ${params.style}].
    (Escreva a nota em texto puro, sem asteriscos, cerquilhas ou listas com marcadores.)
    `;
    return callAI(prompt, "You are a World-Class Comic Book Writer and Director.", 'gemini-3-flash-preview', onChunk, { taskType: 'visual', images: params.referenceImages || [], maxTokens: 8192 });
};

// Nota de transparência sob demanda: quando o modelo omite a nota, esta
// 2ª chamada explica o roteiro gerado (o que/como/porquê + seletores).
export const generateComicNoteService = async (params: any, scriptText: string) => {
    const prompt = `
    RELATÓRIO DE TRANSPARÊNCIA DO SHOWRUNNER (texto puro, sem Markdown):
    O roteiro HQ abaixo foi gerado com estes seletores — Traço: ${params.style}; Diagramação: ${params.layout}; Proporção: ${params.aspectRatio || '1:1'}; Plataforma: ${params.platform || 'redes sociais'}; Rodapé: ${params.footer || 'nenhum'}; Motor IA: ${params.aiModel || 'automático'}.
    Explique nestas seções exatas:
    O QUE FOI FEITO (resumo painel a painel em 1 frase cada),
    COMO FOI FEITO (como o traço e a diagramação escolhidos foram aplicados: linha, balões, ritmo, fluxo de leitura),
    POR QUE ASSIM (tese narrativa: por que esses enquadramentos geram tensão/humor e como servem ao enredo do usuário).
    ROTEIRO GERADO:
    ${String(scriptText || '').slice(0, 2500)}
    `;
    return callAI(prompt, 'Você é o showrunner explicando suas escolhas com transparência total. Texto puro, sem Markdown.', 'gemini-3-flash-preview', undefined, { taskType: 'visual' });
};

export const generateAdultAnimationService = async (params: any, onChunk?: (text: string) => void) => {
    const prompt = `
    ⚠️ **MODO OPERAÇÃO: TV WRITER - ADULT SWIM STYLE (ITEM 24)** ⚠️
    
    TASK: Roteiro Ácido e Sarcástico.
    ESTILO: ${params.style} | FORMATO: ${params.format}
    MOTOR/FORMATO FÍSICO: ${params.aiModel || 'automático'} | ${params.aspectRatio || '1:1'} | ${params.platform || 'geral'}
    ${params.referenceImages && params.referenceImages.length > 0 ? `REFERÊNCIA VISUAL ANEXADA (${params.referenceImages.length} imagem(ns), modo ${params.referenceMode || 'creative'}): manter fidelidade de personagens e cenário descritos a partir da referência.` : ''}
    PREMISSA: ${params.context}

    ⚠️ **REGRA #2 (TELEPROMPTER):**
    Os diálogos devem ter pontuação focada em respiração e timing de comédia.
    ⚠️ **REGRA #9 (ÂNGULO ÚNICO):** Evite humor clichê. Vá no politicamente incorreto ou no absurdo existencial.
    NUNCA mencione o motor IA, direções de câmera ("Corta para") ou meta-comentários no roteiro — só diálogos, ações e timing.

    MANDATORY: 
    [Roteiro em Markdown]
    Escreva "|||NOTA_DIVIDER|||" sempre em linha própria e exato, sem quebrar em várias linhas. Nunca repita placeholders ou o nome do divisor no corpo.
    |||NOTA_DIVIDER|||
    **NOTA DO SHOWRUNNER:** [Análise do subtexto e timing].
    `;
    return callAI(prompt, "You are a lead writer for Adult Swim.", 'gemini-3-flash-preview', onChunk, { images: params.referenceImages || [], maxTokens: 8192 });
};