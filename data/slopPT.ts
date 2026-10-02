// Léxico PT-BR de "slop" de IA — o que a IA escreve e humano não escreve.
//
// Formato de find/replace/family adaptado (MIT) de
// github.com/Jakeschincariol/linkedin-agent-skill (slop.json) — as entradas
// em si foram escritas/curadas para PT-BR por conta própria.
//
// Consumidores:
//  - textForensics.quickLocalScan  → DETECTA (qualquer entrada, safe ou não)
//  - textForensics.autoCleanText   → SUBSTITUI (só safe: true — troca mecânica
//    que preserva gênero/número/frase; o resto só sinaliza, nunca arruma)
//
// Regra de safe: true — a substituição precisa ser invariante em gênero/número
// OU ter variantes explícitas no léxico. Sem exceção.

export interface SlopEntry {
  /** sempre minúsculo; a detecção compara case-insensitive */
  find: string;
  /** substituição literal (vazio = só sinalizar) */
  replace: string;
  /** true = autoCleanText pode trocar; false = só detecção */
  safe: boolean;
}

export interface SlopStructure {
  id: string;
  /** família do sinal (reusa famílias da taxonomia quando existe) */
  family: string;
  label: string;
  regex: RegExp;
  fix: string;
}

// ---------------------------------------------------------------------------
// 1) Termos e expressões (detecção + substituição)
// ---------------------------------------------------------------------------
export const SLOP_ENTRIES: SlopEntry[] = [
  // — abridores / conectivos inchados (safe: viram transição curta) —
  { find: 'vale ressaltar que', replace: 'note que', safe: true },
  { find: 'vale destacar que', replace: 'note que', safe: true },
  { find: 'cabe destacar que', replace: 'note que', safe: true },
  { find: 'é importante ressaltar que', replace: 'note que', safe: true },
  { find: 'é importante destacar que', replace: 'note que', safe: true },
  { find: 'é importante notar que', replace: 'note que', safe: true },
  { find: 'vale a pena mencionar que', replace: 'note que', safe: true },
  { find: 'em resumo', replace: 'resumindo', safe: true },
  { find: 'em suma', replace: 'resumindo', safe: true },
  { find: 'diante do exposto', replace: 'então', safe: true },
  { find: 'para concluir', replace: 'por fim', safe: true },
  { find: 'em conclusão', replace: 'por fim', safe: true },
  { find: 'de modo geral', replace: 'no geral', safe: true },
  { find: 'de forma geral', replace: 'no geral', safe: true },
  { find: 'em termos gerais', replace: 'no geral', safe: true },

  // — tempo / brevidade (safe: advérbio invariante) —
  { find: 'no mundo de hoje', replace: 'hoje', safe: true },
  { find: 'nos dias de hoje', replace: 'hoje', safe: true },
  { find: 'em tempos atuais', replace: 'hoje', safe: true },
  { find: 'na era digital', replace: 'hoje', safe: true },
  { find: 'no cenário atual', replace: 'hoje', safe: true },

  // — propósito (safe: preposição/advérbio) —
  { find: 'a fim de', replace: 'para', safe: true },
  { find: 'com o objetivo de', replace: 'para', safe: true },
  { find: 'no intuito de', replace: 'para', safe: true },
  { find: 'com o propósito de', replace: 'para', safe: true },
  { find: 'a partir do momento em que', replace: 'quando', safe: true },
  { find: 'por meio do uso de', replace: 'com', safe: true },
  { find: 'no que diz respeito a', replace: 'sobre', safe: true },

  // — certeza absoluta / hedge (safe: advérbio) —
  { find: 'não há dúvida de que', replace: 'certamente', safe: true },
  { find: 'sem sombra de dúvida', replace: 'certamente', safe: true },
  { find: 'com certeza absoluta', replace: 'com certeza', safe: true },
  { find: 'sem dúvida alguma', replace: 'sem dúvida', safe: true },
  { find: 'é inegável que', replace: 'claro que', safe: true },

  // — adjetivos inflados (safe: invariante OU com variantes de gênero/número) —
  { find: 'incrível', replace: 'marcante', safe: true },
  { find: 'incríveis', replace: 'marcantes', safe: true },
  { find: 'revolucionário', replace: 'novo', safe: true },
  { find: 'revolucionária', replace: 'nova', safe: true },
  { find: 'revolucionários', replace: 'novos', safe: true },
  { find: 'revolucionárias', replace: 'novas', safe: true },
  { find: 'robusto', replace: 'sólido', safe: true },
  { find: 'robusta', replace: 'sólida', safe: true },
  { find: 'holístico', replace: 'completo', safe: true },
  { find: 'holística', replace: 'completa', safe: true },
  { find: 'extraordinário', replace: 'ótimo', safe: true },
  { find: 'extraordinária', replace: 'ótima', safe: true },
  { find: 'deslumbrante', replace: 'notável', safe: true },

  // — verbos-muleta (safe: infinitivo) —
  { find: 'potencializar', replace: 'aumentar', safe: true },
  { find: 'maximizar', replace: 'aumentar', safe: true },
  { find: 'turbinar', replace: 'aumentar', safe: true },

  // — jargão (safe: invariante ou com variantes) —
  { find: 'sinergia', replace: 'colaboração', safe: true },
  { find: 'ecossistema', replace: 'conjunto', safe: true },
  { find: 'jornada do cliente', replace: 'processo de compra', safe: true },
  { find: 'disrupção', replace: 'mudança', safe: true },
  { find: 'best practice', replace: 'boa prática', safe: true },
  { find: 'best practices', replace: 'boas práticas', safe: true },
  { find: 'vamos ser honestos:', replace: 'olha:', safe: true },

  // — SÓ DETECÇÃO (safe: false): a troca mecânica quebraria gênero/sentido —
  { find: 'em um mundo cada vez mais', replace: '', safe: false },
  { find: 'alavancar', replace: '', safe: false },
  { find: 'desbloquear', replace: '', safe: false },
  { find: 'mergulhar fundo', replace: '', safe: false },
  { find: 'imbatível', replace: '', safe: false },
  { find: 'de ponta a ponta', replace: '', safe: false },
  { find: 'game changer', replace: '', safe: false },
  { find: 'tapeçaria', replace: '', safe: false },
  { find: 'a verdade é que', replace: '', safe: false },
  { find: 'levar para o próximo nível', replace: '', safe: false },
];

