import { runBridgeService } from '../bridge/bridgeService';

export interface LaunchParams {
  product?: string; targetDate?: string; channels?: string; audience?: string; language?: string; crewPersona?: string;
}

export const generateLaunchPlanService = async (params: LaunchParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'LAUNCH PLAN',
    hierarchy: [
      `PRODUTO: ${params.product || 'não informado'}`,
      `DATA ALVO: ${params.targetDate || 'não informado'}`,
      `CANAIS: ${params.channels || 'não informado'}`,
      `AUDIÊNCIA: ${params.audience || 'não informado'}`,
    ],
    directives: [
      'Entregue plano de lançamento em 3 fases: pré-lançamento, lançamento, pós-lançamento.',
      'Separe cada fase com |||LAUNCH_DIVIDER||| em linha própria.',
      'Inclua checklist de ações e métricas.',
    ],
    structure: `[FASE 1 — PRÉ-LANÇAMENTO]
|||LAUNCH_DIVIDER|||
[FASE 2 — LANÇAMENTO]
|||LAUNCH_DIVIDER|||
[FASE 3 — PÓS-LANÇAMENTO]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||LAUNCH_DIVIDER||| / |||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
