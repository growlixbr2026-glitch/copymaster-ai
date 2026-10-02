// Util central: texto puro pronto para copiar e colar.
// Remove Markdown (*, _, #, listas com - — • >) e fragmentos de divisores
// vazados (|||DIVIDER|||, **Variação N**, NOTA DO ESTRATEGISTA do corpo).
// Preserva hífen interno de palavra (ex: bem-vindo) e pontuação normal.

import { repairDividers } from './outputGuard';

const LEAKED_DIVIDER_RE = /\|{2,}\s*\|?[A-Z_]*DIVIDER\|{2,}\|?/gi;
const LEAKED_BARE_DIVIDER_RE = /^\s*\|{2,}\s*$/gm;
const VARIATION_LABEL_RE = /^\s*\*{0,2}\s*(varia[cç][aã]o|op[cç][aã]o|e-?mail|an[uú]ncio)\s*\d*\s*\*{0,2}\s*:?\s*$/gim;
const STRATEGIST_NOTE_RE = /\*{0,2}\s*NOTA\s+DO\s+(ESTRATEGISTA|ESPECIALISTA)[\s\S]*$/i;

export function stripCopyMarkdown(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw.replace(/\r\n/g, '\n');

  // 1. Corta nota do estrategista vazada no corpo + fragmentos de divisores
  text = text.split(/\|\|\|NOTA?_DIVIDER\|\|\|/i)[0];
  text = text.replace(STRATEGIST_NOTE_RE, '');
  text = text.replace(LEAKED_DIVIDER_RE, '\n');
  text = text.replace(LEAKED_BARE_DIVIDER_RE, '\n');
  text = text.replace(/\|{3,}/g, '');

  // 2. Remove rótulos vazados (**Variação 1**, **E-mail 2**, etc.)
  text = text.replace(VARIATION_LABEL_RE, '\n');

  const lines = text.split('\n').map((line) => {
    let l = line;
    // Remove marcadores de lista só no início da linha (preserva hífen interno)
    l = l.replace(/^\s*(#{1,6}\s+|>{1,3}\s*|[-—–•*+]\s+|\d{1,3}[.)]\s+)/, '');
    // Remove negrito/itálico/strikethrough inline
    l = l.replace(/\*\*(.+?)\*\*/g, '$1');
    l = l.replace(/__(.+?)__/g, '$1');
    l = l.replace(/(^|\W)\*([^*\n]+)\*/g, '$1$2');
    l = l.replace(/(^|\W)_([^_\n]+)_/g, '$1$2');
    l = l.replace(/~~(.+?)~~/g, '$1');
    // Remove sobras de # > ` no início
    l = l.replace(/^\s*[#>]+\s*/, '');
    l = l.replace(/`([^`]*)`/g, '$1');
    return l.replace(/[ \t]+$/g, '');
  });

  text = lines.join('\n');
  // Colapsa 3+ quebras em 2, remove linhas vazias no início/fim
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  // Remove linhas que sobraram só com símbolos
  text = text
    .split('\n')
    .filter((l) => !/^\s*[*_#>\-|]{1,}\s*$/.test(l))
    .join('\n')
    .trim();
  return text;
}

// Divide variantes de forma tolerante a divisores malformados
// (ex: "|||\n||DIVIDER|||" quebrado em linhas pelo modelo).
export function splitCopyVariants(streamedText: string, divider = '|||DIVIDER|||'): string[] {
  if (!streamedText) return [];
  const contentArea = streamedText.split(/\|\|\|NOTA?_DIVIDER\|\|\|/i)[0];
  const normalized = contentArea.replace(/\|{2,}\s*\n?\s*\|{0,2}DIVIDER\|{2,}\|?/gi, divider);
  return normalized
    .split(divider)
    .map((s) => stripCopyMarkdown(s || ''))
    .filter((s) => s.length > 0);
}

// Limpeza para PROMPTS VISUAIS (texto colável em Midjourney/DALL-E/SD/etc).
// Preserva sintaxe dos motores (--ar, ::, resoluções, numbered steps) e
// remove Markdown, placeholders e notas vazadas. O idioma (EN) é garantido
// pelo prompt da sessão, não aqui.
export function stripVisualPrompt(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw.replace(/\r\n/g, '\n');
  // Corta nota do estrategista vazada (tolerante a NOTA/NOTE e Markdown)
  text = text.split(/\|\|\|NOTA?_DIVIDER\|\|\|/i)[0];
  text = text.replace(/\*{0,2}\s*NOTA\s+DO\s+(ESTRATEGISTA|ESPECIALISTA)[\s\S]*$/i, '');
  // Remove fragmentos de divisores e placeholders de estrutura
  text = text.replace(/\|{2,}\s*\|?[A-Z_]*DIVIDER\|{2,}\|?/gi, '\n');
  text = text.replace(/^\s*\|{2,}\s*$/gm, '\n');
  text = text.replace(/\|{3,}/g, '');
  text = text.replace(/^\s*\[[^\]\n]{0,60}\]\s*$/gm, (m) => (/^(conteúdo|conteudo|nota|ficha|slide|opção|opcao|estrutura|concept)/i.test(m) ? '\n' : m));
  const lines = text.split('\n').map((line) => {
    let l = line;
    l = l.replace(/^\s*#{1,6}\s+/, '');
    l = l.replace(/^\s*>\s?/, '');
    l = l.replace(/^\s*[-—–•+]\s+/, '');
    l = l.replace(/\*\*(.+?)\*\*/g, '$1');
    l = l.replace(/__(.+?)__/g, '$1');
    l = l.replace(/`([^`]*)`/g, '$1');
    return l.replace(/[ \t]+$/g, '');
  });
  text = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return text
    .split('\n')
    .filter((l) => !/^\s*[*_#>\-|]{1,}\s*$/.test(l) && !/^\s*-{3,}\s*$/.test(l))
    .join('\n')
    .trim();
}

// Separa opções de forma tolerante: primeiro pelo divisor exato; se resultar
// em 1 bloco só, divide pelos parágrafos (modelos ignoram o divisor com
// frequência e separam opções com linha em branco). Garante N abas úteis.
export function splitOptions(text: string, divider: string, expected = 2): string[] {
  if (!text) return [];
  const clean = stripVisualPrompt(repairDividers(text));
  const byDivider = clean.split(divider).map((s) => stripVisualPrompt(s)).filter((s) => s.length > 0);
  if (byDivider.length >= expected) return byDivider;
  if (byDivider.length <= 1) {
    const blocks = clean.split(/\n\s*\n/).map((s) => stripVisualPrompt(s)).filter((s) => s.length > 0);
    if (blocks.length >= expected) {
      const per = Math.ceil(blocks.length / expected);
      const out: string[] = [];
      for (let i = 0; i < expected; i++) {
        const chunk = blocks.slice(i * per, (i + 1) * per).join('\n\n');
        if (chunk) out.push(chunk);
      }
      if (out.length >= expected) return out;
    }
  }
  return byDivider.length > 0 ? byDivider : (clean ? [clean] : []);
}
export function splitVisualResult(streamedText: string, contentDivider?: string): { content: string; note: string } {
  if (!streamedText) return { content: '', note: '' };
  // Normaliza divisor quebrado em linhas (ex.: "|||\n|NOTA_DIVIDER|") antes do split.
  const normalized = String(streamedText).replace(/\|{2,}\s*\n?\s*\|{0,2}\s*NOTA?_DIVIDER\s*\|{1,3}/gi, '|||NOTA_DIVIDER|||');
  const parts = normalized.split(/\|\|\|NOTA?_DIVIDER\|\|\|/i);
  let content = (parts[0] || '').trim();
  // Guarda final: envelope JSON cru de provider (ex.: reasoning sem content) nunca renderiza.
  if (/^\s*\{"id"\s*:\s*"chatcmpl/i.test(content)) content = '';
  const note = (parts[1] || '').replace(/NOTA DO ESTRATEGISTA:[\s]*/i, '').trim();
  if (contentDivider) {
    const first = content.split(contentDivider)[0].trim();
    if (first) content = first;
  }
  return { content: stripVisualPrompt(content), note };
}

// Remove fragmentos de divisores vazados (|||X_DIVIDER|||, linhas só-pipes)
// sem tocar em Markdown — para sessões cujo entregável aceita formatação
// (ex.: NotebookLM entrega fonte estruturada, não texto puro copia-cola).
export function stripLeakedDividers(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .replace(LEAKED_DIVIDER_RE, '\n')
    .replace(LEAKED_BARE_DIVIDER_RE, '\n')
    .replace(/\|{3,}/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Separa entreg_vel x Nota usando o ULTIMO |||NOTA_DIVIDER|||.
 *  Multi-secoes ficam TODAS no entregavel (divisores remanescentes de NOTA viram
 *  linha em branco; EMAIL/LAUNCH viram regua visivel). Usado por BridgeStudio e
 *  pelos estudios Marketing Avan_ado - nunca descarta secoes do meio. */
export function splitNotaBlock(streamedText: string): { content: string; note: string } {
  if (!streamedText || typeof streamedText !== 'string') return { content: '', note: '' };
  const marker = '|||NOTA_DIVIDER|||';
  const idx = streamedText.lastIndexOf(marker);
  const rawContent = idx >= 0 ? streamedText.slice(0, idx) : streamedText;
  let content = rawContent
    .replace(/[ \t]*\|\|\|NOTA_DIVIDER\|\|\|[ \t]*/g, '\n\n')
    .replace(/[ \t]*\|\|\|(?:EMAIL|LAUNCH)_DIVIDER\|\|\|[ \t]*/g, '\n\n────────\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // Guarda anti-JSON: envelope cru de provider nunca vira entregavel.
  if (/^\s*\{"id"\s*:\s*"chatcmpl/i.test(content)) content = '';
  const note = idx >= 0
    ? streamedText.slice(idx + marker.length)
        // Tolera rótulo com Markdown (**NOTA...** / NOTA...:) e ESTRATEGISTA/ESPECIALISTA, sem resíduo ****.
        .replace(/[*_]{0,2}\s*NOTA DO (?:ESTRATEGISTA|ESPECIALISTA):?\s*[*_]{0,2}/ig, '')
        .trim()
    : '';
  return { content, note };
}
