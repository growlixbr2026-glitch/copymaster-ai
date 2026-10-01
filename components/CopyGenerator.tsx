import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layers, Copy, RefreshCw, BrainCircuit, ImagePlus, FileSearch, Wand2, Zap, Home, Lock, Unlock, X, CheckCircle2, Eraser, Edit3, ShieldCheck, Brain } from 'lucide-react';
import { getLocalizedLists } from '../constants';
import { generateCopyService, generateCorrectionService } from '../services/modules/copy/general'; 
import { analyzeImageContextService, analyzePdfContextService } from '../services/modules/visual/analysis';
import { getActivePersona, personaToContext } from '../services/personaService';
import { useTranslation } from '../hooks/useTranslation';
import { useSharedContext } from '../contexts/SharedContext';
import { useAIGenerator } from '../hooks/useAIGenerator';
import SpeechInput from './SpeechInput';
import { resizeImage } from '../utils/imageUtils';
import { PostType, FunnelStage, CopyParams } from '../types';
import { RefinementToolbar } from './RefinementToolbar';
import { toFriendlyError } from '../services/friendlyErrors';
import { SectionHelp } from './SectionHelp';
import { OutputKindBadge } from './ToolLayout';
import { stripCopyMarkdown, splitCopyVariants } from '../utils/stripCopyFormat';

const forceCleanText = (text: string) => stripCopyMarkdown(text);

