import { runBridgeService } from '../bridge/bridgeService';

export interface ColdEmailParams {
  icp?: string; role?: string; offer?: string; trigger?: string; tone?: string; language?: string; crewPersona?: string;
}

export const generateColdEmailService = async (params: ColdEmailParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'COLD EMAIL B2B',
    hierarchy: [
      `ICP: ${params.icp || 'não informado'}`,
      `CARGO: ${params.role || 'não informado'}`,
      `OFERTA: ${params.offer || 'não informado'}`,
      `TRIGGER EVENT: ${params.trigger || 'não informado'}`,
      `TOM: ${params.tone || 'consultivo'}`,
    ],
    directives: [
      'Entregue 3 cadências de cold email (abertura, follow-up 1, follow-up 2).',
      'Cada email com assunto, corpo curto e CTA único.',
      'Separe as 3 cadências com |||EMAIL_DIVIDER||| em linha própria.',
    ],
    structure: `[CADÊNCIA 1 — ABERTURA + 2 FOLLOW-UPS]
|||EMAIL_DIVIDER|||
[CADÊNCIA 2 — Ângulo diferente + 2 follow-ups]
|||EMAIL_DIVIDER|||
[CADÊNCIA 3 — Ângulo de quebra de padrão + 2 follow-ups]
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||EMAIL_DIVIDER||| / |||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
