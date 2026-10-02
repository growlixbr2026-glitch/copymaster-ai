import { runBridgeService } from '../bridge/bridgeService';

export interface EnablementParams {
  product?: string; objections?: string; buyerPersona?: string; offer?: string; language?: string; crewPersona?: string;
}

export const generateEnablementService = async (params: EnablementParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'SALES ENABLEMENT KIT',
    hierarchy: [
      `PRODUTO: ${params.product || 'não informado'}`,
      `TOP 3 OBJEÇÕES: ${params.objections || 'não informado'}`,
      `PERSONA COMPRADORA: ${params.buyerPersona || 'não informado'}`,
      `OFERTA: ${params.offer || 'não informado'}`,
    ],
    directives: [
      'Entregue um kit de enablement: one-pager, talk track e tratamento de objeções.',
    ],
    structure: `[ONE-PAGER DO PRODUTO]

[TALK TRACK — abertura, descoberta, pitch, fechamento]

[TRATAMENTO DE OBJEÇÕES (top 3)]

[CASE/SOCIAL PROOF PLACEHOLDER]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
