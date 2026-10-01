import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS, VISUAL_MASTER_PROTOCOL } from '../../core/aiClient';
import { buildPlatformBlock, SESSION_HIERARCHY_RULE } from '../visual/platformProfiles';

export const generateQuoteCardService = async (params: any, onChunk?: (text: string) => void) => {
    // Overlay pré-preenchido SÓ com frase do usuário: rodapé sozinho como
    // título contradiz a overlaySelfFillRule (espelho de citation.ts:20-22).
    const hasCustom = !!((params.customText || '').trim());
    const overlayText = (params.customText || '').trim();
    const platformBlock = buildPlatformBlock(params.aiModel, { aspectRatio: params.aspectRatio, customText: hasCustom ? overlayText : undefined });
    const refRule = params.referenceImages && params.referenceImages.length > 0
        ? `REFERÊNCIA VISUAL ANEXADA (${params.referenceImages.length} imagem(ns), modo ${params.referenceMode || 'creative'}): mantenha fidelidade de estilo, paleta e composição descritos a partir da referência em TODAS as opções.`
        : 'SEM IMAGEM ANEXADA: crie estilo e composição a partir do TEMA e da ESTÉTICA; nunca alegue anexo nem peça imagem.';
    const footerRule = params.footer
        ? `RODAPE OBRIGATORIO: incluir no prompt visual "small signature text '${params.footer}' in the bottom corner, subtle, high contrast, never covering the main quote".`
        : '';
    const phraseRule = (params.customText || '').trim()
        ? `FRASE DO USUARIO (usar EXATAMENTE, sem reescrever): "${(params.customText || '').trim()}". Cada opcao DEVE renderizar esta frase literal.`
        : 'FRASE: IA cria uma frase curta de impacto a partir do TEMA abaixo, no idioma do usuario.';
    const styleRule = String(params.style || '').toLowerCase().includes('automat')
        ? 'ESTETICA: Automatica (IA Define a Estetica) - a IA escolhe a estetica mais eficaz para o tema/plataforma e JUSTIFICA a escolha na Nota.'
        : `ESTETICA ESCOLHIDA PELO USUARIO (obrigatoria): ${params.style}.`;
    const prompt = `
    ${VISUAL_MASTER_PROTOCOL}

    === SESSION FUNCTION: typographic quote-card IMAGE prompts on ${params.aiModel || 'motor automático'} for ${params.platform || 'redes sociais'} ===
    Respect every user selector: style ${params.style}, ${params.count} options, platform ${params.platform}, aspect ${params.aspectRatio}, footer "${params.footer || 'none'}", phrase "${(params.customText || '').trim() || 'IA cria'}", theme from context. Quotes stay in the user language; visual prompt follows the engine syntax below.

    === TARGET ENGINE SYNTAX (mandatory) ===
    ${platformBlock}
    ${SESSION_HIERARCHY_RULE}
    ⚠️ **MODO OPERAÇÃO: DESIGNER TIPOGRÁFICO (ITEM 24)** ⚠️

    TASK: ${params.count} Opcoes de Quote Cards.

    INPUTS TECNICOS (todos escolhidos pelo usuario ou pelo sistema - aplicar TODOS):
    - TEMA: ${params.context}
    - ${phraseRule}
    - ${styleRule}
    - PLATAFORMA (Campo de Batalha): ${params.platform}
    - PROPORCAO: ${params.aspectRatio} (aplicar a sintaxe de aspect do bloco TARGET ENGINE acima, sem inventar flags)
    - MOTOR IA: ${params.aiModel}
    - RODAPE/ASSINATURA: ${params.footer || 'Nenhum'}
    - IDIOMA DA FRASE: ${params.language || 'usuario'} (a frase visivel na imagem fica neste idioma; o prompt visual tecnico fica em INGLES)
    ${refRule}
    - QUANTIDADE: ${params.count} opcoes distintas
    ${footerRule ? '    - ' + footerRule : ''}

    ⚠️ **REGRA #5 (HIERARQUIA VISUAL):**
    O prompt gerado DEVE exigir "High contrast between text and background", "Negative space for typography", "Elegant layout".

    ⚠️ **REGRA #32 (GROUNDING):**
    Se o tema for de autor conhecido, use Search para garantir a citação exata.

    === OUTPUT POR OPCAO (obrigatorio) ===
    [FRASE PT curta de impacto]
    [VISUAL PROMPT 10-steps em INGLES com cena, tipografia, luz, composicao + frase exata entre aspas + proporcao + rodape quando houver]

    MANDATORY: Use "|||QUOTE_DIVIDER|||" entre opções, sempre em linha própria e exato (3 pipes de cada lado — confira a contagem antes de entregar), sem quebrar em várias linhas. Nunca repita placeholders ou nomes de divisores no corpo.
    Escreva cada divisor em linha própria e exato, sem quebrar em várias linhas. Nunca repita placeholders ou nomes de divisores no corpo.

    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA (RELATORIO TECNICO):**
    FICHA TECNICA:
    *   **Motor IA:** ${params.aiModel}
    *   **Proporcao Aplicada:** ${params.aspectRatio}
    *   **Plataforma:** ${params.platform}
    *   **Estetica Selecionada:** ${params.style}
    *   **Frase Fonte:** ${(params.customText || '').trim() ? '"' + (params.customText || '').trim() + '" (usuario)' : 'criada pela IA a partir do tema'}
    *   **Rodape:** ${params.footer || 'Nenhum'}

    JUSTIFICATIVA VISUAL: [Por que esta tipografia + cores + luz funcionam para este tema e plataforma?]
    `;
    return callAI(prompt, GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', onChunk, { tools: [{ googleSearch: {} }], taskType: 'visual', images: params.referenceImages || [], maxTokens: 8192 });
};