
import React from 'react';
import { Download, Maximize2, RefreshCw, ImageIcon, AlertCircle } from 'lucide-react';

interface VisualPreviewProps {
  imageUrl?: string;
  loading: boolean;
  error?: string | null;
  onRetry: () => void;
  title: string;
}

export const VisualPreview: React.FC<VisualPreviewProps> = ({ imageUrl, loading, error, onRetry, title }) => {
  if (!imageUrl && !loading && !error) return null;

  return (
    <div className="mt-6 border border-slate-800 rounded-xl overflow-hidden bg-slate-900/50 shadow-inner">
      <div className="p-3 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <ImageIcon className="w-3 h-3" /> Visual Draft (AI Generated)
        </span>
        {imageUrl && !loading && (
          <div className="flex gap-2">
            <button onClick={() => window.open(imageUrl)} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors" title="Expandir">
                <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <a href={imageUrl} download={`${title.replace(/\s+/g, '_')}_preview.png`} className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors" title="Download">
                <Download className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>
      
      <div className="relative aspect-square md:aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-indigo-400">
            <RefreshCw className="w-8 h-8 animate-spin" />
            <span className="text-xs font-medium animate-pulse">Renderizando rascunho...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 text-red-400 p-6 text-center">
            <AlertCircle className="w-8 h-8" />
            <p className="text-xs">{error}</p>
            <button onClick={onRetry} className="text-[10px] underline hover:text-white">Tentar Novamente</button>
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-contain animate-in fade-in duration-700" />
        ) : null}
      </div>
    </div>
  );
};
