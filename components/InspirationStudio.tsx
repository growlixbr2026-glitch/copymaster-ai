import React, { useState, useEffect } from 'react';
// Added RefreshCw to icons import
import { Sparkles, Wand2, Link2, Copy, Download, Quote, Search, Filter, Palette, Layers, Monitor, LayoutGrid, Type, ImageIcon, AtSign, CheckCircle2, BookOpen, Home, Brain, Droplets, Grid3X3, RefreshCw } from 'lucide-react';
import { getLocalizedLists, IMAGE_AIS } from '../constants';
import { generateInspirationService } from '../services/geminiService';
import { verifyCitationService, CitationCheck } from '../services/modules/social/citationVerify';
import { downloadPDF } from '../services/pdfService';
import { useTranslation } from '../hooks/useTranslation';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { ToolLayout } from './ToolLayout';
import { EngineLink } from './ToolLayout';
import { useAIGenerator } from '../hooks/useAIGenerator';
import TextToSpeech from './TextToSpeech';
import { SectionHelp } from './SectionHelp';
import { splitVisualResult, stripVisualPrompt, splitOptions } from '../utils/stripCopyFormat';

interface InspirationStudioProps {
  language: string;
}

const InspirationStudio: React.FC<InspirationStudioProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  
  const [results, setResults] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [checks, setChecks] = useState<Record<number, CitationCheck>>({});
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  
  const [isLocked, setIsLocked] = useState(false);
  const { t, langCode } = useTranslation(language);
  
  const { inspirationCategories, quoteStyles, socialPlatforms, postTypes, videoRatios, visualColors, visualTextures } = getLocalizedLists(langCode);

  const [localContext, setLocalContext] = useState('');

  const [category, setCategory] = useState(inspirationCategories[0].id);
  const [subCategory, setSubCategory] = useState(inspirationCategories[0].subTypes[0]);
  const [platform, setPlatform] = useState(socialPlatforms[0]);
  const [quantity, setQuantity] = useState(3);
  const [aiModel, setAiModel] = useState(IMAGE_AIS[0]);
  const [aspectRatio, setAspectRatio] = useState(videoRatios[0]);
  const [footer, setFooter] = useState('');

  const [visualStyle, setVisualStyle] = useState(quoteStyles[0]);
  const [bgColor, setBgColor] = useState(visualColors[0]);
  const [fontColor, setFontColor] = useState(visualColors[1]); // Geralmente branco por padrão
  const [texture, setTexture] = useState(visualTextures[0]);

  const currentCategory = inspirationCategories.find(c => c.id === category) || inspirationCategories[0];
  
  useEffect(() => {
      setSubCategory(currentCategory.subTypes[0]);
  }, [category, currentCategory]);

  const inspirationHelpDescription = `
O que é o Estúdio de Inspiração & Sabedoria:
Esta ferramenta busca citações reais de grandes nomes da história, textos bíblicos e obras clássicas, unindo-as a uma direção de arte específica para gerar autoridade moral instantânea.
`;

  const handleImportGlobal = () => {
    setLocalContext(sharedContext);
  };

  // Extrai {quote, author} de cada opção p/ o juiz (1ª frase entre aspas +
  // nome após —/–; sem extração, a opção fica sem selo em vez de selo falso).
  const extractCandidate = (opt: string): { quote: string; author: string } | null => {
    const q = opt.match(/["“]([^"”]{20,400})["”]/);
    if (!q) return null;
    const after = opt.slice((q.index || 0) + q[0].length);
    const a = after.match(/[—–\-]\s*([A-ZÀ-Ú][^,\n]{2,60})/);
    return { quote: q[1].trim(), author: (a ? a[1] : '').trim() };
  };

  const sealColor = (v?: string) =>
    v === 'CONFIRMADA' ? 'bg-emerald-500' : v === 'FALSA' ? 'bg-red-500' : v ? 'bg-amber-500' : 'bg-slate-600';

  const handleVerify = async () => {
    if (!results.length || verifying) return;
    setVerifying(true);
    setVerifyMsg(null);
    try {
      const cands = results.map((r, i) => {
        const c = extractCandidate(r);
        return { idx: i, quote: c?.quote || '', author: c?.author || '', work: subCategory };
      }).filter((c) => c.quote);
      if (!cands.length) {
        setVerifyMsg('Formato não extraível — confira as citações antes de publicar.');
        return;
      }
      const { fuzzyAuthorMatch } = await import('../services/modules/social/citationVerify');
      const verdicts = await verifyCitationService(cands.map(({ quote, author, work }) => ({ quote, author, work })), language);
      const map: Record<number, CitationCheck> = {};
      verdicts.forEach((v, k) => {
        const c = cands[k];
        // Pré-sinal custo-0: autor nem mencionado → DUVIDOSA imediata.
        if (v.verdict === 'CONFIRMADA' && !fuzzyAuthorMatch(c.quote, c.author)) {
          map[c.idx] = { ...v, verdict: 'DUVIDOSA', note: 'Autor não mencionado na frase — conferir antes de publicar.' };
        } else {
          map[c.idx] = v;
        }
      });
      setChecks(map);
    } finally {
      setVerifying(false);
    }
  };

  const handleGenerate = async () => {
    if (!localContext) return;
    setResults([]); setNote(''); setActiveResultIndex(0); setChecks({}); setVerifyMsg(null);

    generateStream(
        (onChunk) => generateInspirationService({ 
            category, subCategory, visualStyle, 
            platform, format: postTypes[0], quantity, aiModel, aspectRatio, footer,
            bgColor, fontColor, texture,
            context: localContext, language 
        }, onChunk),
        (streamedText) => {
            const { content: mainContent, note: streamNote } = splitVisualResult(streamedText);
            setNote(streamNote);
            const separator = "|||INSP_DIVIDER|||";
            const options = splitOptions(mainContent, separator, 3);
            if (options.length > 0) setResults(options);
            else setResults([mainContent]);
        }
    );
  };

  const sidebarContent = (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-yellow-900/30 rounded-lg p-3 space-y-3">
          <label className="text-xs font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-2"><BookOpen className="w-3 h-3"/> Fonte da Inspiração</label>
          <div>
              <label className="text-xs text-slate-400 block mb-1">{t('insp_category')}</label>
              <select aria-label={t('insp_category')} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-200 text-xs focus:ring-1 focus:ring-yellow-500 outline-none" value={category} onChange={(e) => setCategory(e.target.value)} disabled={loading || isLocked}>
                  {inspirationCategories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
          </div>
          <div>
              <label className="text-xs text-slate-400 block mb-1 flex items-center gap-1"><Filter className="w-3 h-3"/> Filtro Específico</label>
              <select aria-label="Filtro Específico" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-200 text-xs focus:ring-1 focus:ring-yellow-500 outline-none" value={subCategory} onChange={(e) => setSubCategory(e.target.value)} disabled={loading || isLocked}>
                  {currentCategory.subTypes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
          </div>
      </div>
      
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2"><Palette className="w-4 h-4"/> Direção de Arte</div>
          
          <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">IA Modelo</label><select aria-label="IA Modelo" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={aiModel} onChange={(e) => setAiModel(e.target.value)} disabled={isLocked}>{IMAGE_AIS.map(i => (<option key={i} value={i}>{i}</option>))}</select><EngineLink engine={aiModel} /></div>
              <div><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Proporção</label><select aria-label="Proporção" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-200 text-[10px] outline-none" value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} disabled={isLocked}>{videoRatios.map(r => (<option key={r} value={r}>{r}</option>))}</select></div>
          </div>

              <div><label className="text-[10px] text-slate-400 block mb-1">{t('insp_style')}</label><select aria-label="Estilo Visual" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-slate-200 text-xs outline-none" value={visualStyle} onChange={(e) => setVisualStyle(e.target.value)} disabled={isLocked}>{quoteStyles.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
          
          <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] text-slate-400 block mb-1 flex items-center gap-1"><Droplets className="w-2.5 h-2.5"/> Cor Fundo</label><select aria-label="Cor Fundo" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-slate-200 text-[10px] outline-none" value={bgColor} onChange={(e) => setBgColor(e.target.value)} disabled={isLocked}>{visualColors.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-[10px] text-slate-400 block mb-1 flex items-center gap-1"><Type className="w-2.5 h-2.5"/> Cor Fonte</label><select aria-label="Cor Fonte" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-slate-200 text-[10px] outline-none" value={fontColor} onChange={(e) => setFontColor(e.target.value)} disabled={isLocked}>{visualColors.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
          </div>
          
          <div><label className="text-[10px] text-slate-400 block mb-1 flex items-center gap-1"><Grid3X3 className="w-2.5 h-2.5"/> Textura / Mood</label><select aria-label="Textura / Mood" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-slate-200 text-xs outline-none" value={texture} onChange={(e) => setTexture(e.target.value)} disabled={isLocked}>{visualTextures.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          
          <div><label className="text-[10px] text-slate-400 block mb-1 flex items-center gap-1"><AtSign className="w-2.5 h-2.5"/> Rodapé (Créditos)</label><input aria-label="Ex: @seunome" type="text" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-slate-200 text-[10px] outline-none" placeholder="Ex: @seunome" value={footer} onChange={(e) => setFooter(e.target.value)} disabled={isLocked} /></div>
      </div>

      <div className="relative">
          <div className="absolute right-2 top-8 z-10 flex gap-2">
            {sharedContext && (
                <button onClick={handleImportGlobal} className="p-2 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                    <Brain className="w-4 h-4" />
                </button>
            )}
            {!isLocked && <SpeechInput onTranscript={(t) => setLocalContext(prev => prev + ' ' + t)} language={language} />}
          </div>
          <div className="flex justify-between items-center mt-1 mb-2"><label className="text-sm font-bold text-slate-300 block flex items-center gap-2"><Search className="w-3 h-3 text-yellow-400"/> {t('insp_topic')}</label></div>
        <textarea aria-label={t('placeholder_context')} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-yellow-500 outline-none text-sm text-slate-200 pr-10" placeholder={t('placeholder_context')} value={localContext} onChange={(e) => setLocalContext(e.target.value)} disabled={loading || isLocked}></textarea>
      </div>
    </div>
  );

  return (
    <ToolLayout title={t('insp_title')} icon={Sparkles} iconColorClass="text-yellow-400" description={inspirationHelpDescription} loading={loading} error={error} isLocked={isLocked} onToggleLock={() => setIsLocked(!isLocked)} outputKind="image" sidebarContent={sidebarContent} actions={(<button onClick={handleGenerate} disabled={loading || !localContext || isLocked} className="w-full bg-yellow-600 hover:bg-yellow-400 text-slate-900 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg text-base">{loading ? <Wand2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />} {loading ? 'Inspirando...' : t('insp_btn')}</button>)} mainContent={(
      <>
        {results.length > 0 ? (
            <>
              <div className="flex items-center justify-between px-2 pt-2">
                <button onClick={handleVerify} disabled={verifying || loading} className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500 hover:text-slate-950 transition-all disabled:opacity-50 flex items-center gap-1">
                  {verifying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} {verifying ? 'Verificando...' : 'Verificar citações'}
                </button>
                {checks[activeResultIndex] ? (
                  <span title={`${checks[activeResultIndex].evidence || ''} ${checks[activeResultIndex].note || ''}`} className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg text-white flex items-center gap-1 ${checks[activeResultIndex].verdict === 'CONFIRMADA' ? 'bg-emerald-600' : checks[activeResultIndex].verdict === 'FALSA' ? 'bg-red-600' : 'bg-amber-600'}`}>
                    {checks[activeResultIndex].verdict === 'CONFIRMADA' ? 'Verificada' : checks[activeResultIndex].verdict === 'FALSA' ? 'Falsa — não publique' : 'Não verificada'}
                  </span>
                ) : (
                  <span title="Citação ainda não passou pelo juiz — clique Verificar citações" className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 flex items-center gap-1">
                    Não verificada
                  </span>
                )}
                {verifyMsg && <span className="text-[10px] text-amber-300 italic">{verifyMsg}</span>}
              </div>
              <div role="tablist" className="flex border-b border-slate-800 bg-slate-900/50 overflow-x-auto no-scrollbar rounded-t-xl sticky top-0 z-10 px-2 pt-2 gap-2">{results.map((_, index) => (<button key={index} onClick={() => setActiveResultIndex(index)} className={`px-5 py-3 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap flex items-center gap-2 ${activeResultIndex === index ? 'bg-yellow-500 text-slate-900 shadow-lg translate-y-[1px]' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}><span className={`w-2 h-2 rounded-full ${sealColor(checks[index]?.verdict)}`} />{t('lbl_option')} {index + 1}</button>))}</div>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6 lg:p-10"><div className="whitespace-pre-wrap font-sans text-base lg:text-lg text-slate-300 leading-relaxed">{results[activeResultIndex]}</div>{loading && activeResultIndex === results.length - 1 && <span className="inline-block w-2 h-4 bg-yellow-500 animate-pulse ml-1 align-middle"></span>}{note && (<div className="mt-8 p-4 bg-slate-900 border-l-4 border-yellow-400 rounded-r-lg shadow-xl animate-in fade-in"><h4 className="text-[10px] font-black text-yellow-500 flex items-center gap-2 mb-2 uppercase tracking-widest"><Wand2 className="w-4 h-4" /> Nota do Estrategista</h4><p className="text-slate-300 italic text-sm whitespace-pre-wrap font-medium">{note}</p></div>)}</div>
              <div className="p-4 border-t border-slate-800 bg-slate-900/50 rounded-b-xl flex gap-2"><TextToSpeech text={results[activeResultIndex]} language={language} className="flex-1" /><button onClick={() => downloadPDF(`Inspiration_${activeResultIndex}`, results[activeResultIndex])} className="flex-1 bg-slate-800 py-3 rounded-lg text-sm font-bold text-slate-200">PDF</button><button onClick={() => navigator.clipboard.writeText(results[activeResultIndex])} className="flex-1 bg-yellow-600 py-3 rounded-lg text-sm font-bold text-slate-900">Copiar</button></div>
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 p-6">{loading ? <RefreshCw className="w-16 h-16 mb-4 animate-spin text-yellow-500" /> : <Quote className="w-16 h-16 mb-4 opacity-20" />}<p className="text-center text-slate-400">{loading ? 'Engenhando Inspiração...' : t('msg_wait_desc')}</p></div>
        )}
      </>
  )} hasResults={results.length > 0} sessionId="inspiration" />
  );
};

export default InspirationStudio;