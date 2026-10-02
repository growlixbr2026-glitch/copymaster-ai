// Helper compartilhado: monta bloco de persona CrewAI para prompts
import { getCrewAIPersona } from '../../../data/crewai-personas';

/**
 * Retorna bloco textual ROLE/GOAL/BACKSTORY/TONE da persona CrewAI
 * selecionada, ou string vazia se não houver persona.
 * Use nos serviços para injetar o especialista prompts.chat no prompt.
 */
export const personaBlock = (id?: string): string => {
  if (!id) return '';
  const p = getCrewAIPersona(id);
  if (!p) return '';
  return `
CREWAI PERSONA (adote este especialista — não ignore):
ROLE: ${p.role}
GOAL: ${p.goal}
BACKSTORY: ${p.backstory}
TONE: ${p.tone || 'n/a'}
PROIBIDO: ${p.avoid && p.avoid.length ? p.avoid.join(', ') : 'n/a'}
FRAMEWORKS: ${p.frameworks && p.frameworks.length ? p.frameworks.join(', ') : 'n/a'}
`;
};
