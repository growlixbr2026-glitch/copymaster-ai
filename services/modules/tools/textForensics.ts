// Forense de texto LOCAL — 0 rede, 0 quota. Tudo aqui é puro e determinístico,
// por isso testável direto no Node (e2e/humanizer-local.spec.ts importa este
// módulo sem browser e sem LLM).
//
// Adaptação PT-BR do painel de checagens de
// github.com/Jakeschincariol/linkedin-agent-skill (MIT) — mantida só a parte
// determinística (varredura, ritmo, limpeza); a calibração de score é nossa.
//
// Hierarquia de consumo:
//  - checkAIProbabilityService → evidência medida no prompt do perito + FALLBACK
//    honesto quando o LLM está fora (nunca deixa o usuário cego — §8).
//  - humanizeTextService → prioridade cirúrgica (maior count = PRIORIDADE #1)
//  - RefinementToolbar → autoCleanText como passo 0 do Humanizar.
import {
  SLOP_ENTRIES,
  SLOP_STRUCTURES,
  INVISIBLE_DELETE,
  SPACE_NORMALIZE,
} from '../../../data/slopPT';

export interface AISignalHit {
  family: string;
  label: string;
  evidence: string[];
  count: number;
  fix: string;
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
  // Novas famílias inspiradas no Prompt-Engineering-Guide e brexhq/prompt-engineering
  {
    family: 'hedging_academico',
    label: 'Hedging acadêmico excessivo',
    patterns: ['é importante notar', 'vale mencionating', 'cabe ressaltating', 'é relevante mencionating', 'convém salientating'],
    fix: 'Cite o hedging e vá direto ao ponto — o leitor quer informação, não ressalvas.',
  },
  {
    family: 'passiva_construção',
    label: 'Construção passiva evasiva',
    patterns: ['é possível observar', 'pode ser verificado', 'foi constatado que', 'nota-se que', 'percebe-se que'],
    fix: 'Use voz ativa: quem faz o quê. A passiva esconde o agente e enfraquece o texto.',
  },
  {
    family: 'frase_nominal',
    label: 'Frase nominal sem verbo de ação',
    patterns: ['uma análise detalhada', 'uma avaliação completa', 'um estudo aprofundado', 'uma investigação minuciosa'],
    fix: 'Substitua a frase nominal por um verbo de ação: "analisamos", "avaliamos", "estudamos".',
  },
  {
    family: 'conclusão_formulaica',
    label: 'Conclusão fórmulaica previsível',
    patterns: ['diante do exposto', 'diante do apresentado', 'diante do exposto', 'em face do exposto', 'diante de todo o exposto'],
    fix: 'Corte a fórmula e feche com uma ação concreta ou pergunta — nunca com resumo do que já foi dito.',
  },
  {
    family: 'introdução_formulaica',
    label: 'Introdução fórmulaica previsível',
    patterns: ['no mundo atual', 'na era digital', 'no cenário contemporâneo', 'no contexto atual', 'na sociedade moderna'],
    fix: 'Comece com um dado, pergunta ou afirmação forte — nunca com lugar-comum temporal.',
  },
  {
    family: 'exemplo_genérico',
    label: 'Exemplo genérico sem concretude',
    patterns: ['por exemplo', 'como por exemplo', 'a título de exemplo', 'para ilustrar', 'como ilustração'],
    fix: 'Substitua o exemplo genérico por um caso real, nome, número ou situação específica.',
  },
  {
    family: 'transicao_formulaica',
    label: 'Transição fórmulaica previsível',
    patterns: ['por outro lado', 'por sua vez', 'nesse sentido', 'nesse contexto', 'a seguir', 'como mencionado'],
    fix: 'Varie o ritmo: frase curta de impacto seguida de frase longa explicativa.',
  },
];

const SLOP_LEXICO_FIX =
  'Troque os termos prontos do léxico por linguagem específica do nicho — as substituições do léxico (note que/hoje/para/...) são o ponto de partida.';

// Cobertura da taxonomia: entradas do léxico já alcançadas por um pattern
// literal NÃO são varridas de novo (evita contagem e evidência duplicadas).
const TAXONOMY_PATTERNS = AI_TELLTALE_SIGNS.flatMap((s) => s.patterns.map((p) => p.toLowerCase()));
const coveredByTaxonomy = (find: string): boolean => {
  const f = find.toLowerCase();
  return TAXONOMY_PATTERNS.some((p) => p.includes(f) || f.includes(p));
};

// Acumulador interno: `seen` guarda os índices já contados por família — se o
// literal e a estrutura regex apanham a MESMA ocorrência (ex.: "rápido, fácil e"
// literal + trio genérico), conta uma vez só.
interface ScanAcc extends AISignalHit {
  seen: Set<number>;
}

