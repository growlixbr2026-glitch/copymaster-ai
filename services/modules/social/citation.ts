import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS, VISUAL_MASTER_PROTOCOL } from '../../core/aiClient';
import { buildPlatformBlock, SESSION_HIERARCHY_RULE } from '../visual/platformProfiles';
import { buildReferenceRule } from '../../pinterestRef';
import { analyzeModelImage, buildModelDnaBlock, ModelDna } from '../../vision/modelDna';

export const CITATION_DIVIDER = '|||CITATION_DIVIDER|||';

const isAuto = (v: any) => {
    const s = String(v || '').trim().toLowerCase();
    return !s || s === 'auto' || s.startsWith('✨') || s.includes('automat');
};

export const generateCitationService = async (params: any, onChunk?: (text: string) => void) => {
    const showAuthor = params.showAuthor !== false;
    const overlayAuthor = showAuthor && params.author && !isAuto(params.author) ? ` — ${params.author}` : '';
    // Overlay pré-preenchido SÓ com frase do usuário (+autor): rodapé sozinho
    // contradiz a overlaySelfFillRule; o modelo preenche frase+autor+rodapé.
    // Sem frase do usuário, o bloco do motor traz só aspecto (sem TEXT OVERLAY
    // pré-preenchido) para não congelar um estado intermediário autor-só.
    const hasCustom = !!((params.customText || '').trim());
    const overlayText = ((params.customText || '').trim() || '') + overlayAuthor;
    const platformBlock = buildPlatformBlock(params.aiModel, { aspectRatio: params.aspectRatio, customText: hasCustom ? (overlayText.trim() || undefined) : undefined });
    const authorOnImageRule = showAuthor
        ? 'NOME NA IMAGEM (obrigatorio): todo VISUAL PROMPT DEVE renderizar como overlay tipografico (a) a frase exata entre aspas e (b) em linha separada e tipo menor, AUTOR — OBRA. Alto contraste, sem cobrir a frase.'
        : 'NOME NA IMAGEM: DESLIGADO pelo usuario — renderize APENAS a frase (+ rodape se houver) na arte, SEM nome do autor na imagem. A atribuicao AUTOR — OBRA permanece apenas no texto da opcao e na Nota.';
    const overlaySelfFillRule = 'TEXT OVERLAY (preenchimento obrigatorio pelo modelo): no bloco TARGET ENGINE, o campo TEXT OVERLAY DEVE conter a frase exata da opcao entre aspas + autor — obra' + (showAuthor ? '' : ' (autor suprimido: DESLIGADO)') + ' + rodape quando houver. NUNCA deixe TEXT OVERLAY so com o rodape.';
    const footerRule = params.footer
        ? `RODAPE OBRIGATORIO: incluir no prompt visual "small signature text '${params.footer}' in the bottom corner, subtle, high contrast, never covering the main quote".`
        : '';
    const authorRule = isAuto(params.author)
        ? 'AUTOR: Automatico - a IA escolhe a personalidade/livro/proverbio mais forte para o tom e a fonte abaixo e DECLARA a escolha na ficha tecnica.'
        : `AUTOR OBRIGATORIO (atribuicao exata, nunca trocar): ${params.author}. AREA: ${params.area}.`;
    const toneRule = isAuto(params.tone)
        ? 'TOM: Automatico - a IA sente o contexto e escolhe o tom de maior engajamento, declarando-o.'
        : `TOM OBRIGATORIO (filtra o sentido da citacao, nunca reescreve a frase): ${params.tone}. Se o autor nao tem citacao real nesse tom, use a real mais proxima e DECLARE a adaptacao na Nota (nunca invente).`;
    const sourceRule = isAuto(params.source)
        ? 'FONTE: Automatica - a melhor origem para este autor e tom (fala, musica, livro, filme, discurso, entrevista, versiculo, proverbio, biscoito).'
        : `FONTE OBRIGATORIA (tipo de evidencia e formato da atribuicao): ${params.source}. Se incompativel com o autor (ex.: filosofo grego + trecho de musica), use a fonte real do autor e DECLARE a troca na Nota.`;
    // PASS A — modelo visual: DNA pré-analisado (componente, local ou visão) ou
    // análise direta aqui SOMENTE se o provedor for Gemini (sem chave, sem bloqueio:
    // o Gerar usa preset+link honestamente em vez de falhar).
    let dna: ModelDna | undefined = params.modelDna;
    let provider = 'openrouter';
    try { provider = localStorage.getItem('primary_prompt_provider') || 'openrouter'; } catch {}
    if (!dna && params.modelImage && provider === 'gemini') {
        try { const a = await analyzeModelImage(params.modelImage); if (a.dna) dna = a.dna; } catch {}
    }
    const useModel = !!params.useModel;
    const ref = useModel
        ? buildReferenceRule({ ref: params.modelRef, attachedBase64: params.modelImage, provider })
        : { rule: '', images: [] as string[], seenPixels: false };
    const dnaBlock = dna ? buildModelDnaBlock(dna, params.aiModel) : '';
    const typeAntiGenericRule = dna
        ? 'TIPOGRAFIA ANTI-GENERICA (obrigatorio): o step de tipografia do VISUAL PROMPT DEVE transcrever os descritores do MODEL DNA acima (estilo do traco, peso, textura, alinhamento) verbatim. PROIBIDO resumir para "bold sans-serif" ou "condensed typeface" genericos.'
        : '';
    const modelNote = !useModel
        ? 'Modelo de referencia: Nenhum'
        : (params.modelRef?.pageUrl || params.modelLink
            ? `Modelo de referencia: ${params.modelRef?.pageUrl || params.modelLink} (${ref.seenPixels || dna ? 'pixels visualizados' : 'preset + link, modelo NAO visualizado'})`
            : `Modelo de referencia: estilo quote-text preset (${ref.seenPixels || dna ? 'pixels visualizados' : 'modelo NAO visualizado'})`);
    const prompt = `
    ${VISUAL_MASTER_PROTOCOL}

    === SESSION FUNCTION: famous-quotation IMAGE prompts (CITATION, real pre-existing quote, NEVER authored) on ${params.aiModel || 'motor automático'} for ${params.platform || 'redes sociais'} ===
    CITATION means a REAL quote that already exists, by someone else. PROHIBITED to invent a phrase and attribute it. Every option carries exact attribution AUTHOR — WORK. Quotes stay in the user language; visual prompt follows the engine syntax below.

    === TARGET ENGINE SYNTAX (mandatory) ===
    ${platformBlock}
    ${SESSION_HIERARCHY_RULE}
    ${dnaBlock ? `\n    === MODEL DNA (vision, mandatory for every VISUAL PROMPT) ===\n    ${dnaBlock}\n    PRECEDENCIA: a PROPORCAO do usuario (INPUTS) sempre vence o aspecto do DNA; use o DNA para estilo/layout/paleta/luz, nunca para trocar a proporcao.\n` : ''}
    ${ref.rule ? `    ${ref.rule}\n` : ''}
    ⚠️ **MODO OPERAÇÃO: CURADOR VERIFICADOR (ITEM 24 + ITEM 32)** ⚠️

    TASK: ${params.count} Opcoes de Citacao para publicar (quote-text de alto engajamento).

    INPUTS TECNICOS (aplicar TODOS):
    - ${authorRule}
    - ${toneRule}
    - ${sourceRule}
    - ESTILO VISUAL: ${params.style}
    - PLATAFORMA (Campo de Batalha): ${params.platform}
    - PROPORCAO: ${params.aspectRatio} (sintaxe de aspect do bloco TARGET ENGINE acima, sem inventar flags)
    - MOTOR IA: ${params.aiModel}
    - RODAPE/ASSINATURA: ${params.footer || 'Nenhum'}
    - IDIOMA DA CITACAO: ${params.language || 'usuario'} (frase visivel neste idioma; prompt visual tecnico em INGLES)
    - TEMA/CONTEXTO EXTRA: ${params.context || 'Nenhum'}
    - QUANTIDADE: ${params.count} opcoes distintas
    - ${authorOnImageRule}
    - ${overlaySelfFillRule}
    ${typeAntiGenericRule ? '    - ' + typeAntiGenericRule : ''}
    ${footerRule ? '    - ' + footerRule : ''}

    ⚠️ **REGRA #5 (HIERARQUIA VISUAL):**
    O prompt gerado DEVE exigir "High contrast between text and background", "Negative space for typography", "Elegant layout".

    ⚠️ **REGRA #32 (GROUNDING ANTI-ALUCINACAO):**
    Use Search para confirmar que cada citacao e REAL e do autor/fonte alegados. Versiculo biblico exige referencia Livro Cap:Versiculo. Proverbio exige cultura de origem (nunca invente pessoa). Biscoito chines e sempre anonimo ("sabedoria tradicional"). Sem evidencia → marque [NAO VERIFICADA] em vez de fingir certeza.

    === OUTPUT POR OPCAO (obrigatorio) ===
    "CITACAO em PT entre aspas" (traducao livre marcada quando nao literal)
    AUTOR — OBRA/FONTE (ex.: SÊNECA — Cartas a Lucílio | BÍBLIA — Salmos 23:1 | PROVÉRBIO CHINÊS — tradicional)
    LEGENDA curta para publicar (1-2 linhas, com gancho)
    TEXTO NA IMAGEM: [frase]${showAuthor ? ' + [AUTOR — OBRA]' : ' (somente a frase, sem autor — escolha do usuario)'}
    VISUAL PROMPT 10-steps em INGLES (cena, tipografia, luz, composicao + frase exata entre aspas + proporcao + rodape quando houver)

    MANDATORY: Use "${CITATION_DIVIDER}" entre opções, sempre em linha própria e exato, sem quebrar em várias linhas. Nunca repita placeholders ou nomes de divisores no corpo.

    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA (RELATORIO TECNICO):**
    FICHA TECNICA:
    *   **Motor IA:** ${params.aiModel}
    *   **Proporcao Aplicada:** ${params.aspectRatio}
    *   **Plataforma:** ${params.platform}
    *   **Area:** ${params.area} | **Autor:** ${params.author} | **Tom:** ${params.tone} | **Fonte:** ${params.source}
    *   **Nome na imagem:** ${showAuthor ? 'Sim (frase + autor)' : 'Nao (somente a frase — escolha do usuario)'}
    *   **Rodape:** ${params.footer || 'Nenhum'}
    *   **${modelNote}**

    JUSTIFICATIVA VISUAL: [Por que esta tipografia + luz + composicao funcionam para este autor e plataforma?]

    ⚠️ **PROIBIDO afirmar verificacao nesta Nota** (ex.: "verificado em NVI/ARA"): a verificacao real e feita pelos selos do sistema apos a geracao. Declare apenas adaptacoes honestas (tom/fonte proxima, traducao livre).
    `;
    return callAI(prompt, GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', onChunk, { tools: [{ googleSearch: {} }], taskType: 'visual', images: ref.images.length ? ref.images : undefined, maxTokens: 8192 });
};
