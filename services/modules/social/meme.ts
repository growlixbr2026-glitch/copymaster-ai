import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS, VISUAL_MASTER_PROTOCOL } from '../../core/aiClient';
import { buildPlatformBlock, SESSION_HIERARCHY_RULE } from '../visual/platformProfiles';

export const generateMemeService = async (params: any, onChunk?: (text: string) => void) => {
    const platformBlock = buildPlatformBlock(params.aiModel, { aspectRatio: params.aspectRatio, customText: params.footer });
    const footerRule = params.footer
        ? `WATERMARK OBRIGATÓRIO: incluir no prompt visual "small watermark text '${params.footer}' in the bottom corner".`
        : '';
    const refRule = params.referenceImages && params.referenceImages.length > 0
        ? `REFERÊNCIA VISUAL ANEXADA (${params.referenceImages.length} imagem(ns), modo ${params.referenceMode || 'creative'}): mantenha fidelidade ao template e aos personagens descritos a partir da referência em TODAS as opções.`
        : 'SEM IMAGEM ANEXADA: descreva template e personagens a partir do CONTEXTO; nunca alegue "imagem anexada" nem peça a imagem.';
    const prompt = `
    ${VISUAL_MASTER_PROTOCOL}

    === SESSION FUNCTION: viral meme IMAGE prompts on ${params.aiModel || 'motor automático'} for ${params.platform || 'redes sociais'} ===
    Respect every user selector: style ${params.style}, template ${params.format}, aspect ${params.aspectRatio}, footer "${params.footer || 'none'}", niche pain from context below.
    ${refRule}

    === WHAT A MEME IS (OBRIGATÓRIO ENTENDER) ===
    Um meme é uma unidade cultural replicável: pega uma DOR COMPARTILHADA do nicho e aplica
    INCONGRUÊNCIA (expectativa quebrada) no formato visual de um template conhecido.
    Anatomia obrigatória de cada opção: SETUP (situação reconhecível da dor, 1 frase curta em PT-BR,
    linguagem de grupo de WhatsApp, sem explicação) + PUNCH (a virada irônica, visual ou segunda frase).
    Fidelidade ao template: ${params.format} tem mecânica própria (ex.: Drake = rejeita X / aprova Y;
    Gru Plan = 3 painéis onde o último subverte; Dois Botões = dilema com suor; Travolta = confusão
    procurando algo; Uno Reverse = inversão instantânea; Expectativa vs Realidade = contraste literal).
    A legenda PT deve fazer o leitor marcar um amigo. PROIBIDO: explicar a piada, moralizar,
    texto longo, humor genérico de IA.

    === OUTPUT POR OPÇÃO ===
    [Legenda PT curta e cortante]
    [Prompt visual 10-steps em INGLÊS com a cena do template + dor]
    ${footerRule}

    === TARGET ENGINE SYNTAX (mandatory) ===
    ${platformBlock}
    ${SESSION_HIERARCHY_RULE}
    ⚠️ **MODO OPERAÇÃO: MEME LORD (ITEM 24)** ⚠️
    TASK: Opções de Memes para o contexto: "${params.context}".
    ESTILO: ${params.style} | FORMATO: ${params.format}
    
    ⚠️ **REGRA #9 (HUMOR ÁCIDO):** O meme deve expor uma "dor real" do nicho com ironia. Evite humor genérico "IA".
    ⚠️ **REGRA #29 (PRAGMATISMO):** Não explique a piada no corpo do texto. 

    MANDATORY:
    PROIBIDO qualquer texto fora das opções e da Nota (sem preâmbulo, sem "Premissa…"). Comece direto na Opção 1.
    NUNCA repita os rótulos [Legenda PT curta e cortante]/[Prompt visual 10-steps]/[WATERMARK OBRIGATÓRIO] como conteúdo — preencha-os com texto real.
    [Opção de Meme]
    |||MEME_DIVIDER|||
    [Opção de Meme]
    Escreva cada divisor em linha própria e exato, sem quebrar em várias linhas. Nunca repita placeholders ou nomes de divisores no corpo.
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA (ANÁLISE DE VIRALIDADE):** [Por que este meme gera compartilhamento?]
    `;
    return callAI(prompt, "You are a World-Class Viral Content Creator specializing in Internet Culture.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', onChunk, { taskType: 'visual', images: params.referenceImages || [], maxTokens: 8192 });
};