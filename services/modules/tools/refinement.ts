
import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

export const refineCopyService = async (params: any) => {
    // PRECEDÊNCIA: a instrução clicada/digitada sempre vence. A meta numérica
    // só vale quando a instrução pede ajuste de tamanho ("Ajustar para o
    // tamanho alvo", pivot ou custom com meta) — nunca contra Expandir/Encurtar.
    const wantsSize = /tamanho alvo|metas? de caracteres|reduz.*caracter|expand.*caracter|caracteres/i.test(params.instruction || '');
    const target = Number(params.targetLength) || 0;
    const lengthConstraint = (target > 0 && wantsSize)
        ? `⚠️ **META DE CARACTERES (ITEM 27):**
           Ajuste o texto para aproximadamente ${target} caracteres (tolerância +/- 10%).
           Distribua ou condense com substância — sem enchimento genérico e sem cortar a ideia principal.`
        : `Tamanho: siga exatamente o que a instrução pede (expandir, encurtar ou manter). Nenhuma meta numérica se aplica.`;

    const prompt = `
    ⚠️ **MODO OPERAÇÃO: EDITOR SÊNIOR (ITEM 24)** ⚠️

    TASK: Refine/Rewrite the following text.
    Instruction: ${params.instruction}
    ${lengthConstraint}
    Language: ${params.language}
    Platform: ${params.platform || 'General'}

    ⚠️ **DIRETRIZES DE VÍDEO:**
    Se a instrução envolver "ritmo", "energia" ou "retenção", ajuste a pontuação para facilitar a fala e use palavras mais curtas e impactantes.

    ⚠️ **ANTI-INVENÇÃO (ITENS 7/19 — OBRIGATÓRIO):**
    PROIBIDO inventar nomes, dados, estatísticas, exemplos ou depoimentos que não estejam no texto original ou na instrução.
    Para expandir, aprofunde as IDEIAS JÁ PRESENTES (desdobre argumentos, detalhe mecanismos, varie ângulos) — nunca fabrique fatos.
    Se um dado concreto for indispensável e estiver ausente, escreva [INSERIR DADO].

    ORIGINAL TEXT:
    "${params.originalText}"

    ⚠️ **BLOQUEIO OPERACIONAL (ITEM 29):**
    - RETORNE APENAS O TEXTO REFINADO.
    - PROIBIDO justificativas, saudações ou divisores nesta resposta.
    `;

    return callAI(prompt, `You are a Senior Editor. Follow the GOLDEN_SYSTEM_INSTRUCTIONS below strictly, especially factual integrity (never invent data) and operational silence. Just the clean output.\n${GOLDEN_SYSTEM_INSTRUCTIONS}`, 'gemini-3-flash-preview');
};

export const checkAIProbabilityService = async (text: string, language: string) => {
    const { checkAIProbabilityService: check } = await import('./aiDetection');
    return check(text, language);
};

export const humanizeTextService = async (text: string, language: string, signals?: any[]) => {
    const { humanizeTextService: humanize } = await import('./aiDetection');
    return humanize(text, language, signals);
};
