import React from 'react';
import BridgeStudio, { BridgeConfig } from './BridgeStudio';
import { RefreshCw } from 'lucide-react';
import { generateFlywheelService } from '../services/modules/growth/flywheel';

const config: BridgeConfig = {
  id: 'flywheel', title: 'Growth Flywheel', colorClass: 'text-blue-500',
  icon: <RefreshCw className="w-6 h-6" />,
  description: 'Design de growth flywheel com loops de aquisição, ativação e retenção.',
  requiredKey: 'niche', requiredError: 'Informe o nicho.',
  personaTag: 'copy',
  sessionId: 'flywheel',
  generate: (params, onChunk) => generateFlywheelService(params, onChunk),
  fields: [
    { key: 'niche', label: 'Nicho *', placeholder: 'Estética para PMEs...', required: true },
    { key: 'model', label: 'Modelo', type: 'select', options: ['Automático', 'PLG', 'SLG', 'CLG', 'Híbrido'] },
    { key: 'primaryChannel', label: 'Canal Principal', placeholder: 'Email, ads, comunidade...' },
    { key: 'target', label: 'Meta', placeholder: '100 leads/mês...' },
  ],
};

export default function GrowthFlywheelStudio({ language }: { language: string }) {
  return <BridgeStudio language={language} config={config} />;
}
