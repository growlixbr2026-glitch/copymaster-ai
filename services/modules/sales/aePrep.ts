import { runBridgeService } from '../bridge/bridgeService';

export interface AEPrepParams {
  account?: string; stakeholders?: string; meetingGoal?: string; language?: string; crewPersona?: string;
}

export const generateAEPrepService = async (params: AEPrepParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'ACCOUNT EXECUTIVE PREP',
    hierarchy: [
      `CONTA: ${params.account || 'não informado'}`,
      `STAKEHOLDERS: ${params.stakeholders || 'não informado'}`,
      `OBJETIVO DA MEETING: ${params.meetingGoal || 'não informado'}`,
    ],
    directives: [
      'Prepare brief de conta, mapa de stakeholders, perguntas de descoberta e talk track.',
    ],
    structure: `[BRIEF DA CONTA]

[MAPA DE STAKEHOLDERS]

[PERGUNTAS DE DESCOBERTA]

[TALK TRACK E PRÓXIMOS PASSOS]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
