// Fachada: geração CrewAI para sessões de copy com pipeline sequencial real.
// Usa executeCrewWorkflow (services/modules/copy/crewaiExecutor.ts) — cada etapa
// é uma chamada callAI com agente especialista (prompts.chat / crewAI pattern).
import {
  VSL_CREW_WORKFLOW,
  EMAIL_SEQUENCE_CREW_WORKFLOW,
  LANDING_PAGE_CREW_WORKFLOW,
  ARTICLE_CREW_WORKFLOW,
  PRD_CREW_WORKFLOW,
  getCrewWorkflow,
} from './crewaiTasks';
import { executeCrewWorkflow } from './crewaiExecutor';
import { PRD_DIVIDER } from './prd';

/**
 * Executa o workflow CrewAI da sessão e devolve o output final já formatado
 * no contrato da sessão (divisores CopyMaster preservados).
 * onChunk recebe o progresso acumulado (etapas anteriores + atual).
 */
export const runCrewWorkflow = async (
  session: 'vsl' | 'email' | 'landing' | 'article' | 'prd',
  context: Record<string, string>,
  onChunk?: (text: string) => void
): Promise<{ text: string; error?: string }> => {
  const workflow = getCrewWorkflow(session);
  if (!workflow) return { text: '', error: `Sem workflow CrewAI para "${session}"` };

  let acc = '';
  const result = await executeCrewWorkflow(
    workflow,
    context,
    (taskId, output) => {
      acc = acc ? `${acc}\n\n--- etapa ${taskId} ---\n\n${output}` : output;
    },
    (chunk) => {
      // streaming: mostra a etapa em curso junto com o acumulado
      onChunk?.(acc ? `${acc}\n\n--- etapa em curso ---\n\n${chunk}` : chunk);
    }
  );

  if (!result.success) return { text: acc || '', error: result.error };

  const finalText = composeFinalOutput(session, result, context, onChunk);
  onChunk?.(finalText);
  return { text: finalText };
};

/** Monta o entregável final da sessão a partir das saídas das etapas */
function composeFinalOutput(
  session: string,
  result: { taskResults: Array<{ taskId: string; output: string; parsed?: any }> },
  context: Record<string, string>,
  onChunk?: (text: string) => void
): string {
  const get = (id: string) => result.taskResults.find(r => r.taskId === id);
  const lang = context.language || 'pt';

  switch (session) {
    case 'vsl': {
      const script = get('script');
      const review = get('review');
      const content = review?.output || script?.output || '';
      const note = review?.output.includes('IMPROVEMENTS_SUMMARY')
        ? `\n|||NOTA_DIVIDER|||\n**NOTA DO ESTRATEGISTA:**\n${review.output.slice(review.output.indexOf('IMPROVEMENTS_SUMMARY'))}`
        : '';
      return `${content}${note}`;
    }
    case 'email': {
      const write = get('write');
      if (write?.parsed?.emails) {
        return write.parsed.emails.map((e: any, i: number) => {
          const subjects = Array.isArray(e.subjectLines) ? e.subjectLines.join(' | ') : (e.subjectLines || '');
          const body = `${subjects}\n\n${e.body || ''}${e.ps ? `\n\n${e.ps}` : ''}`;
          const note = e.strategistNote ? `\n|||NOTA_DIVIDER|||\n**NOTA DO ESTRATEGISTA:** ${e.strategistNote}` : '';
          return `Assunto: ${subjects}\nCorpo: ${e.body || ''}${note}${i < (write.parsed.emails.length - 1) ? '\n|||EMAIL_DIVIDER|||' : ''}`;
        }).join('\n');
      }
      return write?.output || '';
    }
    case 'landing': {
      const copy = get('copy');
      if (copy?.parsed?.sections) {
        const body = copy.parsed.sections
          .map((s: any) => `[${s.id || 'SECTION'}] ${s.headline || ''}\n${s.copy || ''}`)
          .join('\n\n');
        const note = copy.parsed.strategistNote ? `\n|||NOTA_DIVIDER|||\n**NOTA DO ESTRATEGISTA:**\n${copy.parsed.strategistNote}` : '';
        return `${body}${note}`;
      }
      return copy?.output || '';
    }
    case 'article': {
      const write = get('write');
      if (write?.parsed) {
        const { article, jsonLd, strategistNote } = write.parsed;
        let out = article || '';
        if (jsonLd) out += `\n|||SCHEMA_DIVIDER|||\n${jsonLd}`;
        if (strategistNote) out += `\n|||NOTA_DIVIDER|||\n**NOTA DO ESTRATEGISTA:**\n${strategistNote}`;
        return out;
      }
      return write?.output || '';
    }
    case 'prd': {
      const write = get('prd_write');
      if (write?.parsed) {
        const { prdMd, tokensJson, strategistNote } = write.parsed;
        let out = prdMd || '';
        if (tokensJson) out += `\n${PRD_DIVIDER}\n${tokensJson}`;
        if (strategistNote) out += `\n|||NOTA_DIVIDER|||\n**NOTA DO ESTRATEGISTA:**\n${strategistNote}`;
        return out;
      }
      return write?.output || '';
    }
    default:
      return '';
  }
}

export { VSL_CREW_WORKFLOW, EMAIL_SEQUENCE_CREW_WORKFLOW, LANDING_PAGE_CREW_WORKFLOW, ARTICLE_CREW_WORKFLOW, PRD_CREW_WORKFLOW };
