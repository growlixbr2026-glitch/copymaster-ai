import { runBridgeService } from '../bridge/bridgeService';

export interface ChurnParams {
  segment?: string; churnReason?: string; offer?: string; language?: string; crewPersona?: string;
}

export const generateChurnService = async (params: ChurnParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'CHURN PREVENTION PLAYBOOK',
    hierarchy: [
      `SEGMENTO: ${params.segment || 'não informado'}`,
      `MOTIVO DE CHURN: ${params.churnReason || 'não informado'}`,
      `OFERTA: ${params.offer || 'não informado'}`,
    ],
    directives: [
      'Crie playbook de retenção com ações preventivas, gatilhos e ofertas de save.',
    ],
    structure: `[AÇÕES PREVENTIVAS]

[GATILHOS DE RISCO]

[OFERTAS DE SAVE/WIN-BACK]

[MÉTRICAS DE RETENÇÃO]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
