import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { personaBlock } from '../copy/crewaiPersona';

export interface BridgePromptOptions {
  mode: string;
  hierarchy: string[];
  directives: string[];
  structure: string;
  divider: string;
  persona?: string;
  maxTokens?: number;
  systemRole?: string;
}

/**
 * Helper compartilhado para as novas sessões Growth / RevOps / B2B Sales.
 * Monta o prompt final e delega SEMPRE a callAI() — nunca fetch direto.
 */
export const runBridgeService = async (
  opts: BridgePromptOptions,
  onChunk?: (text: string) => void
) => {
  const personaSection = personaBlock(opts.persona);

  const prompt = `
✨ **MODO OPERAÇÃO: ${opts.mode}** ✨
${personaSection}

✨ **HIERARQUIA DE VERDADE:**
${opts.hierarchy.map(h => `- ${h}`).join('\n')}

✨ **DIRETRIZ DE QUALIDADE:**
${opts.directives.map(d => `- ${d}`).join('\n')}

✨ **FORMATO DE RESPOSTA MANDATÓRIO:**
Texto puro copia-cola, sem Markdown. Divisores em linha própria, nunca quebrados.
Não misture nota no entregável — a nota vai DEPOIS do último divisor.

Estrutura:
${opts.structure}
`;

  const systemInstruction = `ATUE COMO: ${opts.systemRole || 'Especialista sênior em marketing, crescimento e vendas B2B com 15+ anos de experiência.'} Siga a Constituição da IA rigorosamente.\n${GOLDEN_SYSTEM_INSTRUCTIONS}`;

  return callAI(prompt, systemInstruction, 'gemini-3-pro-preview', onChunk, { maxTokens: opts.maxTokens || 8192 });
};
