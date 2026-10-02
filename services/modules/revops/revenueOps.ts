import { runBridgeService } from '../bridge/bridgeService';

export interface RevOpsParams {
  funnel?: string; tools?: string; bottleneck?: string; revenue?: string; language?: string; crewPersona?: string;
}

export const generateRevOpsService = async (params: RevOpsParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'REVOPS BRIEF (Revenue Operations)',
    hierarchy: [
      `FUNIL ATUAL: ${params.funnel || 'não informado'}`,
      `FERRAMENTAS/CRM: ${params.tools || 'não informado'}`,
      `GARGALO PRINCIPAL: ${params.bottleneck || 'não informado'}`,
      `RECEITA/PIPELINE: ${params.revenue || 'não informado'}`,
    ],
    directives: [
      'Entregue um briefing de operações de receita com métricas, automações prioritárias e higiene de dados.',
      'Classifique cada ação em P0/P1/P2.',
      'Não invente números — use [INSERIR DADO] quando precisar de dado específico.',
    ],
    structure: `[RESUMO DO FUNIL]

[MÉTRICAS-CHAVE SUGERIDAS: cobertura de pipeline, forecast accuracy, GTM efficiency]

[AUTOMAÇÕES PRIORITÁRIAS]

[HIGIENE DE DADOS E CRM]

[PRIORIZAÇÃO P0/P1/P2]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
