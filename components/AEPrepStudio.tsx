import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { Briefcase } from 'lucide-react';
import { generateAEPrepService } from '../services/modules/sales/aePrep';

const config: BridgeConfig = {
  id: 'aePrep', title: 'AE Prep', colorClass: 'text-teal-400',
  icon: <Briefcase className="w-6 h-6" />,
  description: 'Brief de conta, mapa de stakeholders e perguntas para o Account Executive.',
  requiredKey: 'account', requiredError: 'Informe a conta.',
  personaTag: 'landing',
  sessionId: 'aeprep',
  generate: (params, onChunk) => generateAEPrepService(params, onChunk),
  fields: [
    { key: 'account', label: 'Conta *', placeholder: 'Empresa alvo...', required: true },
    { key: 'stakeholders', label: 'Stakeholders', placeholder: 'CEO, CTO, Head...' },
    { key: 'meetingGoal', label: 'Objetivo da Meeting', placeholder: 'Demo, discovery, close...' },
  ],
};

export default function AEPrepStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
