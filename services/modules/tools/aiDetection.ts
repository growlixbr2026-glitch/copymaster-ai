import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

// Gate: Humanizar só exibe resultado quando a probabilidade de IA for >= 70%.
export const HUMANIZE_THRESHOLD = 70;

export interface AISignalHit {
  family: string;
  label: string;
  evidence: string[];
  count: number;
  fix: string;
}

export interface AICheckResult {
  score: number;
  band: 'humano' | 'misto' | 'provavel_ia';
  signals: AISignalHit[];
  reason: string;
  caveat: string;
  truncated: boolean;
  error?: string;
}

// Taxonomia de sinais de texto malfeito por IA (PT-BR).
// Base: Exame (perplexidade/burstiness, conectivos, dualidade, trios),
// Estadão (14 dicas), USP/Nature-Pangram, surveys arXiv (riqueza lexical,
// formalidade impessoal, regularidade sintática).
export const AI_TELLTALE_SIGNS: { family: string; label: string; patterns: string[]; fix: string }[] = [
  {
    family: 'conectivos_inchados',
    label: 'Conectivos inchados',
    patterns: ['além disso', 'por conseguinte', 'em suma', 'vale ressaltar', 'é importante ressaltar', 'vale destacar', 'de forma geral', 'em termos gerais', 'no que diz respeito'],
    fix: 'Troque por transições variadas e curtas (mas, e, então, por isso) ou corte o conectivo e emende as frases.',
  },
  {
    family: 'encerramento_generico',
    label: 'Conclusão genérica que repete o texto',
    patterns: ['concluindo', 'diante do exposto', 'em conclusão', 'para concluir', 'em resumo', 'portanto,', 'de modo geral,'],
    fix: 'Feche com uma frase de ação, dado concreto ou pergunta — nunca resumindo o que já foi dito.',
  },
  {
    family: 'dualidade',
    label: 'Dualidade artificial (não é X, é Y)',
    patterns: ['não é sobre', 'não se trata de', 'não é apenas', 'é muito mais do que', 'vai além de'],
    fix: 'Afirme direto a tese sem o contraste fabricado de negação seguida de exaltação.',
  },
  {
    family: 'trios_complementares',
    label: 'Trios complementares para dar corpo',
    patterns: ['rápido, fácil e', 'claro, objetivo e', 'de forma clara, objetiva e', 'eficiente, eficaz e'],
    fix: 'Fique com UM adjetivo forte ou troque o trio por um exemplo concreto.',
  },
  {
    family: 'transicoes_padronizadas',
    label: 'Transições padronizadas',
    patterns: ['por outro lado', 'por sua vez', 'nesse sentido', 'nesse contexto', 'a seguir', 'como mencionado'],
    fix: 'Varie o ritmo: frase curta de impacto seguida de frase longa explicativa.',
  },
  {
    family: 'hedging_politico',
    label: 'Polidez e hedging excessivos',
    patterns: ['é fundamental', 'é essencial', 'desempenha um papel fundamental', 'no mundo atual', 'na era digital', 'cada vez mais'],
    fix: 'Corte o hedging e assuma uma opinião: troque o genérico por um verbo forte e específico.',
  },
  {
    family: 'superficialidade',
    label: 'Profundidade aparente sem dados',
    patterns: ['diversos estudos', 'especialistas afirmam', 'técnicas de gestão', 'estratégias eficazes', 'resultados expressivos', 'de forma significativa'],
    fix: 'Ancore em UM dado, nome, número ou caso concreto — ou marque [INSERIR DADO] em vez de fingir evidência.',
  },
  {
    family: 'neutralidade_asseptica',
    label: 'Neutralidade asséptica sem voz',
    patterns: ['é possível afirmar', 'pode-se dizer', 'há quem diga', 'de maneira geral', 'em linhas gerais'],
    fix: 'Assine o texto: primeira pessoa ou juízo explícito, com referência cultural concreta quando couber.',
  },
];

// Varredura local determinística: acha expressões literais da taxonomia.
// Serve de suspeita instantânea e de guia cirúrgico para o Humanizar.
export function quickLocalScan(text: string, maxEvidence = 3): AISignalHit[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const hits: AISignalHit[] = [];
  for (const s of AI_TELLTALE_SIGNS) {
    const evidence: string[] = [];
    for (const p of s.patterns) {
      const idx = lower.indexOf(p.toLowerCase());
      if (idx >= 0) {
        // Extrai a frase ao redor da ocorrência como evidência literal
        const start = Math.max(0, text.lastIndexOf('.', idx - 1) + 1);
        let end = text.indexOf('.', idx + p.length);
        end = end < 0 ? Math.min(text.length, idx + 120) : Math.min(text.length, end + 1);
        evidence.push(text.slice(start, end).trim().slice(0, 140));
        if (evidence.length >= maxEvidence) break;
      }
    }
    if (evidence.length > 0) hits.push({ family: s.family, label: s.label, evidence, count: evidence.length, fix: s.fix });
  }
  return hits;
}

const bandOf = (score: number): AICheckResult['band'] =>
  score >= HUMANIZE_THRESHOLD ? 'provavel_ia' : score >= 40 ? 'misto' : 'humano';

const SIGNALS_CATALOG = AI_TELLTALE_SIGNS.map((s) => `- ${s.family} (${s.label}): expressões típicas: ${s.patterns.slice(0, 5).join('; ')}.`).join('\n');

