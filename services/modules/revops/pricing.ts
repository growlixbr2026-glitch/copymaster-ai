import { runBridgeService } from '../bridge/bridgeService';

export interface PricingParams {
  product?: string; costs?: string; competitor?: string; willingnessToPay?: string; model?: string; language?: string; crewPersona?: string;
}

export const generatePricingService = async (params: PricingParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'PRICING STRATEGY',
    hierarchy: [
      `PRODUTO: ${params.product || 'não informado'}`,
      `CUSTOS: ${params.costs || 'não informado'}`,
      `CONCORRENTES: ${params.competitor || 'não informado'}`,
      `WILLINGNESS TO PAY: ${params.willingnessToPay || 'não informado'}`,
      `MODELO PREFERIDO: ${params.model || 'automático'}`,
    ],
    directives: [
      'Entregue uma estratégia de precificação com 3 tiers recomendados e justificativa.',
      'Explique o modelo escolhido (value-based, cost-plus, etc.).',
      'Inclua âncora de preço e garantia/trial.',
    ],
    structure: `[MODELO DE PRECIFICAÇÃO RECOMENDADO]

[TIER 1 - BÁSICO] — preço, entregáveis, para quem

[TIER 2 - PROFISSIONAL] — preço, entregáveis, para quem

[TIER 3 - ENTERPRISE] — preço, entregáveis, para quem

[ÂNCORA DE PREÇO E GARANTIA]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
