import { callAI } from '../../core/aiClient';

export type CitationVerdict = 'CONFIRMADA' | 'TRADUCAO-LIVRE' | 'DUVIDOSA' | 'FALSA';

export interface CitationCheck {
    index: number;
    verdict: CitationVerdict;
    evidence: string;
    note: string;
}

// Normaliza para comparação insensível (mesmo padrão de diagnostic.ts).
const normalize = (s: string) =>
    (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Pré-cheque determinístico custo-0: a frase candidata menciona o autor/obra?
// Não prova veracidade (isso é papel do juiz), mas sinaliza alto risco.
export function fuzzyAuthorMatch(quoteText: string, author: string): boolean {
    if (!author || /automat/i.test(author)) return true;
    const q = normalize(quoteText);
    const lastName = normalize(author).split(/[\s()—-]+/).filter((t) => t.length > 2).pop() || '';
    if (!lastName) return true;
    return q.includes(lastName.slice(0, 5));
}

const VERIFY_SCHEMA = {
    type: 'object',
    properties: {
        verdicts: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    index: { type: 'number' },
                    verdict: { type: 'string' },
                    evidence: { type: 'string' },
                    note: { type: 'string' },
                },
            },
        },
    },
};

// PASS 2 — juiz cético em batch (1 chamada para todas as candidatas, sem N×custo).
// provider override: usa o MESMO provedor da geração (o de texto pode não ter chave).
export const verifyCitationService = async (
    candidates: Array<{ quote: string; author: string; work: string }>,
    language: string = 'pt',
    provider?: string
): Promise<CitationCheck[]> => {
    if (!candidates.length) return [];
    const items = candidates
        .map((c, i) => `[CANDIDATA ${i}] FRASE: "${(c.quote || '').slice(0, 400)}" | AUTOR ALEGADO: ${c.author} | OBRA ALEGADA: ${c.work}`)
        .join('\n');
    const prompt = `
    Voce e um verificador factual cetico (anti-alucinacao). Use Search.
    Para cada candidata abaixo, verifique se a frase e REALMENTE do autor/obra alegados.
    ${items}
    Vereditos: CONFIRMADA (frase literal encontrada do autor) | TRADUCAO-LIVRE (ideia fiel, redacao traduzida/adaptada) | DUVIDOSA (circula sem fonte primaria) | FALSA (outro autor ou inexistente).
    Regras: versiculo biblico exige referencia canonica; proverbio atribui-se a cultura, nao a pessoa; biscoito chines e anonimo por definicao.
    PROIBIDO chutar: sem evidencia → DUVIDOSA, nunca CONFIRMADA.
    Responda APENAS JSON no formato {"verdicts": [{"index": N, "verdict": "...", "evidence": "url ou titulo real", "note": "curta"}]}.
    Idioma das notas: ${language}.
    `.trim();
    try {
        const r = await callAI(prompt, 'Voce e um verificador factual. Responda apenas o JSON solicitado.', 'gemini-3-flash-preview', undefined, {
            provider,
            tools: [{ googleSearch: {} }],
            taskType: 'text',
            responseMimeType: 'application/json',
            responseSchema: VERIFY_SCHEMA,
        });
        const parsed = JSON.parse((r.text || '').replace(/```json|```/g, '').trim());
        const list = Array.isArray(parsed.verdicts) ? parsed.verdicts : [];
        return candidates.map((_, i) => {
            const v = list.find((x: any) => Number(x?.index) === i) || {};
            const verdict = String(v.verdict || '').toUpperCase().replace(/[^A-Z-]/g, '') as CitationVerdict;
            return {
                index: i,
                verdict: verdict === 'CONFIRMADA' || verdict === 'TRADUCAO-LIVRE' || verdict === 'FALSA' ? verdict : 'DUVIDOSA',
                evidence: String(v.evidence || '[FONTE NÃO INFORMADA]').slice(0, 200),
                note: String(v.note || '').slice(0, 200),
            };
        });
    } catch {
        // Falha do juiz: honesto — tudo DUVIDOSA, nunca alegar verificação que não ocorreu.
        return candidates.map((_, i) => ({ index: i, verdict: 'DUVIDOSA' as CitationVerdict, evidence: '[FONTE NÃO INFORMADA]', note: 'Verificação indisponível — conferir antes de publicar.' }));
    }
};
