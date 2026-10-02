
import React, { useState, useEffect, useMemo } from 'react';
import {
  Wand2, RefreshCw, Scissors, MoveHorizontal, SmilePlus,
  ShieldAlert, Fingerprint, Sparkles, CheckCircle2, MessageSquare,
  Sliders, Download, ArrowUpRight, Copy, TextCursorInput, BadgeAlert
} from 'lucide-react';
import { refineCopyService, checkAIProbabilityService, humanizeTextService } from '../services/geminiService';
import { HUMANIZE_THRESHOLD } from '../services/modules/tools/aiDetection';
import type { AISignalHit } from '../services/modules/tools/aiDetection';
import { autoCleanText, stripInvisibleChars } from '../services/modules/tools/textForensics';
import { getLocalizedLists } from '../constants';
import { useTranslation } from '../hooks/useTranslation';
import TextToSpeech from './TextToSpeech';
import { downloadPDF } from '../services/pdfService';
import { useSharedContext } from '../contexts/SharedContext';
import { stripCopyMarkdown } from '../utils/stripCopyFormat';
import { verifyStats, cleanStats } from '../utils/outputGuard';
import { toFriendlyError } from '../services/friendlyErrors';

interface RefinementToolbarProps {
  text: string;
  onTextUpdate: (newText: string) => void;
  language: string;
  titleForPDF?: string;
  contextButton?: boolean;
  platform?: string;
}

