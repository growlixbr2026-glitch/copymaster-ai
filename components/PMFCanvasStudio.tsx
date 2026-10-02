import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { Map } from 'lucide-react';
import { generatePMFService } from '../services/modules/growth/pmf';

const config: BridgeConfig = {
  id: 'pmf', title: 'PMF Canvas', colorClass: 'text-emerald-500',
  icon: <Map className="w-6 h-6" />,
  description: 'Validação de PMF com sinais Sean Ellis, experimentos e riscos.',
  requiredKey: 'product', requiredError: 'Informe o produto.',
  personaTag: 'landing',
  sessionId: 'pmf',
  generate: (params, onChunk) => generatePMFService(params, onChunk),
  fields: [
    { key: 'product', label: 'Produto *', placeholder: 'O que estamos validando...', required: true },
    { key: 'segment', label: 'Segmento', placeholder: 'Para quem...' },
    { key: 'pain', label: 'Dor Principal', placeholder: 'Do que o mercado se queixa...' },
    { key: 'alternative', label: 'Alternativa Atual', placeholder: 'O que usam hoje...' },
  ],
};

export default function PMFCanvasStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
