import { runBridgeService } from '../bridge/bridgeService';

export interface SalesEngineerParams {
  opportunity?: string; techRequirements?: string; competitors?: string; stage?: string; language?: string; crewPersona?: string;
}

export const generateSalesEngineerService = async (params: SalesEngineerParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'SALES ENGINEER / TECHNICAL SALES',
    hierarchy: [
      `OPORTUNIDADE: ${params.opportunity || 'não informado'}`,
      `REQUISITOS TÉCNICOS: ${params.techRequirements || 'não informado'}`,
      `CONCORRENTES: ${params.competitors || 'não informado'}`,
      `ESTÁGIO: ${params.stage || 'não informado'}`,
    ],
    directives: [
      'Crie guia de descoberta técnica, estrutura de RFP e plano de POC.',
    ],
    structure: `[DISCOVERY GUIDE TÉCNICO]

[ESTRUTURA DE RESPOSTA RFP]

[PLANO DE POC]

[POSICIONAMENTO COMPETITIVO TÉCNICO]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
