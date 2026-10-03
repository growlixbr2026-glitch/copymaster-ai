import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Info, X, ChevronDown, ChevronRight, ExternalLink, Copy, AlertCircle, Sparkles, BookOpen, Zap, Target, Shield, Clock, HelpCircle } from 'lucide-react';
import TextToSpeech from './TextToSpeech';
import { SessionGuide, getGuide } from '../data/guides';

interface SectionHelpProps {
  title: string;
  description: string;
  sessionId?: string; // Novo: ID da sessão para buscar guia detalhado
}

const IconMap: Record<string, React.ReactNode> = {
  whatIsIt: <BookOpen className="w-4 h-4 text-indigo-400" />,
  purpose: <Target className="w-4 h-4 text-emerald-400" />,
  expectedOutput: <Zap className="w-4 h-4 text-yellow-400" />,
  workflow: <Sparkles className="w-4 h-4 text-purple-400" />,
  proTips: <Shield className="w-4 h-4 text-blue-400" />,
  commonMistakes: <AlertCircle className="w-4 h-4 text-orange-400" />,
  integratesWith: <ExternalLink className="w-4 h-4 text-cyan-400" />,
  limitations: <Clock className="w-4 h-4 text-slate-400" />,
  examples: <HelpCircle className="w-4 h-4 text-fuchsia-400" />,
  faq: <HelpCircle className="w-4 h-4 text-rose-400" />,
  inputs: <BookOpen className="w-4 h-4 text-indigo-400" />,
  subsessions: <Target className="w-4 h-4 text-emerald-400" />,
  knownBlocks: <AlertCircle className="w-4 h-4 text-red-400" />,
  outputKind: <Zap className="w-4 h-4 text-yellow-400" />,
};

const SectionLabels: Record<string, string> = {
  whatIsIt: 'O que é este módulo',
  purpose: 'Para que serve / Casos de uso',
  expectedOutput: 'Resultado esperado',
  outputKind: 'Tipo de saída',
  workflow: 'Como usar (passo a passo)',
  proTips: 'Dicas de especialista',
  commonMistakes: 'Erros comuns a evitar',
  integratesWith: 'Integra com outras sessões',
  exportsTo: 'Exporta para',
  limitations: 'Limitações conhecidas',
  knownBlocks: 'O que bloqueia a geração',
  examples: 'Exemplos práticos',
  faq: 'Perguntas rápidas (FAQ)',
  inputs: 'Campos de entrada (detalhados)',
  subsessions: 'Modos / Subsessões',
};

type GuideSectionKey = keyof SessionGuide;

// Registro global de instâncias (keep-alive multi-painel): um guia aberto por vez.
const guideInstances: {
  ref: React.RefObject<HTMLElement>;
  setOpen: (v: boolean) => void;
  open: boolean;
}[] = [];

const DETAILED_SECTIONS: GuideSectionKey[] = [
  'whatIsIt',
  'purpose',
  'expectedOutput',
  'outputKind',
  'subsessions',
  'inputs',
  'workflow',
  'proTips',
  'commonMistakes',
  'integratesWith',
  'exportsTo',
  'limitations',
  'knownBlocks',
  'examples',
  'faq',
];

