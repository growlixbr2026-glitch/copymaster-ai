/**
 * CopyMaster AI — Sistema de Guias Detalhados (F1 Help)
 * 
 * Cada sessão/subsessão tem um guia estruturado que explica:
 * - O que é o módulo (conceito, propósito)
 * - Para que serve (casos de uso reais)
 * - Resultado esperado (o que o usuário recebe)
 * - Inputs detalhados (cada campo, o que preencher, exemplos)
 * - Fluxo de uso passo a passo
 * - Dicas de especialista / melhores práticas
 * - Limitações / bloqueios conhecidos
 * - Exemplos práticos
 * - Integração com outras sessões
 */

export interface GuideInputField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'number' | 'file' | 'toggle' | 'radio';
  required: boolean;
  placeholder?: string;
  description: string;
  options?: string[];
  dependsOn?: string; // campo que controla visibilidade
  example?: string;
}

export interface GuideSubsession {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export interface SessionGuide {
  sessionId: string;
  sessionTitle: string;
  category: string;
  badge: 'text' | 'image' | 'dynamic';
  
  // Visão geral
  whatIsIt: string;           // O que é este módulo (2-3 parágrafos)
  purpose: string;            // Para que serve / casos de uso
  expectedOutput: string;     // Resultado esperado (formato, estrutura)
  outputKind: 'text' | 'image_prompt' | 'mixed'; // Texto puro, prompt EN, ou ambos
  
  // Subsessões/modos (se houver)
  subsessions?: GuideSubsession[];
  
  // Inputs detalhados
  inputs: GuideInputField[];
  
  // Fluxo de uso
  workflow: string[];         // Passos numerados
  
  // Dicas e melhores práticas
  proTips: string[];
  commonMistakes: string[];
  
  // Integração
  integratesWith: string[];   // IDs de outras sessões
  exportsTo: string[];        // Para onde o resultado pode ir
  
  // Limitações
  limitations: string[];
  knownBlocks: string[];      // O que bloqueia geração (ex: campo vazio)
  
  // Exemplos práticos
  examples: {
    title: string;
    inputs: Record<string, string>;
    expectedResult: string;
  }[];
  
  // FAQ rápido
  faq: { q: string; a: string }[];
}

// Mapa de todas as sessões para lookup rápido
export const SESSION_GUIDES: Record<string, SessionGuide> = {};

// Helper para registrar guias
export function registerGuide(guide: SessionGuide) {
  SESSION_GUIDES[guide.sessionId] = guide;
}

export function getGuide(sessionId: string): SessionGuide | undefined {
  return SESSION_GUIDES[sessionId];
}

export function getAllGuides(): SessionGuide[] {
  return Object.values(SESSION_GUIDES);
}

// ---------------------------------------------------------------------------
// Registro de todos os guias (conteúdo em data/guides/*.ts — só `import type`
// daqui, sem ciclo de runtime: os arquivos de conteúdo exportam arrays de
// SessionGuide e o registro acontece aqui, após a definição do registry).
// ---------------------------------------------------------------------------
import { GUIDES_STRATEGY } from './guides/strategy';
import { GUIDES_VIDEO } from './guides/video';
import { GUIDES_VISUAL } from './guides/visual';
import { GUIDES_SEO } from './guides/seo';
import { GUIDES_SALES } from './guides/sales';
import { GUIDES_GROWTH } from './guides/growth';

[...GUIDES_STRATEGY, ...GUIDES_VIDEO, ...GUIDES_VISUAL, ...GUIDES_SEO, ...GUIDES_SALES, ...GUIDES_GROWTH]
  .forEach(registerGuide);