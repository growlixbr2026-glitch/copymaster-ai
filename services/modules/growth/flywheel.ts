import { runBridgeService } from '../bridge/bridgeService';

export interface FlywheelParams {
  niche?: string; model?: string; primaryChannel?: string; target?: string; language?: string; crewPersona?: string;
}

export const generateFlywheelService = async (params: FlywheelParams, onChunk?: (text: string) => void) => {
  return runBridgeService({
    mode: 'GROWTH FLYWHEEL',
    hierarchy: [
      `NICHO: ${params.niche || 'não informado'}`,
      `MODELO: ${params.model || 'automático'}`,
      `CANAL PRINCIPAL: ${params.primaryChannel || 'não informado'}`,
      `META: ${params.target || 'não informado'}`,
    ],
    directives: [
      'Desenhe um growth flywheel com loops de aquisição, ativação, retenção e receita.',
      'Cada loop com alavancas, gargalos e métrica-norte.',
      'Saída em JSON estruturado SEM divisor de nota (estilo IdeaSession) + NOTA ao final.',
    ],
    structure: `{"loops":[{"name":"","lever":"","bottleneck":"","northStar":""}]}
|||NOTA_DIVIDER|||
**NOTA DO ESTRATEGISTA:**`,
    divider: '|||NOTA_DIVIDER|||',
    persona: params.crewPersona,
  }, onChunk);
};
