import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';

interface MusicTabProps {
  language: string;
  musParams: {
    mode: string;
    style: string;
    mood: string;
  };
  setMusParams: React.Dispatch<React.SetStateAction<{
    mode: string;
    style: string;
    mood: string;
  }>>;
  sunoStyles: string[];
  sunoMoods: string[];
}

export const MusicTab: React.FC<MusicTabProps> = ({
  language,
  musParams,
  setMusParams,
  sunoStyles,
  sunoMoods,
}) => {
  const { t } = useTranslation(language);

  return (
    <div className="grid grid-cols-2 gap-4 mb-4 animate-in fade-in slide-in-from-top-1">
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Gênero</label>
        <select
          aria-label="Gênero"
          className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-purple-500"
          value={musParams.style}
          onChange={e => setMusParams({ ...musParams, style: e.target.value })}
        >
          {sunoStyles.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Mood</label>
        <select
          aria-label="Mood"
          className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-purple-500"
          value={musParams.mood}
          onChange={e => setMusParams({ ...musParams, mood: e.target.value })}
        >
          {sunoMoods.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </div>
  );
};