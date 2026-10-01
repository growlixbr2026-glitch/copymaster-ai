
import { Persona } from '../types';

const STORAGE_KEY_PERSONAS = 'copymaster_personas';
const STORAGE_KEY_ACTIVE_PERSONA = 'copymaster_active_persona_id';

export const getPersonas = (): Persona[] => {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY_PERSONAS);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

export const savePersona = (persona: Persona) => {
  const personas = getPersonas();
  const existingIndex = personas.findIndex(p => p.id === persona.id);
  
  if (existingIndex >= 0) {
    personas[existingIndex] = persona;
  } else {
    personas.push(persona);
  }
  
  localStorage.setItem(STORAGE_KEY_PERSONAS, JSON.stringify(personas));
};

export const deletePersona = (id: string) => {
  const personas = getPersonas().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY_PERSONAS, JSON.stringify(personas));
  
  // If deleted persona was active, clear active
  if (getActivePersonaId() === id) {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_PERSONA);
  }
};

export const setActivePersonaId = (id: string | null) => {
  if (id) {
    localStorage.setItem(STORAGE_KEY_ACTIVE_PERSONA, id);
  } else {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_PERSONA);
  }
};

export const getActivePersonaId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_ACTIVE_PERSONA);
};

export const getActivePersona = (): Persona | undefined => {
  const id = getActivePersonaId();
  if (!id) return undefined;
  return getPersonas().find(p => p.id === id);
};

// Helper to convert Persona to Context String
export const personaToContext = (persona: Persona): string => {
  return `
MARCA/CLIENTE: ${persona.name}
O QUE FAZ: ${persona.description}
PÚBLICO-ALVO: ${persona.audience}
TOM DE VOZ: ${persona.tone}
VOCABULÁRIO/OBS: ${persona.vocabulary}
MISSÃO/VALORES: ${persona.mission}
  `.trim();
};
