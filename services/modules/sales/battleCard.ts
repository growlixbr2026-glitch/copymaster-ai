import { runBridgeService } from '../bridge/bridgeService';

export interface BattleCardParams {
  product?: string; competitors?: string; differential?: string; focus?: string; language?: string; crewPersona?: string;
}

export const generateBattleCardService = async (params: BattleCardParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'BATTLE CARD / COMPETITOR INTEL',
    hierarchy: [
      `NOSSO PRODUTO: ${params.product || 'não informado'}`,
      `CONCORRENTES: ${params.competitors || 'não informado'}`,
      `DIFERENCIAL: ${params.differential || 'não informado'}`,
      `FOCO: ${params.focus || 'all'}`,
    ],
    directives: [
      'Entregue matriz comparativa, gaps, SWOT e posicionamento.',
      'Honestidade > hype; use [INSERIR DADO] para números.',
    ],
    structure: `[MATRIZ COMPARATIVA]

[PONTOS FORTES NOSSOS]

[GAPS DOS CONCORRENTES]

[NOSSO DIFERENCIAL]

[SWOT RESUMIDO]

[POSICIONAMENTO RECOMENDADO]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