export const RefinementToolbar: React.FC<RefinementToolbarProps> = ({ 
  text, 
  onTextUpdate, 
  language, 
  titleForPDF = "Conteúdo Gerado",
  contextButton = true,
  platform
}) => {
  const { setSharedContext } = useSharedContext();
  const { t, langCode } = useTranslation(language);
  const { socialPlatforms, methodologies, funnelStages, tones } = getLocalizedLists(langCode);

  // States
  const [loading, setLoading] = useState(false);
  const [humanScore, setHumanScore] = useState<{score: number, reason: string, signals?: AISignalHit[], caveat?: string} | null>(null);
  const [checkedText, setCheckedText] = useState<string | null>(null);
  const [showSignals, setShowSignals] = useState(false);
  const [notice, setNotice] = useState<{kind: 'blocked' | 'done', text: string} | null>(null);
  const [customInstruction, setCustomInstruction] = useState('');
  const [targetLength, setTargetLength] = useState<string>('');
  
  // Pivot Settings
  const [pivotSettings, setPivotSettings] = useState({
      platform: '',
      methodology: '',
      funnelStage: '',
      tone: ''
  });

  // Reset Human Score when text changes externally
  useEffect(() => { setHumanScore(null); setCheckedText(null); setNotice(null); setShowSignals(false); }, [text]);

  // Auditoria factual determinística (zero quota): stats sem fonte na frase.
  const statHits = useMemo(() => verifyStats(text), [text]);
  const handleCleanStats = () => {
    const cleaned = cleanStats(text);
    if (cleaned !== text) {
      onTextUpdate(cleaned);
      setNotice({ kind: 'done', text: `Stats sem lastro trocados por [INSERIR DADO] (${statHits.length}).` });
    }
  };

  // --- Helper to clean unwanted AI notes + Markdown (texto puro copia-cola) ---
  const cleanAIOutput = (rawText: string): string => {
      if (!rawText) return "";
      // Remove divider and everything after it
      let clean = rawText.split('|||NOTA_DIVIDER|||')[0];
      clean = clean.split('|||DIVIDER|||')[0];

      // Remove specific prefixes if they leak
      clean = clean.replace(/^(Aqui está|Here is|Segue|Opção \d+).{0,20}:\n/i, '');
      clean = clean.replace(/NOTA DO ESTRATEGISTA:[\s\S]*/i, '');

      return stripCopyMarkdown(clean);
  };

  // --- Actions ---

  const handleRefine = async (instruction: string) => {
    if (!text) return;
    setLoading(true);
    
    // Precedência (decidida no serviço): a instrução do botão clicado sempre
    // vence; a Meta Caracteres só vale para instrução custom/Transformar.
    
    const { text: refined, error } = await refineCopyService({
      originalText: text,
      instruction,
      language,
      platform: platform,
      targetLength: targetLength ? parseInt(targetLength, 10) : undefined
    });
    
    if (error) {
      alert(toFriendlyError("Erro ao refinar: " + error));
    } else {
      onTextUpdate(cleanAIOutput(refined));
      setCustomInstruction('');
    }
    setLoading(false);
  };

  const handlePivot = async () => {
      const changes = [];
      if (pivotSettings.platform) changes.push(`adapt for ${pivotSettings.platform}`);
      if (pivotSettings.methodology) changes.push(`rewrite using ${pivotSettings.methodology} framework`);
      if (pivotSettings.funnelStage) changes.push(`adjust for ${pivotSettings.funnelStage}`);
      if (pivotSettings.tone) changes.push(`change tone to ${pivotSettings.tone}`);

      if (changes.length === 0) {
          alert("Selecione pelo menos uma opção para transformar.");
          return;
      }

      handleRefine(`Rewrite applying these changes: ${changes.join(', ')}. Keep core message.`);
  };

  const handleHumanize = async () => {
      if (!text || loading) return;
      setLoading(true);
      setNotice(null);
      try {
          // Auto-verificação: mede o score atual (reusa se o texto não mudou desde o último check)
          let check = (checkedText === text && humanScore) ? humanScore : null;
          if (!check) {
              const res = await checkAIProbabilityService(text, language);
              if ((res as any).error) { alert(toFriendlyError((res as any).error)); setLoading(false); return; }
              check = res as any;
              setHumanScore(check);
              setCheckedText(text);
          }
          // Gate 70%: abaixo disso o texto já parece humano — não altera nada
          if ((check.score ?? 0) < HUMANIZE_THRESHOLD) {
              setNotice({ kind: 'blocked', text: `Texto já parece humano (IA: ${check.score}%). Nenhuma alteração aplicada.` });
              setLoading(false);
              return;
          }
          // PASSO 0 (determinístico, 0 quota): remove caracteres invisíveis e
          // substitui termos "safe" do léxico ANTES do LLM — o ghostwriter já
          // recebe texto limpo e a cirurgia foca no difícil.
          const prec = autoCleanText(text);
          const { text: newText, error } = await humanizeTextService(prec.text, language, check.signals || []);
          if (error) { alert(toFriendlyError(error)); } // texto intacto — honesto
          else {
              // Cinto e suspensório: invisíveis que o LLM devolver também saem.
              const cleaned = stripInvisibleChars(cleanAIOutput(newText)).text;
              onTextUpdate(cleaned);
              setHumanScore(null);
              setCheckedText(null);
              const prepParts: string[] = [];
              if (prec.replacedTerms > 0) prepParts.push(`${prec.replacedTerms} termo(s)`);
              if (prec.removedChars > 0) prepParts.push(`${prec.removedChars} invisível(is)`);
              const prep = prepParts.length > 0 ? ` Pré-limpeza: ${prepParts.join(' + ')}.` : '';
              // Re-mede para exibir o delta antes/depois
              try {
                  const after = await checkAIProbabilityService(cleaned, language);
                  if (!(after as any).error) {
                      setHumanScore(after as any);
                      setCheckedText(cleaned);
                      const tag = (after as any).mode === 'local' ? ' (estimativa local)' : '';
                      setNotice({ kind: 'done', text: `Humanizado${tag}: IA ${check.score}% → ${after.score}%.${prep} Contexto preservado.` });
                  } else {
                      setNotice({ kind: 'done', text: `Humanizado a partir de IA ${check.score}%.${prep} Contexto preservado.` });
                  }
              } catch {
                  setNotice({ kind: 'done', text: `Humanizado a partir de IA ${check.score}%.${prep} Contexto preservado.` });
              }
          }
      } finally {
          setLoading(false);
      }
  };

  const handleCheckAI = async () => {
      setLoading(true);
      setNotice(null);
      const res = await checkAIProbabilityService(text, language);
      if ((res as any).error) {
          setHumanScore(null);
          setNotice({ kind: 'blocked', text: toFriendlyError((res as any).error) });
      } else {
          setHumanScore({ score: res.score, reason: res.reason, signals: (res as any).signals, caveat: (res as any).caveat });
          // Fallback local: avisa SEMPRE (nem sinal abriria o painel) que é
          // heurística determinística, não veredito do perito.
          if ((res as any).mode === 'local' && res.caveat) {
              setNotice({ kind: 'done', text: res.caveat });
          }
      }
      setCheckedText(text);
      setLoading(false);
  };

  const handleSetContext = () => {
      setSharedContext(text);
      alert("Texto definido como Contexto Global!");
  };

  if (!text) return null;

  return (
    <div className="p-4 bg-slate-900 border-t border-slate-800 rounded-b-xl shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]">
      
      {/* Header: AI Detection & Humanization */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3 border-b border-slate-800/50 pb-3">
          <div className="flex items-center gap-2 text-xs text-indigo-400 font-bold uppercase tracking-wider">
              <Wand2 className="w-3 h-3" /> Refinamento Avançado
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="text-xs font-mono bg-slate-950 border border-slate-700 text-slate-400 px-3 py-1.5 rounded-lg">{text.length} caracteres</div>
              {humanScore ? (
                  <button onClick={() => setShowSignals(s => !s)} title={humanScore.reason || 'Ver sinais detectados'} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border ${humanScore.score >= HUMANIZE_THRESHOLD ? 'bg-red-900/30 border-red-800 text-red-300' : humanScore.score >= 40 ? 'bg-yellow-900/30 border-yellow-800 text-yellow-300' : 'bg-emerald-900/30 border-emerald-800 text-emerald-300'}`}>
                      {humanScore.score >= HUMANIZE_THRESHOLD ? <ShieldAlert className="w-3 h-3" /> : <Fingerprint className="w-3 h-3" />}
                      <span className="font-bold">IA: {humanScore.score}%</span>
                      {(humanScore.signals?.length ?? 0) > 0 && <span className="opacity-70">· {humanScore.signals!.length} sinais</span>}
                  </button>
              ) : (
                  <button onClick={handleCheckAI} disabled={loading} className="text-xs flex items-center gap-1 bg-slate-950 hover:bg-slate-800 text-slate-400 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors">
                      <Fingerprint className="w-3 h-3" /> Verificar IA
                  </button>
              )}
              <button onClick={handleHumanize} disabled={loading} title={`Só altera se IA >= ${HUMANIZE_THRESHOLD}%`} className="bg-indigo-900/50 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                  <Sparkles className="w-3 h-3" /> Humanizar
              </button>
              {statHits.length > 0 && (
                  <button onClick={handleCleanStats} disabled={loading} title={statHits.slice(0, 3).map(h => `“${h.sentence}”`).join(' | ')} className="bg-amber-900/30 hover:bg-amber-900/50 text-amber-300 border border-amber-700/50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                      <BadgeAlert className="w-3 h-3" /> {statHits.length} sem fonte
                  </button>
              )}
          </div>
      </div>

      {/* Aviso de gate 70% / resultado */}
      {notice && (
          <div className={`mb-3 text-xs px-3 py-2 rounded-lg border ${notice.kind === 'blocked' ? 'bg-emerald-900/30 border-emerald-800 text-emerald-300' : 'bg-indigo-900/30 border-indigo-800 text-indigo-200'}`}>
              {notice.text}
          </div>
      )}

      {/* Sinais detectados */}
      {showSignals && humanScore && (humanScore.signals?.length ?? 0) > 0 && (
          <div className="mb-3 bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2">
              {humanScore.reason && <p className="text-xs text-slate-400">{humanScore.reason}</p>}
              {humanScore.signals!.map((s) => (
                  <div key={s.family} className="text-xs">
                      <span className="font-bold text-slate-200">{s.label} ({s.count}x): </span>
                      <span className="text-slate-400">“{(s.evidence[0] || '').slice(0, 120)}”</span>
                  </div>
              ))}
              {humanScore.caveat && <p className="text-[11px] text-slate-500 italic">{humanScore.caveat}</p>}
          </div>
      )}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => handleRefine("Expandir e detalhar")} disabled={loading} className="flex-1 min-w-[90px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700"><MoveHorizontal className="w-3 h-3" /> Expandir</button>
        <button onClick={() => handleRefine("Resumir e ser direto")} disabled={loading} className="flex-1 min-w-[90px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700"><Scissors className="w-3 h-3" /> Encurtar</button>
        <button onClick={() => handleRefine("Simplificar a linguagem")} disabled={loading} className="flex-1 min-w-[90px] bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700"><CheckCircle2 className="w-3 h-3" /> Simplificar</button>
        <button onClick={() => handleRefine("Adicionar emojis estratégicos")} disabled={loading} className="flex-1 min-w-[90px] bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-300 py-2 rounded text-xs flex items-center justify-center gap-2 transition-colors border border-indigo-500/30 font-bold"><SmilePlus className="w-3 h-3" /> Emojis</button>
      </div>

      {/* Custom Instruction */}
      <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
              <input aria-label="Instrução personalizada (ex: Traduzir para Espanhol...)" 
                type="text" 
                placeholder="Instrução personalizada (ex: Traduzir para Espanhol...)" 
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRefine(customInstruction)}
              />
              <div className="absolute right-2 top-2 text-slate-500"><MessageSquare className="w-3 h-3" /></div>
          </div>
          <div className="relative w-32">
               <input aria-label="Meta Caracteres" 
                type="number" 
                placeholder="Meta Caracteres"
                title="Vale para instrução personalizada e Transformar. Botões Expandir/Encurtar/Simplificar/Emojis ignoram a meta."
                className={`w-full bg-slate-950 border rounded-lg pl-3 pr-8 py-2 text-xs text-slate-200 outline-none transition-colors ${targetLength ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-slate-800 focus:border-indigo-500'}`}
                value={targetLength}
                onChange={(e) => setTargetLength(e.target.value)}
              />
              <div className="absolute right-2 top-2 text-slate-500"><TextCursorInput className="w-3 h-3" /></div>
          </div>
          <button onClick={() => handleRefine(customInstruction || 'Ajustar para o tamanho alvo')} disabled={loading || (!customInstruction && !targetLength)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-md disabled:opacity-50">
             {loading ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>}
          </button>
      </div>

      {/* Pivot Controls */}
      <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800 mb-3">
          <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">
              <Sliders className="w-3 h-3" /> Transformar Texto
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              <select aria-label="Plataforma do pivot" className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded p-2 outline-none focus:border-indigo-500" value={pivotSettings.platform} onChange={(e) => setPivotSettings({...pivotSettings, platform: e.target.value})}>
                  <option value="">Plataforma...</option>
                  {socialPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select aria-label="Framework do pivot" className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded p-2 outline-none focus:border-indigo-500" value={pivotSettings.methodology} onChange={(e) => setPivotSettings({...pivotSettings, methodology: e.target.value})}>
                  <option value="">Framework...</option>
                  {methodologies.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select aria-label="Etapa de funil do pivot" className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded p-2 outline-none focus:border-indigo-500" value={pivotSettings.funnelStage} onChange={(e) => setPivotSettings({...pivotSettings, funnelStage: e.target.value})}>
                  <option value="">Funil...</option>
                  {funnelStages.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              <select aria-label="Tom de voz do pivot" className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded p-2 outline-none focus:border-indigo-500" value={pivotSettings.tone} onChange={(e) => setPivotSettings({...pivotSettings, tone: e.target.value})}>
                  <option value="">Tom de Voz...</option>
                  {tones.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
          </div>
          <button onClick={handlePivot} disabled={loading} className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-600 hover:border-indigo-500 py-2 rounded text-xs font-bold transition-all flex items-center justify-center gap-2">
              {loading ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Wand2 className="w-3 h-3"/>} Aplicar Mudanças
          </button>
      </div>

      {/* Footer Actions */}
      <div className="flex gap-2 pt-2 border-t border-slate-800/50">
        <button onClick={() => downloadPDF(titleForPDF, text)} className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-600 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95" title="Baixar PDF"><Download className="w-5 h-5" /></button>
        <TextToSpeech text={text} language={language} className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-600 rounded-lg" />
        {contextButton && (
            <button onClick={handleSetContext} className="flex-[2] bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-indigo-900/20"><ArrowUpRight className="w-5 h-5" /> Contexto Global</button>
        )}
        <button onClick={async () => { try { await navigator.clipboard.writeText(text); setNotice({ kind: 'done', text: `Copiado (${text.length} caracteres).` }); } catch { setNotice({ kind: 'blocked', text: 'Não foi possível copiar — verifique a permissão do navegador.' }); } }} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-emerald-900/20"><Copy className="w-5 h-5" /> Copiar</button>
      </div>
    </div>
  );
};
