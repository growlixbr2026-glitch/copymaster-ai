// Prompt Optimizer — meta-prompt pattern (prompts.chat / Anthropic prompt-improver)
// Recebe um prompt bruto e devolve uma versão estruturada: role, contexto,
// restrições, formato de saída e exemplos. 1 chamada callAI.
import { callAI } from '../../core/aiClient';

const OPTIMIZER_SYSTEM = `You are an expert prompt engineer. You improve prompts by restructuring them, never by changing the user's intent.

Given a raw prompt, rewrite it with this structure:
1. ROLE — one sentence defining the expert role
2. CONTEXT — what the model needs to know (facts the user gave, kept verbatim)
3. TASK — the single clear objective
4. CONSTRAINTS — format, length, language, tone, what to avoid
5. OUTPUT FORMAT — exact structure of the answer (dividers, sections, plain text rules)

Rules:
- Keep ALL factual content and specifics from the original prompt (names, numbers, requirements). Never invent facts.
- Keep any CopyMaster dividers exactly as written (|||X_DIVIDER|||) if present.
- Plain text output: no markdown in the rewritten prompt body except the 5 SECTION HEADERS in UPPERCASE.
- If the original prompt is already well-structured, improve only what is weak (vague constraints, missing output format).
- Output ONLY the rewritten prompt. No preamble, no explanation.`;

export const optimizePromptService = async (
  rawPrompt: string,
  language: string,
  onChunk?: (text: string) => void
): Promise<{ text: string; error?: string }> => {
  if (!rawPrompt || !rawPrompt.trim()) {
    return { text: '', error: 'Nenhum prompt para otimizar.' };
  }

  const prompt = `ORIGINAL PROMPT (user's text, verbatim):
---
${rawPrompt}
---

TARGET LANGUAGE FOR THE PROMPT INSTRUCTIONS: ${language}
(Keep quoted sample texts in their original language; write the instructions themselves so they work for this language.)

Rewrite the prompt using the ROLE / CONTEXT / TASK / CONSTRAINTS / OUTPUT FORMAT structure. Return ONLY the rewritten prompt.`;

  return callAI(prompt, OPTIMIZER_SYSTEM, 'gemini-3-pro-preview', onChunk, { maxTokens: 4096 });
};
