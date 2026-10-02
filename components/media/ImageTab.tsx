import React from 'react';
import { IMAGE_AIS } from '../../constants';
import { EngineLink } from '../ToolLayout';
import { useTranslation } from '../../hooks/useTranslation';
import { Type, Layers } from 'lucide-react';

interface ImageTabProps {
  language: string;
  imgParams: {
    ai: string;
    style: string;
    ratio: string;
    text: string;
    footer: string;
    platform: string;
  };
  setImgParams: React.Dispatch<React.SetStateAction<{
    ai: string;
    style: string;
    ratio: string;
    text: string;
    footer: string;
    platform: string;
  }>>;
  socialPlatforms: string[];
  imageStyles: string[];
  videoRatios: string[];
}

export const ImageTab: React.FC<ImageTabProps> = ({
  language,
  imgParams,
  setImgParams,
  socialPlatforms,
  imageStyles,
  videoRatios,
}) => {
  const { t } = useTranslation(language);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Modelo IA</label>
          <select
            aria-label="Modelo IA"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-pink-500"
            value={imgParams.ai}
            onChange={e => setImgParams({ ...imgParams, ai: e.target.value })}
          >
            {IMAGE_AIS.map(ai => <option key={ai} value={ai}>{ai}</option>)}
          </select>
          <EngineLink engine={imgParams.ai} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Rede Social / Destino</label>
          <select
            aria-label="Rede Social / Destino"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-pink-500"
            value={imgParams.platform}
            onChange={e => setImgParams({ ...imgParams, platform: e.target.value })}
          >
            {socialPlatforms.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Estética</label>
          <select
            aria-label="Estética"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-pink-500"
            value={imgParams.style}
            onChange={e => setImgParams({ ...imgParams, style: e.target.value })}
          >
            {imageStyles.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Proporção</label>
          <select
            aria-label="Proporção"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-pink-500"
            value={imgParams.ratio}
            onChange={e => setImgParams({ ...imgParams, ratio: e.target.value })}
          >
            {videoRatios.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1 flex items-center gap-1">
            <Type className="w-3 h-3" /> Texto na Imagem
          </label>
          <input
            aria-label="Texto na Imagem"
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-pink-500"
            placeholder="Ex: NOME DA MARCA"
            value={imgParams.text}
            onChange={e => setImgParams({ ...imgParams, text: e.target.value })}
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1 flex items-center gap-1">
            <Layers className="w-3 h-3" /> Rodapé / Data
          </label>
          <input
            aria-label="Ex: JAN 2025"
            type="text"
            className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white outline-none focus:border-pink-500"
            placeholder="Ex: JAN 2025"
            value={imgParams.footer}
            onChange={e => setImgParams({ ...imgParams, footer: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
};