import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { Swords } from 'lucide-react';
import { generateBattleCardService } from '../services/modules/sales/battleCard';

const config: BridgeConfig = {
  id: 'battleCard', title: 'Battle Card', colorClass: 'text-red-400',
  icon: <Swords className="w-6 h-6" />,
  description: 'Matriz competitiva, gaps, SWOT e posicionamento contra concorrentes.',
  requiredKey: 'product', requiredError: 'Informe o produto.',
  personaTag: 'copy',
  sessionId: 'battlecard',
  generate: (params, onChunk) => generateBattleCardService(params, onChunk),
  fields: [
    { key: 'product', label: 'Nosso Produto *', placeholder: 'SaaS de...', required: true },
    { key: 'competitors', label: 'Concorrentes', placeholder: 'Concorrente A, B...' },
    { key: 'differential', label: 'Diferencial', placeholder: 'O que nos faz únicos...' },
    { key: 'focus', label: 'Foco', type: 'select', options: ['all', 'price', 'features', 'ux', 'support'] },
  ],
};

export default function BattleCardStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
