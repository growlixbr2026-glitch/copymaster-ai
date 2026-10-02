import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { HeartHandshake } from 'lucide-react';
import { generatePartnershipsService } from '../services/modules/growth/partnerships';

const config: BridgeConfig = {
  id: 'partnerships', title: 'Partnerships', colorClass: 'text-pink-500',
  icon: <HeartHandshake className="w-6 h-6" />,
  description: 'Shortlist de parceiros, proposta de valor e estrutura de acordo.',
  requiredKey: 'product', requiredError: 'Informe o produto.',
  personaTag: 'landing',
  sessionId: 'partnerships',
  generate: (params, onChunk) => generatePartnershipsService(params, onChunk),
  fields: [
    { key: 'product', label: 'Produto *', placeholder: 'O que oferecemos...', required: true },
    { key: 'audience', label: 'Público', placeholder: 'Quem servimos...' },
    { key: 'potentialPartners', label: 'Parceiros Potenciais', placeholder: 'Empresas-alvo...' },
    { key: 'type', label: 'Tipo', type: 'select', options: ['Automático', 'Afiliado', 'Canal', 'Tecnologia', 'Conteúdo', 'Co-marketing'] },
  ],
};

export default function PartnershipsStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
