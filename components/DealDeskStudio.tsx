import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { Target } from 'lucide-react';
import { generateDealDeskService } from '../services/modules/sales/dealDesk';

const config: BridgeConfig = {
  id: 'dealDesk', title: 'Deal Desk', colorClass: 'text-orange-400',
  icon: <Target className="w-6 h-6" />,
  description: 'Qualificação BANT/MEDDIC com score e go/no-go do deal.',
  requiredKey: 'lead', requiredError: 'Descreva o lead.',
  personaTag: 'prd',
  sessionId: 'dealdesk',
  generate: (params, onChunk) => generateDealDeskService(params, onChunk),
  fields: [
    { key: 'lead', label: 'Lead *', placeholder: 'Empresa, cargo, dor...', required: true },
    { key: 'callContext', label: 'Contexto da Call', placeholder: 'O que foi dito...' },
    { key: 'budget', label: 'Budget', placeholder: 'Orçamento declarado...' },
    { key: 'timeline', label: 'Timeline', placeholder: 'Q3, próximo mês...' },
  ],
};

export default function DealDeskStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
