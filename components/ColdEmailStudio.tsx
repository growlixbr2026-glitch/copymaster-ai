import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { Mail } from 'lucide-react';
import { generateColdEmailService } from '../services/modules/sales/coldEmail';

const config: BridgeConfig = {
  id: 'coldEmail', title: 'Cold Email B2B', colorClass: 'text-sky-400',
  icon: <Mail className="w-6 h-6" />,
  description: '3 cadências de cold email (email + LinkedIn/phone) com assuntos e CTAs.',
  requiredKey: 'icp', requiredError: 'Informe o ICP.',
  personaTag: 'copy',
  sessionId: 'coldemail',
  generate: (params, onChunk) => generateColdEmailService(params, onChunk),
  fields: [
    { key: 'icp', label: 'ICP *', placeholder: 'PMEs de saúde, 50-200 funcionários...', required: true },
    { key: 'role', label: 'Cargo', placeholder: 'Diretor comercial...' },
    { key: 'offer', label: 'Oferta', placeholder: 'Automação de agendamentos...' },
    { key: 'trigger', label: 'Trigger Event', placeholder: 'Expansão recente, nova unidade...' },
    { key: 'tone', label: 'Tom', type: 'select', options: ['Consultivo', 'Direto', 'Personalizado', 'Familiar'] },
  ],
};

export default function ColdEmailStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
