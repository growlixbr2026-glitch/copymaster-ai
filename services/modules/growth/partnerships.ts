import { runBridgeService } from '../bridge/bridgeService';

export interface PartnershipsParams {
  product?: string; audience?: string; potentialPartners?: string; type?: string; language?: string; crewPersona?: string;
}

export const generatePartnershipsService = async (params: PartnershipsParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'PARTNERSHIPS ARCHITECT',
    hierarchy: [
      `PRODUTO: ${params.product || 'não informado'}`,
      `PÚBLICO: ${params.audience || 'não informado'}`,
      `PARCEIROS POTENCIAIS: ${params.potentialPartners || 'não informado'}`,
      `TIPO DE PARCERIA: ${params.type || 'automático'}`,
    ],
    directives: [
      'Monte shortlist de parceiros com proposta de valor por parceiro.',
      'Inclua estrutura de acordo e métricas.',
    ],
    structure: `[SHORTLIST DE PARCEIROS]

[PROPOSTA DE VALOR POR PARCEIRO]

[ESTRUTURA DE ACORDO]

[MÉTRICAS DE PARCERIA]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