export const SectionHelp: React.FC<SectionHelpProps> = ({ title, description, sessionId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  const guide = useMemo(() => sessionId ? getGuide(sessionId) : null, [sessionId]);
  const hasDetailedGuide = !!guide;

  // --- Atalhos F1/Esc centralizados ---------------------------------------
  // Como o App usa keep-alive (dezenas de SectionHelp montados), o registro é
  // em nível de módulo: um único "dono" do guia por vez, e o F1 abre o guia
  // da instância VISÍVEL (offsetParent !== null), nunca de um painel oculto.
  const btnRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const entry = {
      ref: btnRef as React.RefObject<HTMLElement>,
      setOpen: (v: boolean) => setIsOpen(v),
      open: false,
    };
    guideInstances.push(entry);
    return () => {
      const i = guideInstances.indexOf(entry);
      if (i >= 0) guideInstances.splice(i, 1);
    };
  }, []);

  React.useEffect(() => {
    const entry = guideInstances.find(e => e.ref === btnRef);
    if (entry) entry.open = isOpen;
  }, [isOpen]);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return; // já tratado por outra instância neste evento
      if (e.key === 'F1') {
        e.preventDefault();
        const openEntry = guideInstances.find(i => i.open);
        if (openEntry) {
          openEntry.setOpen(false);
        } else {
          const target = guideInstances.find(i => i.ref.current && i.ref.current.offsetParent !== null);
          if (target) target.setOpen(true);
        }
      } else if (e.key === 'Escape') {
        const openEntry = guideInstances.find(i => i.open);
        if (openEntry) {
          e.preventDefault();
          openEntry.setOpen(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    DETAILED_SECTIONS.forEach(k => all[k] = true);
    setExpandedSections(all);
  };

  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    DETAILED_SECTIONS.forEach(k => all[k] = false);
    setExpandedSections(all);
  };

  const renderSimpleDescription = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const isTitle = trimmed.endsWith(':') && trimmed.length < 60;
      const isList = /^\d+\.|^-/.test(trimmed);
      return (
        <p key={i} className={`mb-2 ${isTitle ? 'font-bold text-white mt-4 text-base border-b border-slate-800 pb-1' : 'text-slate-300'} ${isList ? 'pl-4 border-l-2 border-slate-700 ml-1' : ''}`}>
          {line}
        </p>
      );
    });
  };

  const renderField = (field: any) => (
    <div key={field.key} className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-4 mb-3">
      <div className="flex items-start gap-3">
        <span className="text-[10px] font-mono text-slate-500 mt-1 min-w-[100px]">{field.key}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-slate-200">{field.label}</span>
            {field.required && <span className="text-red-400 text-xs">*</span>}
            <span className={`px-1.5 py-0.5 text-[9px] font-mono rounded bg-slate-800 text-slate-500`}>{field.type}</span>
          </div>
          <p className="text-slate-400 text-sm">{field.description}</p>
          {field.placeholder && <p className="text-slate-600 text-xs mt-1 font-mono">Placeholder: {field.placeholder}</p>}
          {field.example && <p className="text-emerald-400 text-xs mt-1">Exemplo: <span className="font-mono">{field.example}</span></p>}
          {field.options && field.options.length > 0 && (
            <p className="text-slate-500 text-xs mt-1">Opções: {field.options.slice(0, 10).join(', ')}{field.options.length > 10 ? ` +${field.options.length - 10} mais` : ''}</p>
          )}
          {field.dependsOn && <p className="text-amber-400 text-xs mt-1">Aparece quando: {field.dependsOn}</p>}
        </div>
      </div>
    </div>
  );

  const renderSubsession = (sub: any) => (
    <div key={sub.id} className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 mb-1">
        {sub.icon && <span className="text-lg">{sub.icon}</span>}
        <span className="font-bold text-white">{sub.title}</span>
      </div>
      <p className="text-slate-400 text-sm">{sub.description}</p>
    </div>
  );

  const renderExample = (ex: any, idx: number) => (
    <div key={idx} className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-4 mb-3">
      <h5 className="font-bold text-emerald-400 mb-2">{ex.title}</h5>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Entradas</p>
          <pre className="bg-slate-900 border border-slate-800 rounded p-3 text-xs text-slate-300 overflow-x-auto max-h-40 font-mono">{JSON.stringify(ex.inputs, null, 2)}</pre>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Resultado esperado</p>
          <pre className="bg-slate-900 border border-slate-800 rounded p-3 text-xs text-slate-300 overflow-x-auto max-h-40 whitespace-pre-wrap">{ex.expectedResult}</pre>
        </div>
      </div>
    </div>
  );

  const renderFAQ = (item: any) => (
    <div key={item.q} className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-4 mb-3">
      <p className="font-bold text-white mb-1">{item.q}</p>
      <p className="text-slate-400 text-sm">{item.a}</p>
    </div>
  );

  const renderSection = (key: GuideSectionKey) => {
    if (!guide) return null;
    const value = guide[key];
    if (!value || (Array.isArray(value) && value.length === 0)) return null;

    const isExpanded = expandedSections[key] !== false; // default expandido
    const IconEl = IconMap[key] || <BookOpen className="w-4 h-4 text-indigo-400" />;
    const Label = SectionLabels[key] || key;

    return (
      <div key={key} className="mb-4 border border-slate-800/50 rounded-xl overflow-hidden bg-slate-950/30">
        <button
          onClick={() => toggleSection(key)}
          className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-slate-900/50 transition-colors"
          aria-expanded={isExpanded}
        >
          {IconEl}
          <span className="font-bold text-white text-sm">{Label}</span>
          <span className="ml-auto text-slate-500">
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        </button>

        {isExpanded && (
          <div className="px-5 pb-5 pt-2 border-t border-slate-800/30 animate-in slide-in-from-top-2 duration-200">
            {key === 'inputs' && Array.isArray(value) && (
              <div className="space-y-2">{value.map(renderField)}</div>
            )}
            {key === 'subsessions' && Array.isArray(value) && (
              <div className="space-y-2">{value.map(renderSubsession)}</div>
            )}
            {key === 'examples' && Array.isArray(value) && (
              <div className="space-y-2">{value.map(renderExample)}</div>
            )}
            {key === 'faq' && Array.isArray(value) && (
              <div className="space-y-2">{value.map(renderFAQ)}</div>
            )}
            {key === 'workflow' && Array.isArray(value) && (
              <ol className="space-y-3 list-decimal list-inside">
                {value.map((step, i) => (
                  <li key={i} className="text-slate-300 leading-relaxed pl-2 border-l-2 border-slate-700 ml-2">{step}</li>
                ))}
              </ol>
            )}
            {key === 'proTips' && Array.isArray(value) && (
              <ul className="space-y-2">
                {value.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-300 leading-relaxed">
                    <span className="text-blue-400 mt-1">▸</span> {tip}
                  </li>
                ))}
              </ul>
            )}
            {key === 'commonMistakes' && Array.isArray(value) && (
              <ul className="space-y-2">
                {value.map((mistake, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-300 leading-relaxed">
                    <span className="text-orange-400 mt-1">✗</span> {mistake}
                  </li>
                ))}
              </ul>
            )}
            {key === 'integratesWith' && Array.isArray(value) && (
              <div className="flex flex-wrap gap-2">
                {value.map((id, i) => (
                  <span key={i} className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full border border-indigo-500/30">{id}</span>
                ))}
              </div>
            )}
            {key === 'exportsTo' && Array.isArray(value) && (
              <div className="flex flex-wrap gap-2">
                {value.map((id, i) => (
                  <span key={i} className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full border border-emerald-500/30">{id}</span>
                ))}
              </div>
            )}
            {key === 'limitations' && Array.isArray(value) && (
              <ul className="space-y-2">
                {value.map((lim, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-400 leading-relaxed">
                    <span className="text-slate-500 mt-1">•</span> {lim}
                  </li>
                ))}
              </ul>
            )}
            {key === 'knownBlocks' && Array.isArray(value) && (
              <ul className="space-y-2">
                {value.map((block, i) => (
                  <li key={i} className="flex items-start gap-2 text-red-300 leading-relaxed">
                    <span className="text-red-400 mt-1">🚫</span> {block}
                  </li>
                ))}
              </ul>
            )}
            {key === 'outputKind' && typeof value === 'string' && (
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  value === 'text' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                  value === 'image_prompt' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                  'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {value === 'text' ? '📝 Texto puro (copia-cola)' : value === 'image_prompt' ? '🎨 Prompt EN para IA de imagem' : '🔄 Dinâmico (texto ou prompt)'}
                </span>
              </div>
            )}
            {typeof value === 'string' && !['workflow', 'proTips', 'commonMistakes', 'integratesWith', 'exportsTo', 'limitations', 'knownBlocks', 'outputKind'].includes(key) && (
              <div className="text-slate-300 leading-[1.75] whitespace-pre-wrap [&_b]:text-white [&_b]:font-semibold">{value}</div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setIsOpen(true)}
        className="ml-auto sm:ml-2 text-slate-500 hover:text-indigo-400 transition-colors p-1.5 rounded-full hover:bg-slate-800/50"
        aria-label="Guia detalhado da ferramenta (F1)"
        title="Guia detalhado (F1) — tudo o que você precisa saber"
      >
        <Info className="w-5 h-5" />
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 guide-help-portal" onClick={() => setIsOpen(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-4xl w-full relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-slate-950/50 rounded-t-xl shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <Info className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Guia: {guide?.sessionTitle || title}</h3>
                  <p className="text-[11px] text-slate-500">{guide?.category || 'Ferramenta'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasDetailedGuide && (
                  <>
                    <button onClick={expandAll} className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">Expandir tudo</button>
                    <button onClick={collapseAll} className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">Recolher tudo</button>
                  </>
                )}
                <TextToSpeech text={description} language="pt-BR" className="bg-slate-800 border-slate-700 hover:bg-indigo-600 hover:text-white" />
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar text-[15px] leading-[1.75] text-slate-300 bg-slate-900 flex-1 guide-help-content">
              {hasDetailedGuide ? (
                <div className="space-y-1">
                  {DETAILED_SECTIONS.map(key => renderSection(key))}
                </div>
              ) : (
                <div>
                  {renderSimpleDescription(description)}
                  <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-amber-400 text-sm font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Guia detalhado em construção
                    </p>
                    <p className="text-slate-400 text-sm mt-1">Esta ferramenta ainda não possui o guia F1 completo. A descrição básica acima resume o funcionamento.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/30 rounded-b-xl flex justify-between items-center shrink-0">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono">F1</kbd> ou <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono">Esc</kbd> para fechar
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold transition-colors border border-slate-700"
              >
                Entendi, fechar guia
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
};