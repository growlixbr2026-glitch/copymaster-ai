import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { TrendingDown } from 'lucide-react';
import { generateChurnService } from '../services/modules/growth/churn';

const config: BridgeConfig = {
  id: 'churn', title: 'Churn Prevention', colorClass: 'text-red-500',
  icon: <TrendingDown className="w-6 h-6" />,
  description: 'Playbook de retenção: ações preventivas, gatilhos de risco e offers de save.',
  requiredKey: 'segment', requiredError: 'Informe o segmento.',
  personaTag: 'landing',
  sessionId: 'churn',
  generate: (params, onChunk) => generateChurnService(params, onChunk),
  fields: [
    { key: 'segment', label: 'Segmento *', placeholder: 'Clientes SMB com <6 meses...', required: true },
    { key: 'churnReason', label: 'Motivo de Churn', placeholder: 'Preço, onboarding...' },
    { key: 'offer', label: 'Oferta de Save', placeholder: 'Desconto 2 meses...' },
  ],
};

export default function ChurnPreventionStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
