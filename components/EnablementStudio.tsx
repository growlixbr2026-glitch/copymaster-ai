import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { FileText } from 'lucide-react';
import { generateEnablementService } from '../services/modules/sales/enablement';

const config: BridgeConfig = {
  id: 'enablement', title: 'Sales Enablement Kit', colorClass: 'text-violet-400',
  icon: <FileText className="w-6 h-6" />,
  description: 'One-pager, talk track e tratamento de objeções para o time comercial.',
  requiredKey: 'product', requiredError: 'Informe o produto.',
  personaTag: 'landing',
  sessionId: 'enablement',
  generate: (params, onChunk) => generateEnablementService(params, onChunk),
  fields: [
    { key: 'product', label: 'Produto *', placeholder: 'O que vendemos...', required: true },
    { key: 'objections', label: 'Top 3 Objeções', placeholder: 'Preço, timing...' },
    { key: 'buyerPersona', label: 'Persona Compradora', placeholder: 'CFO de PME...' },
    { key: 'offer', label: 'Oferta', placeholder: 'Trial de 14 dias...' },
  ],
};

export default function EnablementStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
