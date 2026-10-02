import React from 'react';
import { TTS_PLATFORMS, TTS_DURATION_OPTIONS, getVoicesFor, estimateWordsForDuration } from '../../data/tts';
import { useTranslation } from '../../hooks/useTranslation';

interface AudioTabProps {
  language: string;
  audParams: {
    provider: string;
    voice: string;
    model: string;
    duration: number;
  };
  setAudParams: React.Dispatch<React.SetStateAction<{
    provider: string;
    voice: string;
    model: string;
    duration: number;
  }>>;
  audPlatform: {
    id: string;
    label: string;
    models: Array<{ id: string; label: string }>;
    voices: Array<{ id: string; label: string; models?: string[] }>;
  };
  audVoices: Array<{ id: string; label: string }>;
  audWords: number;
  handleAudProvider: (id: string) => void;
  handleAudModel: (id: string) => void;
}

export const AudioTab: React.FC<AudioTabProps> = ({
  language,
  audParams,
  setAudParams,
  audPlatform,
  audVoices,
  audWords,
  handleAudProvider,
  handleAudModel,
}) => {
  const { t } = useTranslation(language);

  return (
    <div className="space-y-4 mb-4 animate-in fade-in slide-in-from-top-1">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Provedor</label>
          <select
            aria-label="Provedor"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-emerald-500"
            value={audParams.provider}
            onChange={e => handleAudProvider(e.target.value)}
          >
            {TTS_PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Voz</label>
          <select
            aria-label="Voz"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-emerald-500"
            value={audParams.voice}
            onChange={e => setAudParams({ ...audParams, voice: e.target.value })}
          >
            {audVoices.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Modelo</label>
          <select
            aria-label="Modelo"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-emerald-500"
            value={audParams.model}
            onChange={e => handleAudModel(e.target.value)}
          >
            {audPlatform.models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Duração</label>
          <select
            aria-label="Duração"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-emerald-500"
            value={audParams.duration}
            onChange={e => setAudParams({ ...audParams, duration: parseInt(e.target.value) })}
          >
            {TTS_DURATION_OPTIONS.map(s => <option key={s} value={s}>{s} segundos</option>)}
          </select>
        </div>
      </div>
      <p className="text-[10px] text-emerald-400/90 ml-1 -mt-1">
        ⏱ Roteiro de <strong>{audParams.duration}s ≈ {audWords} palavras</strong> (ritmo natural PT-BR ≈ 156 ppm) — a meta sai no prompt gerado.
      </p>
    </div>
  );
};