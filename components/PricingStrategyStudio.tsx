import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { DollarSign } from 'lucide-react';
import { generatePricingService } from '../services/modules/revops/pricing';

const config: BridgeConfig = {
  id: 'pricing', title: 'Pricing Strategy', colorClass: 'text-amber-400',
  icon: <DollarSign className="w-6 h-6" />,
  description: 'Estratégia de precificação em 3 tiers com âncora e justificativa.',
  requiredKey: 'product', requiredError: 'Informe o produto.',
  personaTag: 'copy',
  sessionId: 'pricing',
  generate: (params, onChunk) => generatePricingService(params, onChunk),
  fields: [
    { key: 'product', label: 'Produto *', placeholder: 'SaaS de automação...', required: true },
    { key: 'costs', label: 'Custos', placeholder: 'Infra, equipe, CAC...' },
    { key: 'competitor', label: 'Concorrentes', placeholder: 'Concorrentes diretos...' },
    { key: 'willingnessToPay', label: 'Willingness to Pay', placeholder: 'Pesquisa, concorrentes...' },
    { key: 'model', label: 'Modelo', type: 'select', options: ['Automático', 'Value-based', 'Cost-plus', 'Competitive', 'Freemium', 'Usage-based', 'Tiered'] },
  ],
};

export default function PricingStrategyStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
