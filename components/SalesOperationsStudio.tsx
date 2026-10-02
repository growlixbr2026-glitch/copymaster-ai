import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { Users } from 'lucide-react';
import { generateSalesOpsService } from '../services/modules/revops/salesOps';

const config: BridgeConfig = {
  id: 'salesOps', title: 'Sales Operations', colorClass: 'text-fuchsia-400',
  icon: <Users className="w-6 h-6" />,
  description: 'Capacity planning, territórios e rituais para o time de vendas.',
  requiredKey: 'team', requiredError: 'Descreva o time.',
  personaTag: 'prd',
  sessionId: 'salesops',
  generate: (params, onChunk) => generateSalesOpsService(params, onChunk),
  fields: [
    { key: 'team', label: 'Time *', placeholder: '5 AEs, 3 SDRs...', required: true },
    { key: 'quotas', label: 'Quotas', placeholder: 'Meta por AE...' },
    { key: 'territories', label: 'Territórios', placeholder: 'Regiões, segmentos...' },
    { key: 'pipeline', label: 'Pipeline', placeholder: 'R$ X em aberto...' },
  ],
};

export default function SalesOperationsStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
