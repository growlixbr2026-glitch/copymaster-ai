import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { BarChart2 } from 'lucide-react';
import { generateRevOpsService } from '../services/modules/revops/revenueOps';

const config: BridgeConfig = {
  id: 'revops', title: 'RevOps Brief', colorClass: 'text-emerald-400',
  icon: <BarChart2 className="w-6 h-6" />,
  description: 'Briefing de Revenue Operations: métricas, automações e higiene de CRM/pipeline.',
  requiredKey: 'funnel', requiredError: 'Descreva seu funil atual.',
  personaTag: 'copy',
  sessionId: 'revops',
  generate: (params, onChunk) => generateRevOpsService(params, onChunk),
  fields: [
    { key: 'funnel', label: 'Funil Atual *', placeholder: 'Lead → MQL → SQL → ...', required: true },
    { key: 'tools', label: 'Ferramentas/CRM', placeholder: 'RD Station, HubSpot...' },
    { key: 'bottleneck', label: 'Gargalo Principal', placeholder: 'Onde o funil trava?' },
    { key: 'revenue', label: 'Receita/Pipeline', placeholder: 'R$ 100k pipeline, MRR...' },
  ],
};

export default function RevOpsBriefStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