export const checkAIProbabilityService = async (text: string, language: string): Promise<AICheckResult> => {
  const truncated = text.length > 1500;
  const slice = text.substring(0, 1500);
  const local = quickLocalScan(slice);
  const localHint = local.length > 0
    ? `SUSPEITAS LOCAIS (varredura determinística, confirme ou refute cada uma):\n${local.map((h) => `- ${h.family}: "${h.evidence[0]}"`).join('\n')}`
    : 'Varredura local não achou expressões da taxonomia — avalie ritmo, perplexidade e voz mesmo assim.';

  const prompt = `
  ⚠️ **MODO OPERAÇÃO: PERITO FORENSE DE TEXTO (ITEM 20)** ⚠️
  TASK: Estimar a probabilidade (0-100) de o texto abaixo ter sido gerado por IA, com evidências.
  LANGUAGE: ${language}

  CATÁLOGO DE SINAIS (PT-BR) — procure cada família no texto:
  ${SIGNALS_CATALOG}

  RUBRICA FORENSE (pesquise como GPTZero/Originality + literatura):
  1. Perplexidade comportamental: vocabulário previsível e genérico (score alto) vs sinônimos fora do óbvio, metáforas, saltos lógicos (score baixo).
  2. Burstiness: frases de comprimento/complexidade uniformes e parágrafos simétricos (alto) vs alternância de curtas de impacto e longas subordinadas (baixo).
  3. Densidade das famílias do catálogo acima (cada ocorrência conta).
  4. Voz própria: opinião, ironia, referência cultural concreta, dados específicos (reduzem o score).
  5. CALIBRAÇÃO: textos curtos e de falantes com vocabulário simples geram falsos positivos — abaixo de 40 declare humano; 40-69 misto; só >= 70 provável IA.

  ${localHint}

  TEXTO:
  "${slice}"

  OUTPUT — JSON estrito, sem Markdown, sem comentários:
  { "score": number (0-100), "reason": "1-2 frases técnicas", "signals": [{ "family": "id do catálogo", "evidence": ["trecho literal do texto, máx 3"], "count": number }], "caveat": "limitação aplicável (texto curto, possível falso positivo, etc.) ou string vazia" }
  `;

  const response = await callAI(prompt, GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', undefined, {
    responseMimeType: 'application/json',
  });
  if (response.error) return { score: 0, band: 'humano', signals: [], reason: '', caveat: '', truncated, error: response.error };
  const parseCheck = (raw: string): AICheckResult | null => {
    try {
      const parsed = JSON.parse(raw);
      const score = Math.max(0, Math.min(100, Number(parsed.score) || 0));
      if (!Number.isFinite(score)) return null;
      const signals: AISignalHit[] = Array.isArray(parsed.signals)
        ? parsed.signals.map((s: any) => {
            const catalog = AI_TELLTALE_SIGNS.find((c) => c.family === s.family);
            return {
              family: String(s.family || 'outro'),
              label: catalog?.label || 'Outro sinal',
              evidence: Array.isArray(s.evidence) ? s.evidence.slice(0, 3).map(String) : [],
              count: Number(s.count) || 0,
              fix: catalog?.fix || '',
            };
          }).filter((s: AISignalHit) => s.evidence.length > 0 || s.count > 0)
        : [];
      return { score, band: bandOf(score), signals, reason: String(parsed.reason || ''), caveat: String(parsed.caveat || ''), truncated };
    } catch { return null; }
  };
  let result = parseCheck(response.text || '');
  if (!result) {
    // Resiliência :free: modelo às vezes envolve o JSON em prosa — extrai o bloco {...} e tenta de novo.
    const s = response.text || '';
    const st = s.indexOf('{'), en = s.lastIndexOf('}');
    if (st !== -1 && en > st) result = parseCheck(s.substring(st, en + 1));
  }
  if (result) return result;
  return { score: 0, band: 'humano', signals: [], reason: '', caveat: '', truncated, error: 'Analysis failed' };
};

export const humanizeTextService = async (text: string, language: string, signals?: AISignalHit[]) => {
  const found = signals && signals.length > 0 ? signals : quickLocalScan(text);
  const surgery = found.length > 0
    ? `CIRURGIA GUIADA — corrija exatamente estes sinais detectados:\n${found.map((h) => `- ${h.family} (${h.label}): ${h.fix} Evidência: "${(h.evidence[0] || '').slice(0, 120)}"`).join('\n')}`
    : 'Nenhum sinal catalogado detectado: foque em ritmo (burstiness) e voz própria.';

  const prompt = `
  ⚠️ **MODO OPERAÇÃO: GHOSTWRITER CIRÚRGICO (ITEM 24)** ⚠️
  TASK: Reescrever o texto para soar humano, SEM mudar contexto, fatos, números, nomes, ofertas, CTAs nem a ordem das ideias.
  LANGUAGE: ${language}

  ${surgery}

  TÉCNICAS OBRIGATÓRIAS (baseadas em detecção de IA — perplexidade/burstiness):
  - Substitua cada expressão do catálogo por formulação específica e variável; nunca troque um clichê por outro.
  - Quebre o ritmo constante: alterne frases curtas de impacto com frases longas explicativas; corte parágrafos simétricos.
  - Elimine trios complementares, dualidades fabricadas e conclusões que resumem; feche com ação, dado ou pergunta.
  - Assine o texto: opinião explícita ou detalhe concreto e cultural quando o tema permitir.
  - PROIBIDO inventar dados, estudos ou números. Se faltar evidência concreta, use [INSERIR DADO].
  - TEXTO PURO COPIA-COLA: proibido asteriscos, cerquilha, marcadores de lista no início de linha, numeração com ponto e crases. Apenas frases e parágrafos.

  TEXTO ORIGINAL:
  "${text}"

  ⚠️ **BLOQUEIO OPERACIONAL (ITEM 29):** RETORNE APENAS O TEXTO REESCRITO. Proibido justificativas, saudações ou divisores.
  `;
  return callAI(prompt, 'You are a Professional Ghostwriter. Return only the rewritten text.', 'gemini-3-flash-preview');
};
