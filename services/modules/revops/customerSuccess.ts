import { runBridgeService } from '../bridge/bridgeService';

export interface CustomerSuccessParams {
  base?: string; healthSignals?: string; playbooks?: string; segment?: string; language?: string; crewPersona?: string;
}

export const generateCustomerSuccessService = async (params: CustomerSuccessParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'CUSTOMER SUCCESS / HEALTH SCORE',
    hierarchy: [
      `BASE DE CLIENTES: ${params.base || 'não informado'}`,
      `SINAIS DE HEALTH: ${params.healthSignals || 'não informado'}`,
      `PLAYBOOKS ATUAIS: ${params.playbooks || 'não informado'}`,
      `SEGMENTO: ${params.segment || 'não informado'}`,
    ],
    directives: [
      'Crie um framework de health score, risco de churn e oportunidades de expansão.',
      'Inclua playbooks de intervenção por estágio.',
    ],
    structure: `[HEALTH SCORE: dimensões e pesos]

[RISCO DE CHURN: sinais e gatilhos]

[EXPANSÃO: oportunidades por segmento]

[PLAYBOOKS DE INTERVENÇÃO]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
