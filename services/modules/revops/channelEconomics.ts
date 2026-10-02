import { runBridgeService } from '../bridge/bridgeService';

export interface ChannelEconomicsParams {
  channels?: string; cac?: string; ltv?: string; commission?: string; language?: string; crewPersona?: string;
}

export const generateChannelEconomicsService = async (params: ChannelEconomicsParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'CHANNEL ECONOMICS',
    hierarchy: [
      `CANAIS: ${params.channels || 'não informado'}`,
      `CAC: ${params.cac || 'não informado'}`,
      `LTV: ${params.ltv || 'não informado'}`,
      `COMISSÃO/MODELO: ${params.commission || 'não informado'}`,
    ],
    directives: [
      'Entregue unit economics por canal (LTV/CAC, payback, margem).',
      'Recomende priorização e ajustes de comissão.',
    ],
    structure: `[UNIT ECONOMICS POR CANAL]

[LTV/CAC E PAYBACK]

[PRIORIZAÇÃO DE CANAIS]

[AJUSTES DE COMISSÃO/MODELO]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
