import React, { useState, useEffect } from 'react';
import { getLocalizedLists } from '../constants';
import { CREWAI_MARKETING_PERSONAS } from '../data/crewai-personas';
import { generateArticleService } from '../services/geminiService';
import { Newspaper, Wand2, CheckCircle2, FileText, Link2, Book, Quote, UserCog, PenTool, Mic2, Briefcase, RefreshCw, Code, Home, Brain } from 'lucide-react';
import { ArticleParams } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { RefinementToolbar } from './RefinementToolbar';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { ToolLayout } from './ToolLayout';
import { ActivePersonaBar } from './ActivePersonaBar';
import { SectionHelp } from './SectionHelp';

interface ArticleGeneratorProps {
  language: string;
}

const ArticleGenerator: React.FC<ArticleGeneratorProps> = ({ language }) => {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  const [result, setResult] = useState({ content: '', note: '', schema: '' });
  const [isLocked, setIsLocked] = useState(false);
  const [showSchema, setShowSchema] = useState(false);

  // ESTADO LOCAL ISOLADO
  const [localTopic, setLocalTopic] = useState('');

  const { t, langCode } = useTranslation(language);
  const { articleTypes, tones } = getLocalizedLists(langCode);

  const writerPersonas = [
      { id: 'Journalist', label: 'Jornalista', icon: Mic2, desc: 'Fatos e objetividade.' },
      { id: 'Copywriter', label: 'Copywriter', icon: Briefcase, desc: 'Foco em conversão.' },
      { id: 'Prompt Engineer', label: 'Engenheiro de Prompt', icon: UserCog, desc: 'Estrutura técnica.' },
      { id: 'Editor', label: 'Editor Sênior', icon: PenTool, desc: 'Fluidez e gramática.' }
  ];

  const [params, setParams] = useState<ArticleParams>({
    type: articleTypes?.[0] || 'Blog Post',
    tone: tones?.[0] || 'Neutro',
    citeSources: true,
    includeBibliography: true,
    context: '',
    targetLength: undefined,
    language: language,
    writerStyle: 'Journalist'
  });

  // CrewAI: persona especialista (prompts.chat)
  const [crewPersona, setCrewPersona] = useState('');
  const articlePersonas = CREWAI_MARKETING_PERSONAS.filter(p => p.bestFor.includes('article'));

  const articleHelpDescription = `
O que é o Redator de Autoridade (SEO & AEO):
Esta ferramenta gera artigos otimizados não apenas para o Google (SEO), mas para mecanismos de busca por IA (AEO).
`;

  const handleImportGlobal = () => {
    setLocalTopic(sharedContext);
  };

  const handleGenerate = () => {
    if (!localTopic) return;
    setResult({ content: '', note: '', schema: '' });

    generateStream(
        (onChunk) => generateArticleService({ ...params, context: localTopic, language, crewPersona: crewPersona || undefined }, onChunk),
        (streamedText) => {
            const noteSeparator = "|||NOTA_DIVIDER|||";
            const schemaSeparator = "|||SCHEMA_DIVIDER|||";
            const parts = streamedText.split(noteSeparator);
            const contentAndSchema = parts[0].split(schemaSeparator);
            setResult({ 
                content: contentAndSchema[0].trim(),
                schema: contentAndSchema[1] ? contentAndSchema[1].trim() : '',
                note: parts[1] ? parts[1].replace(/NOTA DO ESTRATEGISTA:[\s]*/i, '').trim() : '' 
            });
        }
    );
  };

  const mainContent = (
      <>
        <ActivePersonaBar language={language} />
        {result.content ? (
            <>
              <div className="bg-slate-900/50 p-4 border-b border-slate-800 rounded-t-xl flex items-center justify-between text-blue-300 font-semibold">
                  <div className="flex items-center gap-2"><FileText className="w-5 h-5" /> Artigo SEO + AEO Optimized</div>
                  {result.schema && (
                      <button onClick={() => setShowSchema(!showSchema)} className={`text-[10px] px-3 py-1 rounded-full border transition-all flex items-center gap-1 ${showSchema ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'}`}> <Code className="w-3 h-3" /> {showSchema ? 'Ver Artigo' : 'Ver JSON-LD'} </button>
                  )}
              </div>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6 lg:p-10">
                {showSchema ? <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 font-mono text-xs text-amber-300 whitespace-pre overflow-x-auto">{result.schema}</div> : <div className="whitespace-pre-wrap font-sans text-base lg:text-lg text-slate-300 leading-relaxed">{result.content}</div>}
                {result.note && !showSchema && (<div className="mt-8 p-4 bg-slate-800/50 border-l-4 border-yellow-400 rounded-r-lg animate-in fade-in"><h4 className="text-sm font-bold text-yellow-400 flex items-center gap-2"><Wand2 className="w-4 h-4" /> NOTA DO ESTRATEGISTA:</h4><p className="text-slate-300 italic mt-2 text-sm whitespace-pre-wrap">{result.note}</p></div>)}
              </div>
              <RefinementToolbar text={result.content} onTextUpdate={(newText) => setResult(prev => ({ ...prev, content: newText }))} language={language} titleForPDF={`Artigo SEO - ${params.type}`} />
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 min-h-[200px] p-6">{loading ? <RefreshCw className="w-16 h-16 mb-4 animate-spin text-blue-500" /> : <Newspaper className="w-16 h-16 mb-4 opacity-20" />}<p className="text-center text-slate-400">{loading ? 'Pesquisando e Redigindo...' : t('msg_wait_desc')}</p></div>
        )}
      </>
  );

  return (
      <ToolLayout title={t('art_title')} icon={Newspaper} iconColorClass="text-blue-400" description={articleHelpDescription} loading={loading} error={error} isLocked={isLocked} onToggleLock={() => setIsLocked(!isLocked)} sidebarContent={( 
        <div className="space-y-4"> 
          <div><label className="text-sm font-medium text-slate-300 block mb-1">Persona</label><select aria-label="Persona" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none text-sm" value={params.writerStyle} onChange={(e) => setParams({...params, writerStyle: e.target.value})} disabled={isLocked}>{writerPersonas.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}</select></div>
          <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-1">
              <Brain className="w-3.5 h-3.5 text-purple-400" /> Persona CrewAI
            </label>
            <select aria-label="Persona CrewAI" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:border-purple-500 outline-none" value={crewPersona} onChange={(e) => setCrewPersona(e.target.value)} disabled={loading || isLocked}>
              <option value="">✨ Sem persona (padrão)</option>
              {articlePersonas.map(p => (<option key={p.id} value={p.id}>{p.label}</option>))}
            </select>
          </div> 
          <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('art_type')}</label><select aria-label={t('art_type')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none text-sm" value={params.type} onChange={(e) => setParams({...params, type: e.target.value})} disabled={isLocked}>{articleTypes.map(t => (<option key={t} value={t}>{t}</option>))}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">Tom</label><select aria-label="Tom do artigo" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-blue-500 outline-none" value={params.tone} onChange={(e) => setParams({...params, tone: e.target.value})} disabled={isLocked}>{(tones || []).map((x: string) => (<option key={x} value={x}>{x}</option>))}</select></div>
            <div><label className="text-xs text-slate-400 block mb-1 uppercase font-bold">Tamanho (chars)</label><input aria-label="Tamanho em caracteres" type="number" min="500" step="500" className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-xs text-slate-200 focus:border-blue-500 outline-none" value={params.targetLength || ''} onChange={(e) => setParams({...params, targetLength: e.target.value ? Number(e.target.value) : undefined})} placeholder="Ex: 3000" disabled={isLocked} /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => !isLocked && setParams({...params, citeSources: !params.citeSources})} disabled={isLocked} aria-pressed={!!params.citeSources} className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest border transition-all ${params.citeSources ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>Citar Fontes</button>
            <button onClick={() => !isLocked && setParams({...params, includeBibliography: !params.includeBibliography})} disabled={isLocked} aria-pressed={!!params.includeBibliography} className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest border transition-all ${params.includeBibliography ? 'bg-blue-600 text-white border-blue-400' : 'bg-slate-900 text-slate-400 border-slate-700'}`}>Bibliografia</button>
          </div> 
          <div className="relative">
            <div className="absolute right-2 top-0 z-10 flex gap-2">
                {sharedContext && (
                    <button onClick={handleImportGlobal} className="p-2 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                        <Brain className="w-4 h-4" />
                    </button>
                )}
            </div>
            <textarea aria-label="Tópico do artigo..." className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-blue-500 outline-none" value={localTopic} onChange={(e) => setLocalTopic(e.target.value)} placeholder="Tópico do artigo..." disabled={isLocked}></textarea>
          </div>
        </div> 
      )} actions={( <button onClick={handleGenerate} disabled={loading || !localTopic || isLocked} className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"> {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Newspaper className="w-5 h-5" />} {loading ? 'Redigindo...' : t('art_btn')} </button> )} mainContent={mainContent} hasResults={!!result.content} outputKind="text" sessionId="article" />
  );
};

export default ArticleGenerator;