import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { PieChart } from 'lucide-react';
import { generateChannelEconomicsService } from '../services/modules/revops/channelEconomics';

const config: BridgeConfig = {
  id: 'channelEconomics', title: 'Channel Economics', colorClass: 'text-amber-500',
  icon: <PieChart className="w-6 h-6" />,
  description: 'Unit economics por canal: LTV/CAC, payback e priorização.',
  requiredKey: 'channels', requiredError: 'Liste os canais.',
  personaTag: 'landing',
  sessionId: 'channeleconomics',
  generate: (params, onChunk) => generateChannelEconomicsService(params, onChunk),
  fields: [
    { key: 'channels', label: 'Canais *', placeholder: 'Orgânico, ads, afiliados...', required: true },
    { key: 'cac', label: 'CAC', placeholder: 'Custo de aquisição por canal...' },
    { key: 'ltv', label: 'LTV', placeholder: 'Valor vitalício do cliente...' },
    { key: 'commission', label: 'Comissão', placeholder: 'Afiliado 20%...' },
  ],
};

export default function ChannelEconomicsStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
