import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { Wrench } from 'lucide-react';
import { generateSalesEngineerService } from '../services/modules/sales/salesEngineer';

const config: BridgeConfig = {
  id: 'salesEngineer', title: 'Sales Engineer', colorClass: 'text-cyan-400',
  icon: <Wrench className="w-6 h-6" />,
  description: 'Discovery técnico, RFP response e plano de POC para engenharia de vendas.',
  requiredKey: 'opportunity', requiredError: 'Descreva a oportunidade.',
  personaTag: 'landing',
  sessionId: 'salesengineer',
  generate: (params, onChunk) => generateSalesEngineerService(params, onChunk),
  fields: [
    { key: 'opportunity', label: 'Oportunidade *', placeholder: 'Empresa, dor técnica...', required: true },
    { key: 'techRequirements', label: 'Requisitos Técnicos', placeholder: 'API, SSO, compliance...' },
    { key: 'competitors', label: 'Concorrentes', placeholder: 'Soluções concorrentes...' },
    { key: 'stage', label: 'Estágio', type: 'select', options: ['Discovery', 'POC', 'RFP', 'Negociação', 'Close'] },
  ],
};

export default function SalesEngineerStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
