import { runBridgeService } from '../bridge/bridgeService';

export interface SalesOpsParams {
  team?: string; quotas?: string; territories?: string; pipeline?: string; language?: string; crewPersona?: string;
}

export const generateSalesOpsService = async (params: SalesOpsParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'SALES OPERATIONS',
    hierarchy: [
      `EQUIPE: ${params.team || 'não informado'}`,
      `QUOTAS: ${params.quotas || 'não informado'}`,
      `TERRITÓRIOS: ${params.territories || 'não informado'}`,
      `PIPELINE: ${params.pipeline || 'não informado'}`,
    ],
    directives: [
      'Entregue um plano operacional de vendas com capacity planning e design de territórios.',
      'Inclua cadência de rituais (1:1, forecast review, pipeline).',
    ],
    structure: `[CAPACITY PLANNING]

[DESIGN DE TERRITÓRIOS]

[CADÊNCIA DE RITUAIS]

[MÉTRICAS DE EXECUÇÃO]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
