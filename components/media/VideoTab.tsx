import React from 'react';
import { VIDEO_AIS } from '../../constants';
import { useTranslation } from '../../hooks/useTranslation';

interface VideoTabProps {
  language: string;
  vidParams: {
    ai: string;
    duration: string;
    ratio: string;
    style: string;
    sceneCount: number;
    text: string;
    platform: string;
  };
  setVidParams: React.Dispatch<React.SetStateAction<{
    ai: string;
    duration: string;
    ratio: string;
    style: string;
    sceneCount: number;
    text: string;
    platform: string;
  }>>;
  socialPlatforms: string[];
  videoRatios: string[];
  videoStyles: string[];
}

export const VideoTab: React.FC<VideoTabProps> = ({
  language,
  vidParams,
  setVidParams,
  socialPlatforms,
  videoRatios,
  videoStyles,
}) => {
  const { t } = useTranslation(language);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Motor Vídeo</label>
          <select
            aria-label="Motor Vídeo"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-blue-500"
            value={vidParams.ai}
            onChange={e => setVidParams({ ...vidParams, ai: e.target.value })}
          >
            {VIDEO_AIS.map(ai => <option key={ai} value={ai}>{ai}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Rede Social</label>
          <select
            aria-label="Rede Social"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-blue-500"
            value={vidParams.platform}
            onChange={e => setVidParams({ ...vidParams, platform: e.target.value })}
          >
            {socialPlatforms.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Proporção</label>
          <select
            aria-label="Proporção"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-blue-500"
            value={vidParams.ratio}
            onChange={e => setVidParams({ ...vidParams, ratio: e.target.value })}
          >
            {videoRatios.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Duração</label>
          <select
            aria-label="Duração"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-blue-500"
            value={vidParams.duration}
            onChange={e => setVidParams({ ...vidParams, duration: e.target.value })}
          >
            <option value="5s">5 Segundos</option>
            <option value="10s">10 Segundos</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Cenas</label>
          <select
            aria-label="Cenas"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-blue-500"
            value={vidParams.sceneCount}
            onChange={e => setVidParams({ ...vidParams, sceneCount: parseInt(e.target.value) })}
          >
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} Cena(s)</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Estética</label>
        <select
          aria-label="Estética"
          className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-blue-500"
          value={vidParams.style}
          onChange={e => setVidParams({ ...vidParams, style: e.target.value })}
        >
          {videoStyles.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
};