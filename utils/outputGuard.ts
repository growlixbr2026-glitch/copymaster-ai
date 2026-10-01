/**
 * outputGuard — camada determinística pós-geração (funciona com qualquer
 * modelo, zero quota). Repara o que é mecânico e sinaliza o que exige juízo.
 *
 * - repairDividers: conserta divisores quase-certos (pipe final faltando,
 *   quebra de linha no meio, NOTE vs NOTA já tolerado no split).
 * - detectRefusal: recusa falsa ("não posso", "me mande a imagem") → retry.
 * - verifyStats: % e números sem fonte na mesma frase → lista p/ selo + limpeza.
 * - cleanStats: troca número sem lastro por [INSERIR DADO] (1 clique na UI).
 * - sanitizeTeleprompter: travessões → pausa simples (fala pura).
 */

const DIVIDERS = [
  'DIVIDER', 'NOTA_DIVIDER', 'NOTE_DIVIDER', 'EMAIL_DIVIDER', 'ADS_DIVIDER',
  'SLIDE_DIVIDER', 'QUOTE_DIVIDER', 'CITATION_DIVIDER', 'LETTERING_DIVIDER',
  'MEME_DIVIDER', 'INSP_DIVIDER', 'LOGO_OPTION_DIVIDER', 'YT_OPTION_DIVIDER',
  'SCENE_DIVIDER', 'SCHEMA_DIVIDER', 'PRD_DIVIDER',
];

/** Repara divisores quase-certos. Idempotente e seguro (só toca pipes). */
export function repairDividers(raw: string): string {
  if (!raw) return raw;
  let out = String(raw);
  // 1) "|||QUOTE_DIVIDER||" (pipe final faltando) → completa.
  out = out.replace(/\|{3}([A-Z_]*DIVIDER)\|{1,2}(?!\|)/g, '|||$1|||');
  // 2) Divisor quebrado em linhas: "|||\n|NOTA_DIVIDER|" → junta.
  out = out.replace(/\|{2,}\s*\n\s*\|{0,2}([A-Z_]*DIVIDER)\s*\|{1,3}/g, '|||$1|||');
  // 2b) Divisor inline colado em texto → isola em linha própria.
  // (Só quando colado; já separado por espaço/quebra não é tocado.)
  out = out.replace(/([^\n\s])(\|\|\|[A-Z_]+DIVIDER\|\|\|)/g, '$1\n$2');
  out = out.replace(/(\|\|\|[A-Z_]+DIVIDER\|\|\|)([^\n\s])/g, '$1\n$2');
  // 3) NOTE → NOTA (forma canônica do contrato).
  out = out.replace(/\|\|\|NOTE_DIVIDER\|\|\|/gi, '|||NOTA_DIVIDER|||');
  void DIVIDERS;
  return out;
}

/** Recusa falsa do modelo? (pede imagem/dados em vez de gerar). */
export function detectRefusal(text: string): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  const patterns = [
    /desculpe[^.]{0,80}(nao|não) po[sd][so]/,
    /n[aã]o posso (prosseguir|gerar|continuar|criar)/,
    /n[aã]o consigo (prosseguir|gerar|criar)/,
    /please provide (the image|a clear)/,
    /i need the reference image/,
    /provide the image or/,
    /aguardando (imagem|dados|conteudo)/,
    /falta(m)? dado(s)? essencial/,
  ];
  return patterns.some((re) => re.test(t));
}

export interface StatHit {
  /** Trecho da frase com o número. */
  sentence: string;
  /** O número/% encontrado. */
  value: string;
  /** Tem fonte entre parênteses ou [INSERIR DADO]/[FONTE na frase? */
  sourced: boolean;
}

/** Acha % e números "de efeito" sem fonte na mesma frase. */
export function verifyStats(text: string): StatHit[] {
  if (!text) return [];
  const hits: StatHit[] = [];
  const sentences = String(text).split(/(?<=[.!?\n])\s+/);
  // Fonte válida: ano entre parênteses, [INSERIR DADO]/[FONTE...], ou "fonte/fonte:".
  const SOURCED_RE = /\((?:[^()]*\b(19|20)\d{2}\b[^()]*|[^()]*fonte[^()]*)\)|\[INSERIR DADO\]|\[FONTE/i;
  for (const s of sentences) {
    const m = s.match(/\d[\d.,]*\s*%|\b\d{3,}(?:[.,]\d+)?\b(?=\s*(?:clientes|reais|r\$|mil|milh|seguidores|pessoas|vendas|leads))/i);
    if (!m) continue;
    const sourced = SOURCED_RE.test(s);
    hits.push({ sentence: s.trim().slice(0, 160), value: m[0], sourced });
  }
  return hits.filter((h) => !h.sourced);
}

/** Troca número sem lastro por [INSERIR DADO] (botão "limpar" da UI). */
export function cleanStats(text: string): string {
  if (!text) return text;
  const SOURCED_RE = /\((?:[^()]*\b(19|20)\d{2}\b[^()]*|[^()]*fonte[^()]*)\)|\[INSERIR DADO\]|\[FONTE/i;
  const NUM_RE = /\d[\d.,]*\s*%|\b\d{3,}(?:[.,]\d+)?\b(?=\s*(?:clientes|reais|r\$|mil|milh|seguidores|pessoas|vendas|leads))/i;
  return String(text)
    .split(/(?<=[.!?\n])\s+/)
    .map((s) => {
      const m = s.match(NUM_RE);
      if (m && !SOURCED_RE.test(s)) {
        return s.replace(m[0], '[INSERIR DADO]');
      }
      return s;
    })
    .join(' ');
}

/** Fala pura: travessões viram vírgula (hífen simples também é vetado no teleprompter). */
export function sanitizeTeleprompter(text: string): string {
  if (!text) return text;
  return String(text).replace(/[—–]/g, ',');
}