// Varredura local determinística: taxonomia literal + léxico + estruturas
// regex + caracteres invisíveis. Serve de suspeita instantânea e de guia
// cirúrgico para o Humanizar.
export function quickLocalScan(text: string, maxEvidence = 3): AISignalHit[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const acc = new Map<string, ScanAcc>();

  const excerptAt = (idx: number, len: number): string => {
    const start = Math.max(0, text.lastIndexOf('.', idx - 1) + 1);
    let end = text.indexOf('.', idx + len);
    end = end < 0 ? Math.min(text.length, idx + 120) : Math.min(text.length, end + 1);
    return text.slice(start, end).trim().slice(0, 140);
  };

  const push = (family: string, label: string, fix: string, idx: number, matchLen: number, overrideEvidence?: string) => {
    let h = acc.get(family);
    if (!h) {
      h = { family, label, evidence: [], count: 0, fix, seen: new Set<number>() };
      acc.set(family, h);
    }
    if (h.seen.has(idx)) return; // mesma ocorrência já contada por outra fonte
    h.seen.add(idx);
    h.count += 1;
    const ev = (overrideEvidence || excerptAt(idx, matchLen)).trim();
    if (ev && h.evidence.length < maxEvidence && !h.evidence.includes(ev)) h.evidence.push(ev);
  };

  // 1) taxonomia literal (8 famílias) — conta TODAS as ocorrências
  for (const s of AI_TELLTALE_SIGNS) {
    for (const p of s.patterns) {
      const needle = p.toLowerCase();
      let from = 0;
      for (;;) {
        const idx = lower.indexOf(needle, from);
        if (idx < 0) break;
        push(s.family, s.label, s.fix, idx, needle.length);
        from = idx + needle.length;
      }
    }
  }

  // 2) léxico PT-BR (pula o que a taxonomia já cobre)
  for (const e of SLOP_ENTRIES) {
    if (coveredByTaxonomy(e.find)) continue;
    const needle = e.find.toLowerCase();
    let from = 0;
    for (;;) {
      const idx = lower.indexOf(needle, from);
      if (idx < 0) break;
      push('slop_lexico', 'Léxico de termos prontos da IA', SLOP_LEXICO_FIX, idx, needle.length);
      from = idx + needle.length;
    }
  }

  // 3) estruturas regex — pegam variações que o literal não pega
  for (const st of SLOP_STRUCTURES) {
    const re = new RegExp(st.regex.source, st.regex.flags.includes('g') ? st.regex.flags : `${st.regex.flags}g`);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      push(st.family, st.label, st.fix, m.index, m[0].length);
      if (m[0].length === 0) re.lastIndex += 1;
    }
  }

  // 4) caracteres invisíveis (zero-width/BOM) — texto colado de IA/PDF
  const inv = [...text.matchAll(INVISIBLE_DELETE)];
  if (inv.length > 0) {
    const byCode = new Map<string, number>();
    for (const m of inv) {
      const cp = `U+${(m[0].codePointAt(0) || 0).toString(16).toUpperCase().padStart(4, '0')}`;
      byCode.set(cp, (byCode.get(cp) || 0) + 1);
    }
    const summary = [...byCode.entries()].map(([cp, n]) => `${cp} ×${n}`).join(', ');
    push(
      'caracteres_invisiveis',
      'Caracteres invisíveis (zero-width/BOM)',
      'Remova os caracteres invisíveis (a limpeza do Humanizar faz isso) e revise o trecho.',
      inv[0].index,
      1,
      summary,
    );
    // o push contou 1; o total real é inv.length
    const h = acc.get('caracteres_invisiveis')!;
    h.count = inv.length;
  }

  const out: AISignalHit[] = [];
  for (const h of acc.values()) {
    if (h.evidence.length === 0) continue;
    out.push({ family: h.family, label: h.label, evidence: h.evidence, count: h.count, fix: h.fix });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Ritmo (burstiness): CV dos comprimentos de frase. CV baixo = frases
// uniformes = típico de IA. Abaixo de 4 frases não dá para medir.
// ---------------------------------------------------------------------------
export function burstinessOf(text: string): { cv: number; frases: number } | null {
  const segs = text
    .split(/[.!?…\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length >= 2);
  if (segs.length < 4) return null;
  const lens = segs.map((s) => s.split(/\s+/).filter(Boolean).length);
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  if (mean <= 0) return null;
  const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
  return { cv: Math.sqrt(variance) / mean, frases: segs.length };
}

// ---------------------------------------------------------------------------
// Estimativa local 0-100 de probabilidade de IA (quanto MAIOR, mais máquina).
// Usada só como FALLBACK quando o perito LLM está fora — sempre com caveat.
// Calibração PT-BR própria (a do painel original é EN, não serve direto).
// ---------------------------------------------------------------------------
export interface LocalEstimate {
  score: number;
  cv: number;
  frases: number;
  density: number; // sinais por 100 palavras
}

export function localEstimate(text: string): LocalEstimate {
  const words = text.split(/\s+/).filter(Boolean).length || 1;
  const hits = quickLocalScan(text);
  const total = hits.reduce((a, h) => a + h.count, 0);
  const density = (total / words) * 100;
  const burst = burstinessOf(text);
  // uniformidade 1 = frases idênticas (máquina); 0 = ritmo variado (humano);
  // sem frases suficientes → neutro (0.5).
  const uniformity = burst ? Math.max(0, Math.min(1, 1 - burst.cv / 0.55)) : 0.5;
  const score = Math.round(Math.max(3, Math.min(96, 12 + Math.min(density * 6.5, 48) + uniformity * 32)));
  return { score, cv: burst ? burst.cv : 0, frases: burst ? burst.frases : 0, density };
}

// ---------------------------------------------------------------------------
// Limpeza determinística (0 LLM):
//  - stripInvisibleChars: apaga zero-width/BOM + normaliza espaços largos.
//    SEMPRE seguro — nenhum conteúdo legítimo morre aqui.
//  - applySafeLexicon: só entradas safe:true (troca mecânica que preserva
//    gênero/número). Estruturas (trio/dualidade) NUNCA são substituídas.
//  - autoCleanText: os dois, com contadores para o aviso da toolbar.
// ---------------------------------------------------------------------------
export function stripInvisibleChars(text: string): { text: string; count: number } {
  if (!text) return { text: text || '', count: 0 };
  const zw = [...text.matchAll(INVISIBLE_DELETE)].length;
  const sp = [...text.matchAll(SPACE_NORMALIZE)].length;
  return { text: text.replace(INVISIBLE_DELETE, '').replace(SPACE_NORMALIZE, ' '), count: zw + sp };
}

export function applySafeLexicon(text: string): { text: string; count: number } {
  if (!text) return { text: text || '', count: 0 };
  let out = text;
  let count = 0;
  for (const e of SLOP_ENTRIES) {
    if (!e.safe || !e.replace) continue;
    const escaped = e.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^\\p{L}])${escaped}(?![\\p{L}])`, 'giu');
    out = out.replace(re, (match, pre: string) => {
      count += 1;
      const matchedPart = match.slice(pre.length);
      let rep = e.replace;
      // preserva caixa: "Vale ressaltar" → "Note que", "vale" → "note"
      if (/^\p{Lu}/u.test(matchedPart)) rep = rep.charAt(0).toUpperCase() + rep.slice(1);
      return pre + rep;
    });
  }
  return { text: out, count };
}

export interface AutoCleanResult {
  text: string;
  removedChars: number;
  replacedTerms: number;
}

export function autoCleanText(text: string): AutoCleanResult {
  const inv = stripInvisibleChars(text || '');
  const lex = applySafeLexicon(inv.text);
  return { text: lex.text, removedChars: inv.count, replacedTerms: lex.count };
}

// ---------------------------------------------------------------------------
// Métricas de qualidade de prosa (Phase 2 - hedgehog-core inspiration)
// ---------------------------------------------------------------------------

// Verbos fracos e fortes para análise de força verbal
const WEAK_VERBS = new Set([
  'ser', 'estar', 'ter', 'fazer', 'ir', 'dar', 'ver', 'saber', 'querer', 'poder',
  'dizer', 'conseguir', 'dever', 'trazer', 'pedir', 'receber', 'pensar', 'sentir',
  'usar', 'deixar', 'achar', 'falar', 'crer', 'entender', 'vir', 'chegar',
  'is', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did',
  'get', 'got', 'make', 'made', 'see', 'saw', 'know', 'knew', 'think', 'thought',
]);

const STRONG_VERBS = new Set([
  'destruir', 'criar', 'transformar', 'revolucionar', 'explorar', 'descobrir',
  'conquistar', 'dominar', 'eliminar', 'maximizar', 'otimizar', 'acelerar',
  'construir', 'forjar', 'despertar', 'acender', 'galvanizar',
  'destroy', 'create', 'transform', 'revolutionize', 'explore', 'discover',
  'conquer', 'dominate', 'eliminate', 'maximize', 'optimize', 'accelerate',
  'forge', 'awaken', 'ignite', 'galvanize', 'unleash', 'propel',
]);

// Palavras concretas vs abstratas
const ABSTRACT_INDICATORS = new Set([
  'coisa', 'algo', 'tudo', 'nada', 'alguma coisa', 'qualquer coisa', 'esta coisa',
  'thing', 'something', 'anything', 'everything', 'nothing', 'stuff', 'it',
  'ser', 'estar', 'existência', 'realidade', 'verdade', 'importância', 'valor',
  'existence', 'reality', 'truth', 'importance', 'value',
]);

const CONCRETE_INDICATORS = new Set([
  'casa', 'carro', 'dinheiro', 'tempo', 'pessoa', 'lugar', 'cidade', 'país',
  'house', 'car', 'money', 'time', 'person', 'place', 'city', 'country',
  'mãos', 'olhos', 'sorriso', 'abraço', 'beijo', 'lágrima', 'sangue', 'fogo',
  'hands', 'eyes', 'smile', 'hug', 'kiss', 'tear', 'blood', 'fire',
]);

// Palavras sensoriais
const SENSORY_WORDS = new Set([
  'cheiro', 'sabor', 'toque', 'som', 'visão', 'odor', 'aroma', 'textura',
  'fragrância', 'essência', 'gosto', 'audição', 'tato', 'paladar', 'olfato',
  'smell', 'taste', 'touch', 'sound', 'sight', 'odor', 'aroma', 'texture',
  'fragrance', 'essence', 'flavor', 'hearing', 'feel',
]);

export interface ProseQualityMetrics {
  sentenceVariety: number;      // 0-100: variedade de comprimentos de frase
  verbStrength: number;         // 0-100: proporção de verbos fortes
  concreteness: number;         // 0-100: proporção de palavras concretas
  sensoryDensity: number;       // 0-100: densidade de palavras sensoriais
  avgSentenceLength: number;    // média de palavras por frase
  weakVerbCount: number;        // contagem de verbos fracos
  strongVerbCount: number;      // contagem de verbos fortes
  abstractWordCount: number;    // contagem de palavras abstratas
  concreteWordCount: number;    // contagem de palavras concretas
  sensoryWordCount: number;     // contagem de palavras sensoriais
  totalWords: number;           // total de palavras
}

export function analyzeProseQuality(text: string): ProseQualityMetrics {
  if (!text) {
    return {
      sentenceVariety: 0,
      verbStrength: 0,
      concreteness: 0,
      sensoryDensity: 0,
      avgSentenceLength: 0,
      weakVerbCount: 0,
      strongVerbCount: 0,
      abstractWordCount: 0,
      concreteWordCount: 0,
      sensoryWordCount: 0,
      totalWords: 0,
    };
  }

  const words = text.split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  const sentences = text
    .split(/[.!?…\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).filter(Boolean).length >= 2);

  // 1. Variedade de comprimento de frases
  let sentenceVariety = 0;
  if (sentences.length >= 4) {
    const lens = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const variance = lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length;
    sentenceVariety = Math.round(Math.min(100, (Math.sqrt(variance) / mean) * 200));
  }

  // 2. Força verbal
  let weakVerbCount = 0;
  let strongVerbCount = 0;
  const allWords = text.toLowerCase().split(/[^a-záàâãéèêíïóôõöúçñ\s]+/iu).filter(Boolean);
  for (const word of allWords) {
    const clean = word.replace(/[^a-záàâãéèêíïóôõöúçñ]/giu, '');
    if (WEAK_VERBS.has(clean)) weakVerbCount++;
    if (STRONG_VERBS.has(clean)) strongVerbCount++;
  }
  const verbStrength = totalWords > 0 
    ? Math.round(Math.min(100, ((strongVerbCount + 1) / (weakVerbCount + strongVerbCount + 1)) * 100))
    : 0;

  // 3. Concretude vs abstração
  let abstractWordCount = 0;
  let concreteWordCount = 0;
  for (const word of allWords) {
    const clean = word.replace(/[^a-záàâãéèêíïóôõöúçñ]/giu, '');
    if (ABSTRACT_INDICATORS.has(clean)) abstractWordCount++;
    if (CONCRETE_INDICATORS.has(clean)) concreteWordCount++;
  }
  const concreteness = totalWords > 0
    ? Math.round(Math.min(100, ((concreteWordCount + 1) / (abstractWordCount + concreteWordCount + 1)) * 100))
    : 50;

  // 4. Densidade sensorial
  let sensoryWordCount = 0;
  for (const word of allWords) {
    const clean = word.replace(/[^a-záàâãéèêíïóôõöúçñ]/giu, '');
    if (SENSORY_WORDS.has(clean)) sensoryWordCount++;
  }
  const sensoryDensity = totalWords > 0 ? Math.round(Math.min(100, (sensoryWordCount / totalWords) * 1000)) : 0;

  const avgSentenceLength = sentences.length > 0
    ? Math.round(sentences.reduce((a, s) => a + s.split(/\s+/).filter(Boolean).length, 0) / sentences.length)
    : 0;

  return {
    sentenceVariety,
    verbStrength,
    concreteness,
    sensoryDensity,
    avgSentenceLength,
    weakVerbCount,
    strongVerbCount,
    abstractWordCount,
    concreteWordCount,
    sensoryWordCount,
    totalWords,
  };
}

