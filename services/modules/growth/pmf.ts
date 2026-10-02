import { runBridgeService } from '../bridge/bridgeService';

export interface PMFParams {
  product?: string; segment?: string; pain?: string; alternative?: string; language?: string; crewPersona?: string;
}

export const generatePMFService = async (params: PMFParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'PMF CANVAS / VALIDATION',
    hierarchy: [
      `PRODUTO: ${params.product || 'não informado'}`,
      `SEGMENTO: ${params.segment || 'não informado'}`,
      `DOR PRINCIPAL: ${params.pain || 'não informado'}`,
      `ALTERNATIVA ATUAL: ${params.alternative || 'não informado'}`,
    ],
    directives: [
      'Avalie sinais de PMF (Sean Ellis 40% + evidência qualitativa).',
      'Sugira experimentos de validação.',
      'Marque incertezas — não afirme PMF sem dados.',
    ],
    structure: `[AVALIAÇÃO DE PMF — sinais e evidências]

[EXPERIMENTOS DE VALIDAÇÃO]

[RIESGOS E INCERTEZAS]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
