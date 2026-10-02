import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { Rocket } from 'lucide-react';
import { generateLaunchPlanService } from '../services/modules/growth/launch';

const config: BridgeConfig = {
  id: 'launch', title: 'Launch Plan', colorClass: 'text-rose-400',
  icon: <Rocket className="w-6 h-6" />,
  description: 'PLG/SLG launch timeline em 3 fases: pré, lançamento e pós.',
  requiredKey: 'product', requiredError: 'Informe o produto.',
  personaTag: 'copy',
  sessionId: 'launch',
  generate: (params, onChunk) => generateLaunchPlanService(params, onChunk),
  fields: [
    { key: 'product', label: 'Produto *', placeholder: 'O que vamos lançar...', required: true },
    { key: 'targetDate', label: 'Data Alvo', placeholder: '30/12/2026' },
    { key: 'channels', label: 'Canais', placeholder: 'LinkedIn, email, ads...' },
    { key: 'audience', label: 'Audiência', placeholder: 'Quem vai saber...' },
  ],
};

export default function LaunchPlanStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
