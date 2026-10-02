import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { toFriendlyError } from '../../friendlyErrors';
import { AI_TELLTALE_SIGNS, quickLocalScan, localEstimate, burstinessOf, type AISignalHit } from './textForensics';
export type { AISignalHit };

// Gate: Humanizar só exibe resultado quando a probabilidade de IA for >= 70%.
export const HUMANIZE_THRESHOLD = 70;

export interface AICheckResult {
  score: number;
  band: 'humano' | 'misto' | 'provavel_ia';
  signals: AISignalHit[];
  reason: string;
  caveat: string;
  truncated: boolean;
  error?: string;
  /** 'llm' = perito consultado; 'local' = FALLBACK determinístico (sem LLM) */
  mode?: 'llm' | 'local';
}

const bandOf = (score: number): AICheckResult['band'] =>
  score >= HUMANIZE_THRESHOLD ? 'provavel_ia' : score >= 40 ? 'misto' : 'humano';

// Catálogo entregue ao perito: 8 famílias literais + famílias novas do
// painel local (léxico/regex/invisíveis) — ele precisa saber o que medimos.
const SIGNALS_CATALOG =
  AI_TELLTALE_SIGNS.map((s) => `- ${s.family} (${s.label}): expressões típicas: ${s.patterns.slice(0, 5).join('; ')}.`).join('\n')
  + '\n'
  + [
    '- slop_lexico (Léxico de termos prontos da IA): termos como "no mundo de hoje", "potencializar", "robusto", "sinergia", "incrível" fora de contexto.',
    '- caracteres_invisiveis (Caracteres invisíveis): zero-width/BOM — típico de texto colado de IA ou PDF.',
    '- mobilizacao_forcada (Mobilização forçada): mural de 5+ hashtags ou bait ("concorda?", "comenta aí").',
    '- auto_revelacao_ia (Auto-revelação de IA): "como uma IA", "modelo de linguagem", "gerado por IA".',
    '- pergunta_retorica (Pergunta retórica isolada): linha só com "Fácil?", "Simples?", "Óbvio?".',
    '- parede_emoji (Parede de emojis): 3+ emojis decorativos em sequência.',
  ].join('\n');

// FALLBACK honesto (§8): o perito LLM caiu — o usuário NÃO fica cego.
// Devolve a estimativa local determinística com caveat explícito; mode 'local'
// faz a toolbar avisar que é heurística, não veredito. Nunca erro silencioso.
const localFallback = (slice: string, local: AISignalHit[], error: string, truncated: boolean): AICheckResult => {
  const est = localEstimate(slice);
  return {
    score: est.score,
    band: bandOf(est.score),
    signals: local,
    reason: `Estimativa local sem LLM: ${est.density.toFixed(1)} sinais/100 palavras${est.frases ? `, ritmo CV ${est.cv.toFixed(2)} em ${est.frases} frases` : ' (texto curto demais para medir ritmo)'}.`,
    caveat: `Perito LLM indisponível (${toFriendlyError(error)}). Heurística local determinística — use como estimativa, não como veredito.`,
    truncated,
    mode: 'local',
  };
};

export const checkAIProbabilityService = async (text: string, language: string): Promise<AICheckResult> => {
  const truncated = text.length > 1500;
  const slice = text.substring(0, 1500);
  const local = quickLocalScan(slice);
  const burst = burstinessOf(slice);
  const ritmo = burst
    ? `CV ${burst.cv.toFixed(2)} em ${burst.frases} frases — ${burst.cv < 0.3 ? 'uniforme, típico de IA' : 'variado, típico humano'}`
    : 'texto curto demais para medir ritmo';
  // Evidência MEDIDA (não pedida): contagens, trechos e ritmo saem da varredura
  // determinística — o perito julga sobre números, não sobre impressões.
  const localHint = local.length > 0
    ? `EVIDÊNCIA LOCAL MEDIDA (varredura determinística — confirme ou refute cada uma):\n${local.map((h) => `- ${h.family}: ${h.count}x — "${(h.evidence[0] || '').slice(0, 110)}"`).join('\n')}\nRITMO: ${ritmo}`
    : `Varredura local não achou expressões da taxonomia. RITMO: ${ritmo} — avalie ritmo, perplexidade e voz mesmo assim.`;

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
  if (response.error) return localFallback(slice, local, response.error, truncated);
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
      return { score, band: bandOf(score), signals, reason: String(parsed.reason || ''), caveat: String(parsed.caveat || ''), truncated, mode: 'llm' };
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
  return localFallback(slice, local, 'Analysis failed', truncated);
};

export const humanizeTextService = async (text: string, language: string, signals?: AISignalHit[]) => {
  // Prioridade cirúrgica: o sinal com MAIOR count primeiro (o que mais polui
  // vira PRIORIDADE #1; os demais na fila) — fecha o loop medir→operar→medir.
  const found = (signals && signals.length > 0 ? signals : quickLocalScan(text))
    .slice()
    .sort((a, b) => b.count - a.count);
  const top = found[0];
  const surgery = found.length > 0
    ? `CIRURGIA GUIADA — ataque nesta ordem (do maior para o menor):\nPRIORIDADE #1 — ${top.family} (${top.label}, ${top.count}x): ${top.fix} Evidência: "${(top.evidence[0] || '').slice(0, 120)}"${found.slice(1).map((h) => `\n- ${h.family} (${h.label}, ${h.count}x): ${h.fix} Evidência: "${(h.evidence[0] || '').slice(0, 120)}"`).join('')}`
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