export default function CopyGenerator({ language }: { language: string }) {
  const { sharedContext, setActiveTab: setAppActiveTab, activeTab: appActiveTab } = useSharedContext();
  const { t, langCode } = useTranslation(language);
  const { socialPlatforms, postTypes, funnelStages, methodologies, tones, triggers } = getLocalizedLists(langCode);
  
  const { loading, error, generateStream, setError } = useAIGenerator();

  const [generatedCopies, setGeneratedCopies] = useState<{copy: string, note: string | null}[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  
  const [params, setParams] = useState({
    platform: socialPlatforms[0], 
    type: postTypes[0], 
    funnelStage: funnelStages[0],
    methodology: methodologies[0], 
    tones: [] as string[], 
    mentalTriggers: [] as string[],
    objective: '', 
    targetLength: '' as string | number, 
    briefingType: 'ideia' as 'ideia' | 'referencia' | 'imagem' | 'pdf'
  });
  
  // ESTADO LOCAL ISOLADO (não espelha digitação no sharedContext).
  // Exceção: "Desenvolver no Editor" importa 1× ao chegar (briefing vazio +
  // contexto fresco) — o clique já É o import explícito; nunca sobrescreve
  // texto digitado nem reimporta ao trocar de aba.
  const [simpleInput, setSimpleInput] = useState('');
  const [referenceInput, setReferenceInput] = useState('');
  const lastConsumedCtx = useRef('');

  useEffect(() => {
    if (appActiveTab === 'copy' && sharedContext && sharedContext !== lastConsumedCtx.current && !simpleInput && !referenceInput) {
      if (params.briefingType === 'referencia') setReferenceInput(sharedContext);
      else setSimpleInput(sharedContext);
      lastConsumedCtx.current = sharedContext;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appActiveTab]);

  const copyHelpDescription = `
O que é o Copywriting de Elite (V22):
Esta é a sua Central de Comando de Conversão. O sistema utiliza o motor Gemini 3 Pro treinado em neuromarketing para gerar textos que quebram a resistência do subconsciente.

Funcionalidades de Elite:
- EXECUTAR COMANDO: Gera copys originais baseadas no framework escolhido.
- EDITOR SÊNIOR: Use para corrigir ortografia e gramática de um texto já pronto sem mudar o estilo.
- GATILHOS MENTAIS: Injeção de armas psicológicas no texto.
- MODELAGEM: Use para clonar o estilo de uma referência vencedora.
- IMAGEM/PDF: Analise ativos antes de gerar sua copy.
`;

  // Função para importar do cérebro global
  const handleImportGlobal = () => {
    if (params.briefingType === 'referencia') setReferenceInput(sharedContext);
    else setSimpleInput(sharedContext);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'imagem' | 'pdf') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setAnalyzingFile(true);
    try {
        let analysis = "";
        if (type === 'imagem') {
            const base64 = await resizeImage(file, 1024);
            const res = await analyzeImageContextService(base64, language);
            if (res.error) throw new Error(res.error);
            analysis = res.text;
        } else {
            const reader = new FileReader();
            const base64: string = await new Promise((res) => {
                reader.onload = () => res(reader.result as string);
                reader.readAsDataURL(file);
            });
            const res = await analyzePdfContextService(base64, language);
            if (res.error) throw new Error(res.error);
            analysis = res.text;
        }
        // Só o conteúdo factual entra no briefing (nota isolada não vaza p/ o prompt).
        const facts = (analysis || '').split("|||NOTA_DIVIDER|||")[0].trim();
        if (!facts) {
            setFileName(null);
            setError(toFriendlyError("A análise do arquivo veio vazia. Tente outro arquivo ou descreva o briefing manualmente."));
            return;
        }
        setSimpleInput(facts);
    } catch (err: any) {
        setFileName(null);
        setError(toFriendlyError("Erro ao analisar arquivo: " + (err?.message || err)));
    } finally {
        setAnalyzingFile(false);
    }
  };

  // Extrai variações REAIS em texto puro copia-cola (sem Markdown, sem
  // divisores vazados, tolerante a |||DIVIDER||| quebrado em linhas).
  // Nota do estrategista sozinha NÃO conta como resultado — evita "sucesso vazio".
  const extractCopies = (streamedText: string): string[] =>
    splitCopyVariants(streamedText, '|||DIVIDER|||');

  const processResponse = (streamedText: string) => {
        if (!streamedText) return;
        const noteParts = streamedText.split("|||NOTA_DIVIDER|||");
        const globalNote = noteParts[1] ? noteParts[1].replace(/NOTA DO ESTRATEGISTA:[\s]*/i, '').trim() : '';
        const copies = extractCopies(streamedText);
        if (copies.length === 0) copies.push('');
        setGeneratedCopies(copies.map(c => ({ copy: forceCleanText(c), note: globalNote })));
  };

  const handleGenerate = () => {
    const activePersona = getActivePersona();
    const personaContext = activePersona ? `${personaToContext(activePersona)}\n\n---\n\n` : '';
    const userInput = params.briefingType === 'referencia' ? referenceInput : simpleInput;
    const content = personaContext + userInput;

    setGeneratedCopies([{ copy: '', note: '' }]); 
    setActiveTab(0);
    setShowNoteModal(false);

    generateStream(
      (onChunk) => generateCopyService({
        ...params,
        type: params.type as PostType,
        funnelStage: params.funnelStage as FunnelStage,
        briefingType: params.briefingType as CopyParams['briefingType'],
        briefingContent: content,
        language,
        targetLength: Number(params.targetLength),
      }, onChunk),
      processResponse,
      (finalText) => {
        // Validação final: sem VARIAÇÃO real (só vazio/divisores/nota) = falha — nunca silenciar.
        if (extractCopies(finalText || '').length === 0) {
          setGeneratedCopies([]);
          setError('O modelo retornou uma resposta sem conteúdo (instabilidade momentânea do plano gratuito). Clique em Executar Comando novamente.');
        }
      }
    );
  };

  const handleCorrection = () => {
    const userInput = params.briefingType === 'referencia' ? referenceInput : simpleInput;
    if (!userInput) return alert("Insira o texto para correção.");

    setGeneratedCopies([{ copy: '', note: '' }]); 
    setActiveTab(0);
    setShowNoteModal(false);

    generateStream(
        (onChunk) => generateCorrectionService({ briefingContent: userInput, language }, onChunk),
        processResponse
    );
  };

  const toggleArrayItem = (key: 'tones' | 'mentalTriggers', val: string) => {
    if(isLocked) return;
    setParams(p => ({ ...p, [key]: p[key].includes(val) ? p[key].filter(i => i !== val) : [...p[key], val] }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-y-auto custom-scrollbar">
      {/* PAINEL DE COMANDO (ESQUERDA) */}
      <div className="lg:col-span-6 flex flex-col h-full">
        <div className={`bg-slate-900 border p-6 rounded-2xl mb-10 flex-shrink-0 transition-all ${isLocked ? 'border-indigo-500/30 bg-slate-900/80 relative' : 'border-slate-800 shadow-2xl'}`}>
          
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black flex items-center gap-2 text-indigo-400 uppercase tracking-tighter">
              <Layers className="w-6 h-6" /> {t('copy_title')}
              <OutputKindBadge kind="text" />
              <SectionHelp title={t('copy_title')} description={copyHelpDescription} />
            </h2>
            <div className="flex items-center gap-2">
                <button onClick={() => setAppActiveTab('home')} title="Voltar para o Início" aria-label="Voltar para o Início" className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-all"><Home className="w-4 h-4" /></button>
                <button onClick={() => setIsLocked(!isLocked)} title={isLocked ? "Desbloquear edição" : "Bloquear edição"} aria-label={isLocked ? "Desbloquear edição" : "Bloquear edição"} className={`p-2 rounded-lg transition-all border ${isLocked ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>{isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}</button>
            </div>
          </div>
          
          <div className={`space-y-6 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Campo de Batalha</label><select aria-label="Campo de Batalha" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-indigo-500" value={params.platform} onChange={e => setParams({...params, platform: e.target.value})}>{socialPlatforms.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Formato de Arma</label><select aria-label="Formato de Arma" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-indigo-500" value={params.type} onChange={e => setParams({...params, type: e.target.value as any})}>{postTypes.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Fase do Ataque</label><select aria-label="Fase do Ataque" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-indigo-500" value={params.funnelStage} onChange={e => setParams({...params, funnelStage: e.target.value as any})}>{funnelStages.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Técnica Persuasiva</label><select aria-label="Técnica Persuasiva" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-indigo-500" value={params.methodology} onChange={e => setParams({...params, methodology: e.target.value})}>{methodologies.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">Tom de Comando</label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto custom-scrollbar p-1 border border-slate-800 rounded-xl bg-slate-950/50">
                  {tones.map(tone => (<button key={tone} onClick={() => toggleArrayItem('tones', tone)} className={`px-2.5 py-1.5 text-[9px] font-bold rounded-lg border transition-all ${params.tones.includes(tone) ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'}`}>{tone}</button>))}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block ml-1">Gatilhos Mentais</label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1 border border-slate-800 rounded-xl bg-slate-950/50">
                  {triggers.map(trigger => (<button key={trigger} onClick={() => toggleArrayItem('mentalTriggers', trigger)} className={`px-2.5 py-1.5 text-[9px] font-bold rounded-lg border transition-all ${params.mentalTriggers.includes(trigger) ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'}`}>{trigger}</button>))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input aria-label="Missão (Objetivo)" type="text" placeholder="Missão (Objetivo)" className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-indigo-500" value={params.objective} onChange={e => setParams({...params, objective: e.target.value})} />
                <input aria-label="Calibre (Tamanho em Chars)" type="number" placeholder="Calibre (Tamanho em Chars)" className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-indigo-500" value={params.targetLength} onChange={e => setParams({...params, targetLength: e.target.value})} />
              </div>

              <div className="flex gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
                 {(['ideia', 'referencia', 'imagem', 'pdf'] as const).map(type => (
                                           <button key={type} onClick={() => setParams({...params, briefingType: type})} className={`flex-1 py-3 px-1 text-[10px] font-black uppercase rounded-lg transition-all ${params.briefingType === type ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-slate-200'}`}> {type === 'ideia' ? 'Conceito' : type === 'referencia' ? 'Modelagem' : type.toUpperCase()} </button>
                 ))}
              </div>
              
              <div className="relative">
                {params.briefingType === 'imagem' || params.briefingType === 'pdf' ? (
                    <div className="h-44 bg-slate-950 border border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center p-6 text-center group hover:border-indigo-500 transition-all">
                        {analyzingFile ? (
                            <div className="flex flex-col items-center gap-3 text-indigo-400"><RefreshCw className="animate-spin w-8 h-8"/><p className="text-xs font-black uppercase tracking-widest">Extraindo Inteligência Contextual...</p></div>
                        ) : (
                            <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center">
                                <input type="file" className="hidden" accept={params.briefingType === 'imagem' ? "image/*" : ".pdf"} onChange={(e) => handleFileUpload(e, params.briefingType as any)} />
                                <div className="flex flex-col items-center gap-3">
                                    {params.briefingType === 'imagem' ? <ImagePlus className="w-10 h-10 text-slate-700 group-hover:text-indigo-400"/> : <FileSearch className="w-10 h-10 text-slate-700 group-hover:text-indigo-400"/>}
                                    <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{fileName ? `Arquivo: ${fileName}` : `Subir ${params.briefingType.toUpperCase()} para Análise Forense`}</div>
                                </div>
                            </label>
                        )}
                    </div>
                ) : (
                    <>
                      <div className="absolute right-3 top-3 z-10 flex gap-2">
                        {sharedContext && (
                            <button onClick={handleImportGlobal} className="p-2 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                                <Brain className="w-4 h-4" />
                            </button>
                        )}
                        <SpeechInput onTranscript={(t) => params.briefingType === 'referencia' ? setReferenceInput(p => p + ' ' + t) : setSimpleInput(p => p + ' ' + t)} language={language} />
                      </div>
                      <textarea aria-label="Briefing: ideia ou referência" className="w-full h-44 bg-slate-950 border border-slate-800 rounded-xl p-5 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 outline-none resize-none placeholder:text-slate-800 font-medium custom-scrollbar" value={params.briefingType === 'referencia' ? referenceInput : simpleInput} onChange={e => params.briefingType === 'referencia' ? setReferenceInput(e.target.value) : setSimpleInput(e.target.value)} placeholder={params.briefingType === 'referencia' ? "Cole a copy de referência aqui para clonagem de estilo..." : "Descreva a sua ideia ou oferta para ser transformada em copy..."}></textarea>
                    </>
                )}
              </div>

              <div className="space-y-3">
                  <button onClick={handleGenerate} disabled={analyzingFile || loading || isLocked || (!simpleInput.trim() && !referenceInput.trim())} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-xl flex items-center justify-center gap-3 shadow-2xl active:scale-95 transition-all uppercase text-sm tracking-[0.2em]">
                      {loading ? <RefreshCw className="animate-spin w-6 h-6"/> : <Zap className="w-6 h-6"/>} {loading ? 'Arquitentando...' : 'Executar Comando'}
                  </button>
                  
                  <button onClick={handleCorrection} disabled={analyzingFile || loading || isLocked || (!simpleInput && !referenceInput)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-black py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-all uppercase text-[10px] tracking-[0.2em] border border-slate-700">
                      <Edit3 className="w-4 h-4" /> Editor Sênior (Corrigir Ortografia e Gramática)
                  </button>
              </div>
          </div>
        </div>
      </div>

      {/* ÁREA DE RESULTADOS (DIREITA) */}
      <div className="lg:col-span-6 flex flex-col h-full mb-20">
         <div className={`flex-1 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col relative shadow-2xl overflow-hidden ${generatedCopies.length > 0 && generatedCopies[0].copy ? 'min-h-[600px]' : ''}`}>
            {generatedCopies.length > 0 && generatedCopies[0]?.copy ? (
                <>
                  <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-2 pt-2 sticky top-0 z-10">
                    <div className="flex gap-1">
                        {generatedCopies.map((_, i) => (
                            <button key={i} onClick={() => setActiveTab(i)} className={`px-8 py-4 text-[10px] font-black uppercase rounded-t-lg transition-all ${activeTab === i ? 'bg-indigo-600 text-white shadow-xl translate-y-[1px]' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>Variação {i+1}</button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2 pr-4">
                        {generatedCopies[activeTab]?.note && (
                            <button onClick={() => setShowNoteModal(true)} className="text-[10px] flex items-center gap-2 bg-yellow-900/30 hover:bg-yellow-600 hover:text-white text-yellow-400 px-4 py-2 rounded-xl border border-yellow-700/50 transition-all font-black uppercase tracking-[0.2em] animate-pulse shadow-lg">
                                <BrainCircuit className="w-4 h-4" /> Ver Estratégia
                            </button>
                        )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-slate-900 relative">
                    <div className="prose prose-invert max-w-none whitespace-pre-wrap text-slate-200 text-xl leading-relaxed font-sans font-medium selection:bg-indigo-500 selection:text-white">
                        {generatedCopies[activeTab]?.copy}
                        {loading && activeTab === generatedCopies.length - 1 && <span className="inline-block w-2 h-4 bg-indigo-500 animate-pulse ml-1 align-middle"></span>}
                    </div>
                  </div>
                  <RefinementToolbar text={generatedCopies[activeTab]?.copy || ""} onTextUpdate={(t) => { const nc = [...generatedCopies]; nc[activeTab].copy = t; setGeneratedCopies(nc); }} language={language} platform={params.platform} titleForPDF={`Copy Variação ${activeTab + 1}`} />
                </>
               ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-800 p-10 text-center">
                    <Layers className="w-24 h-24 mb-6 opacity-5" />
                    <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-400">{loading ? 'Codificando Persuasão de Elite...' : 'Aguardando comando de execução.'}</p>
                    {error && !loading && (
                      <div className="mt-6 max-w-md w-full bg-red-950/40 border border-red-800 rounded-xl p-4 text-left">
                        <p className="text-sm font-bold text-red-300 break-words">{error}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button onClick={handleGenerate} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold">Tentar novamente</button>
                          <button onClick={() => setAppActiveTab('settings')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold">Abrir Centro de Comando</button>
                        </div>
                      </div>
                    )}
                </div>
              )}
         </div>
      </div>

      {/* MODAL NOTA DO ESTRATEGISTA (RELATÓRIO TÉCNICO V22) */}
      {showNoteModal && generatedCopies[activeTab]?.note && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in" onClick={() => setShowNoteModal(false)}>
              <div className="bg-slate-900 border border-yellow-500/30 rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] animate-in zoom-in-95 overflow-hidden shadow-[0_0_100px_rgba(234,179,8,0.1)]" onClick={e => e.stopPropagation()}>
                  <div className="p-8 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <Wand2 className="w-8 h-8 text-yellow-500" />
                        <div><h3 className="text-2xl font-black text-white uppercase tracking-tighter">Nota do Estrategista</h3><p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Relatório Técnico e Auditoria de Psicologia Aplicada</p></div>
                      </div>
                      <button onClick={() => setShowNoteModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-lg transition-all"><X className="w-8 h-8" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-10 bg-black/40 text-slate-300 text-base leading-relaxed whitespace-pre-wrap font-medium">
                      {generatedCopies[activeTab].note}
                  </div>
                  <div className="p-6 border-t border-slate-800 bg-slate-950/30 flex justify-end">
                      <button onClick={() => setShowNoteModal(false)} className="px-12 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl">Compreendido, Master</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}