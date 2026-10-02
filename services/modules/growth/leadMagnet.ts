import { runBridgeService } from '../bridge/bridgeService';

export interface LeadMagnetParams {
  niche?: string; pain?: string; format?: string; language?: string; crewPersona?: string;
}

export const generateLeadMagnetService = async (params: LeadMagnetParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'LEAD MAGNET BUILDER',
    hierarchy: [
      `NICHO: ${params.niche || 'não informado'}`,
      `DOR PRINCIPAL: ${params.pain || 'não informado'}`,
      `FORMATO: ${params.format || 'automático'}`,
    ],
    directives: [
      'Crie estrutura do lead magnet + copy da landing page + CTA.',
      'Inclua follow-up sequence hint.',
    ],
    structure: `[ESTRUTURA DO LEAD MAGNET]

[COPY DA LANDING PAGE]

[CTA E FORMULÁRIO]

[FOLLOW-UP SEQUENCE HINT]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
