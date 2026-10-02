import { runBridgeService } from '../bridge/bridgeService';

export interface DealDeskParams {
  lead?: string; callContext?: string; budget?: string; timeline?: string; language?: string; crewPersona?: string;
}

export const generateDealDeskService = async (params: DealDeskParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'DEAL DESK / QUALIFICAÇÃO',
    hierarchy: [
      `LEAD: ${params.lead || 'não informado'}`,
      `CONTEXTO DA CALL: ${params.callContext || 'não informado'}`,
      `BUDGET: ${params.budget || 'não informado'}`,
      `TIMELINE: ${params.timeline || 'não informado'}`,
    ],
    directives: [
      'Aplique BANT e MEDDIC para qualificar o lead.',
      'Entregue score, decisão (go/no-go) e próximo passo recomendado.',
    ],
    structure: `[QUALIFICAÇÃO BANT]

[QUALIFICAÇÃO MEDDIC]

[SCORE E DECISÃO GO/NO-GO]

[PRÓXIMO PASSO RECOMENDADO]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
