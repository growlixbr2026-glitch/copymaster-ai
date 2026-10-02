import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { UserMinus } from 'lucide-react';
import { generateCustomerSuccessService } from '../services/modules/revops/customerSuccess';

const config: BridgeConfig = {
  id: 'customerSuccess', title: 'Customer Success', colorClass: 'text-lime-400',
  icon: <UserMinus className="w-6 h-6" />,
  description: 'Framework de health score, risco de churn e expansão para CS.',
  requiredKey: 'base', requiredError: 'Descreva a base de clientes.',
  personaTag: 'landing',
  sessionId: 'customersuccess',
  generate: (params, onChunk) => generateCustomerSuccessService(params, onChunk),
  fields: [
    { key: 'base', label: 'Base de Clientes *', placeholder: '500 clientes SMB...', required: true },
    { key: 'healthSignals', label: 'Sinais de Health', placeholder: 'Uso, NPS, tickets...' },
    { key: 'playbooks', label: 'Playbooks Atuais', placeholder: 'Onboarding, QBR...' },
    { key: 'segment', label: 'Segmento', placeholder: 'SMB, Mid-market, Enterprise...' },
  ],
};

export default function CustomerSuccessStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
