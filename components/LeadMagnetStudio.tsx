import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { Magnet } from 'lucide-react';
import { generateLeadMagnetService } from '../services/modules/growth/leadMagnet';

const config: BridgeConfig = {
  id: 'leadMagnet', title: 'Lead Magnet Builder', colorClass: 'text-indigo-400',
  icon: <Magnet className="w-6 h-6" />,
  description: 'Estrutura, copy de landing e follow-up para lead magnets de alta conversão.',
  requiredKey: 'niche', requiredError: 'Informe o nicho.',
  personaTag: 'copy',
  sessionId: 'leadmagnet',
  generate: (params, onChunk) => generateLeadMagnetService(params, onChunk),
  fields: [
    { key: 'niche', label: 'Nicho *', placeholder: 'Estética premium, estética...', required: true },
    { key: 'pain', label: 'Dor Principal', placeholder: 'Qual problema resolve...' },
    { key: 'format', label: 'Formato', type: 'select', options: ['Automático', 'E-book', 'Checklist', 'Quiz', 'Template', 'Webinar', 'Free tool'] },
  ],
};

export default function LeadMagnetStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
