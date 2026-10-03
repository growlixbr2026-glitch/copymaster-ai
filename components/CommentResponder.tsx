import React, { useState, useEffect } from 'react';
import { MessageSquare, Home, Lock, Unlock, ImagePlus, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { getLocalizedLists } from '../constants';
import { useSharedContext } from '../contexts/SharedContext';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { useTranslation } from '../hooks/useTranslation';
import { useFileAnalysis } from '../hooks/useFileAnalysis';
import { generateCommentResponseService, COMMENT_DIVIDER } from '../services/modules/social/commentResponder';
import { OutputKindBadge } from './ToolLayout';
import { SectionHelp } from './SectionHelp';
import { RefinementToolbar } from './RefinementToolbar';
import { splitNotaBlock, splitCopyVariants } from '../utils/stripCopyFormat';

const OBJECTIVES = [
  { id: 'autoridade', label: 'Autoridade (dado/exemplo)' },
  { id: 'engajar', label: 'Engajar (abrir conversa)' },
  { id: 'adicionar-valor', label: 'Adicionar valor' },
  { id: 'concordar-e-ampliar', label: 'Concordar e ampliar' },
  { id: 'contra-argumentar', label: 'Discordar com educação' },
  { id: 'pergunta-aberta', label: 'Pergunta aberta (fio)' },
  { id: 'agradecer-e-conversa', label: 'Agradecer e puxar conversa' },
  { id: 'vender-sutil', label: 'Autoridade comercial sutil' },
];

const LENGTHS = [
  { id: 'curto', label: 'Curto (1-2 frases)' },
  { id: 'medio', label: 'Médio (3-4 frases)' },
  { id: 'longo', label: 'Longo (parágrafo)' },
];

export default function CommentResponder({ language }: { language: string }) {
  const { setActiveTab: setAppActiveTab } = useSharedContext();
  const { langCode } = useTranslation(language);
  const { loading, error, generateStream, setError } = useAIGenerator();
  // langCode ('pt'|'es'|'en') — passar `language` cru ("Português (Brasil)")
  // nunca casa com o ternário de getLocalizedLists e renderiza tudo em EN.
  const lists = getLocalizedLists(langCode);
  const { analyzingFile, fileName, setFileName, analyzeFile } = useFileAnalysis(language);

  const [mode, setMode] = useState<'post' | 'comment'>('post');
  const [sourceType, setSourceType] = useState<'text' | 'image' | 'pdf'>('text');
  const [platform, setPlatform] = useState(lists.socialPlatforms[0]);
  const [objective, setObjective] = useState('autoridade');
  const [tone, setTone] = useState(lists.tones[0]);
  const [length, setLength] = useState('medio');
  const [variations, setVariations] = useState(3);

  const [sourceText, setSourceText] = useState('');
  const [extra, setExtra] = useState('');
  const [extracted, setExtracted] = useState('');

  // Troca de idioma re-sincroniza os defaults dos seletores: sem isto, o valor
  // antigo (ex.: a opção EN) continuaria selecionado e viaja para o prompt.
  useEffect(() => {
    setPlatform(lists.socialPlatforms[0]);
    setTone(lists.tones[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langCode]);

  const [variants, setVariants] = useState<string[]>([]);
  const [activeVar, setActiveVar] = useState(0);
  const [note, setNote] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const buildContext = () => {
    const parts = sourceType === 'text' ? [sourceText] : [extracted, sourceText];
    return parts.map((p) => (p || '').trim()).filter(Boolean).join('\n\n');
  };
  const hasSource = buildContext().trim().length > 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'imagem' | 'pdf') => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // libera reenviar o MESMO arquivo após uma falha
    const r = await analyzeFile(file, type);
    if ('facts' in r) {
      setExtracted(r.facts);
    } else {
      // Análise falhou ou veio vazia: nunca reaproveita a fonte antiga (§8).
      setExtracted('');
      setError(r.error);
    }
  };

  // Trocar o tipo de fonte NÃO pode deixar a análise do tipo anterior
  // fingindo ser a nova (imagem analisada virando "PDF" sem PDF nenhum).
  const changeSourceType = (t: 'text' | 'image' | 'pdf') => {
    if (t === sourceType) return;
    setSourceType(t);
    setExtracted('');
    setFileName('');
  };

  const handleGenerate = () => {
    const context = buildContext();
    if (!context.trim()) {
      setError(
        sourceType === 'text'
          ? 'Cole a postagem ou o comentário recebido — sem a fonte não há como responder no contexto.'
          : 'Envie a imagem/PDF (ou cole o texto) — sem a fonte não há como responder no contexto.'
      );
      return;
    }

    setVariants([]);
    setActiveVar(0);
    setNote('');

    generateStream(
      (onChunk) => generateCommentResponseService({
        mode,
        platform,
        objective,
        tone,
        length,
        variations,
        context,
        extra,
        language,
      }, onChunk),
      (streamedText) => {
        const { content, note } = splitNotaBlock(streamedText);
        const vars = splitCopyVariants(content, COMMENT_DIVIDER).filter((v) => v.trim());
        setVariants(vars);
        setActiveVar((prev) => Math.min(prev, Math.max(0, vars.length - 1)));
        setNote(note);
      },
      (finalText) => {
        if (!finalText || finalText.trim().length < 50) {
          setError('O modelo retornou uma resposta vazia. Tente novamente.');
        }
      }
    );
  };

  const sourceLabel = mode === 'post' ? 'Postagem (texto, artigo ou trecho) *' : 'Comentário recebido *';
  const extraLabel = mode === 'post' ? 'Contexto extra (opcional)' : 'Contexto do post (opcional)';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-y-auto custom-scrollbar">
      {/* SIDEBAR */}
      <div className="lg:col-span-4 flex flex-col h-full">
        <div className={`bg-slate-900 border p-6 rounded-2xl mb-6 flex-shrink-0 transition-all ${isLocked ? 'border-amber-500/30 bg-slate-900/80 relative' : 'border-slate-800 shadow-2xl'}`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black flex items-center gap-2 text-amber-400 uppercase tracking-tighter">
              <MessageSquare className="w-6 h-6" /> Responder Comentários
              <OutputKindBadge kind="text" />
              <SectionHelp
                title="Responder Comentários"
                description="Transforme uma postagem, artigo, imagem ou o comentário recebido em respostas contextuais de autoridade: fórmula ouro (ponto específico + valor novo + pergunta aberta), 3 variações copia-cola + Nota do Estrategista com janela de resposta por rede."
                sessionId="commentResponder"
              />
            </h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setAppActiveTab('home')} title="Voltar para o Início" aria-label="Voltar para o Início" className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-all"><Home className="w-4 h-4" /></button>
              <button onClick={() => setIsLocked(!isLocked)} title={isLocked ? "Desbloquear edição" : "Bloquear edição"} aria-label={isLocked ? "Desbloquear edição" : "Bloquear edição"} className={`p-2 rounded-lg transition-all border ${isLocked ? 'bg-amber-500/20 text-amber-400 border-amber-500/50' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>{isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}</button>
            </div>
          </div>

          <div className={`space-y-4 ${isLocked ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* MODO */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Modo</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMode('post')}
                  aria-pressed={mode === 'post'}
                  className={`py-3 px-2 text-[10px] font-black uppercase rounded-lg transition-all border ${mode === 'post' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'}`}
                >
                  Comentar na postagem
                </button>
                <button
                  onClick={() => setMode('comment')}
                  aria-pressed={mode === 'comment'}
                  className={`py-3 px-2 text-[10px] font-black uppercase rounded-lg transition-all border ${mode === 'comment' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'}`}
                >
                  Responder comentário
                </button>
              </div>
            </div>

            {/* FONTE */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Fonte do conteúdo</label>
              <div className="grid grid-cols-3 gap-2">
                {([['text', 'Texto'], ['image', 'Imagem'], ['pdf', 'PDF']] as const).map(([id, lbl]) => (
                  <button
                    key={id}
                    onClick={() => changeSourceType(id)}
                    aria-pressed={sourceType === id}
                    className={`py-2.5 px-1 text-[10px] font-black uppercase rounded-lg transition-all border ${sourceType === id ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'}`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            {sourceType === 'text' && (
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{sourceLabel}</label>
                <textarea
                  aria-label={sourceLabel}
                  placeholder={mode === 'post' ? 'Cole aqui a postagem/artigo que você quer comentar...' : 'Cole aqui o comentário que você recebeu...'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-amber-500 h-32 resize-none"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                />
              </div>
            )}

            {sourceType !== 'text' && (
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1.5">
                  {sourceType === 'image' ? <ImagePlus className="w-3.5 h-3.5 text-indigo-400" /> : <FileText className="w-3.5 h-3.5 text-indigo-400" />}
                  {sourceType === 'image' ? 'Enviar imagem da postagem' : 'Enviar PDF'} *
                </label>
                <input
                  type="file"
                  aria-label={sourceType === 'image' ? 'Upload da imagem da postagem' : 'Upload do PDF'}
                  accept={sourceType === 'image' ? 'image/*' : 'application/pdf'}
                  onChange={(e) => handleFileUpload(e, sourceType === 'image' ? 'imagem' : 'pdf')}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-slate-300 file:font-bold hover:file:bg-slate-700 cursor-pointer"
                  disabled={analyzingFile}
                />
                {analyzingFile && (
                  <p className="text-indigo-300 text-[11px] font-bold flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Lendo {fileName} com a IA...</p>
                )}
                {!analyzingFile && extracted && (
                  <p className="text-emerald-400 text-[11px] font-bold flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> {fileName} analisado — conteúdo vira fonte da resposta.</p>
                )}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Texto colado (opcional, complementa a fonte)</label>
                  <textarea
                    aria-label="Texto colado complementar"
                    placeholder="Trecho extraído à mão, legenda do post..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-amber-500 h-20 resize-none"
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* SELETORES */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Rede</label>
              <select aria-label="Rede" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-amber-500" value={platform} onChange={(e) => setPlatform(e.target.value)}>
                {lists.socialPlatforms.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Objetivo</label>
                <select aria-label="Objetivo" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-amber-500" value={objective} onChange={(e) => setObjective(e.target.value)}>
                  {OBJECTIVES.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tom</label>
                <select aria-label="Tom" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-amber-500" value={tone} onChange={(e) => setTone(e.target.value)}>
                  {lists.tones.map((tn) => <option key={tn} value={tn}>{tn}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Tamanho</label>
                <select aria-label="Tamanho" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-amber-500" value={length} onChange={(e) => setLength(e.target.value)}>
                  {LENGTHS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Variações</label>
                <select aria-label="Variações" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-amber-500" value={variations} onChange={(e) => setVariations(Number(e.target.value))}>
                  <option value={1}>1 resposta</option>
                  <option value={2}>2 respostas</option>
                  <option value={3}>3 respostas</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{extraLabel}</label>
              <textarea
                aria-label={extraLabel}
                placeholder={mode === 'post' ? 'Quem você é / por que está comentando...' : 'Resumo do post ao qual o comentário pertence...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white font-bold outline-none focus:border-amber-500 h-16 resize-none"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || analyzingFile || !hasSource}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-black text-sm rounded-xl transition-all shadow-lg shadow-amber-500/20 disabled:shadow-none"
            >
              {loading ? 'Gerando Respostas...' : 'Gerar Respostas'}
            </button>
            {!hasSource && !loading && (
              <p className="text-[11px] text-slate-500 font-bold text-center">
                {sourceType === 'text' ? 'Cole a postagem/comentário para liberar a geração.' : 'Envie o arquivo para liberar a geração.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="lg:col-span-8 flex flex-col h-full">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              Respostas Contextuais
            </h3>
            {variants.length > 0 && <RefinementToolbar text={variants.join('\n\n')} onTextUpdate={(t) => { setVariants([t]); setActiveVar(0); }} language={language} />}
          </div>

          {error && (
            <div role="alert" className="bg-red-950/50 border border-red-500/30 rounded-xl p-4 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {variants.length > 0 ? (
              <>
                {variants.length > 1 && (
                  <div className="flex gap-2 mb-4 flex-wrap">
                    {variants.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveVar(i)}
                        aria-current={activeVar === i ? 'true' : undefined}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${activeVar === i ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-400 border border-slate-800 hover:border-slate-700'}`}
                      >
                        Variação {i + 1}
                      </button>
                    ))}
                  </div>
                )}
                <pre className="whitespace-pre-wrap text-slate-300 text-sm font-mono leading-relaxed">{variants[activeVar] || variants[0]}</pre>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 h-full">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-sm">Cole a postagem ou o comentário recebido e clique em Gerar Respostas</p>
                  <p className="text-xs text-slate-600 mt-2">3 variações de autoridade + Nota com a janela ideal de resposta por rede</p>
                </div>
              </div>
            )}
          </div>

          {note && (
            <div className="mt-4 bg-amber-950/30 border border-amber-500/20 rounded-xl p-4">
              <p className="text-amber-400 text-xs font-black uppercase tracking-wider mb-2">Nota do Estrategista</p>
              <p className="text-amber-200/80 text-sm whitespace-pre-wrap">{note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