// ---------------------------------------------------------------------------
// 2) Estruturas regex — pegam variações que o literal não alcança.
//    Nunca substituem: estrutura exige juízo, só sinaliza.
// ---------------------------------------------------------------------------
export const SLOP_STRUCTURES: SlopStructure[] = [
  {
    id: 'trio_generico',
    family: 'trio_complementares',
    label: 'Trios complementares para dar corpo',
    regex: /[\p{L}]{3,},\s*[\p{L}]{3,}\s+e\s+[\p{L}]{3,}/gu,
    fix: 'Fique com UM adjetivo forte ou troque o trio por um exemplo concreto.',
  },
  {
    id: 'dualidade_nao_e',
    family: 'dualidade',
    label: 'Dualidade artificial (não é X, é Y)',
    // NB: \b em JS é ASCII-only (\w não vê acento) — usar lookarounds \p{L},
    // senão "não é só ... é" nunca casa.
    regex: /(?<![\p{L}])não é (?:só|apenas|somente|meramente)(?![\p{L}])[^.!?\n]{0,80}?(?<![\p{L}])é(?![\p{L}])/giu,
    fix: 'Afirme direto a tese sem o contraste fabricado de negação seguida de exaltação.',
  },
  {
    id: 'hashtag_wall',
    family: 'mobilizacao_forcada',
    label: 'Mobilização forçada (hashtags/bait)',
    regex: /(?:#[\p{L}\p{N}_]+\s*){5,}/gu,
    fix: 'De 2-3 hashtags relevantes; corte o mural e troque pergunta-bait por afirmação com posição.',
  },
  {
    id: 'engagement_bait',
    family: 'mobilizacao_forcada',
    label: 'Mobilização forçada (hashtags/bait)',
    regex: /\b(?:concorda\?|concordam\?|e você,? o que acha|comenta a[ií]|compartilhe se você concorda)/giu,
    fix: 'De 2-3 hashtags relevantes; corte o mural e troque pergunta-bait por afirmação com posição.',
  },
  {
    id: 'auto_revelacao_ia',
    family: 'auto_revelacao_ia',
    label: 'Auto-revelação de IA',
    regex: /\b(?:como uma ia|como um modelo de linguagem|como modelo de linguagem|sou uma ia|gerado por ia|escrito por ia)\b/giu,
    fix: 'Remova qualquer menção a IA/modelo — o texto é para assinar humano.',
  },
  {
    id: 'pergunta_retorica',
    family: 'pergunta_retorica',
    label: 'Pergunta retórica isolada',
    regex: /(?:^|\n)\s*(?:fácil|simples|óbvio|lógico|sério|básico)\?/giu,
    fix: 'Troque a pergunta retórica de uma palavra por afirmação direta com detalhe concreto.',
  },
  {
    id: 'parede_emoji',
    family: 'parede_emoji',
    label: 'Parede de emojis decorativos',
    regex: /(?:[\u{1F680}\u{1F525}\u{1F4A1}\u2728\u{1F3AF}\u{1F447}]\s*){3,}/gu,
    fix: 'De no máximo 1 emoji estratégico; remova a sequência decorativa.',
  },
];

// ---------------------------------------------------------------------------
// 3) Caracteres invisíveis — deletar SEMPRE (zero-width/BOM/marcas direcionais)
//    NBSP fino não entra aqui: é tipografia legítima em PT (Word, "R$ 100").
// ---------------------------------------------------------------------------
export const INVISIBLE_DELETE =
  /[\u200B\u200C\u200D\u2060\uFEFF\u00AD\u180E\u061C\u200E\u200F\u2066-\u2069\u{E0000}-\u{E007F}]/gu;

// Espaços invisíveis largos → espaço normal (normalização silenciosa, sem sinal)
export const SPACE_NORMALIZE = /[\u00A0\u202F\u2007\u2009\u3000]/g;
