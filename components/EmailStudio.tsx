import React, { useState, useEffect } from 'react';
import { Mail, Wand2, Link2, Send, RefreshCw, Home, Brain } from 'lucide-react';
import { getLocalizedLists } from '../constants';
import { generateEmailSequenceService } from '../services/geminiService';
import { useTranslation } from '../hooks/useTranslation';
import { SectionHelp } from './SectionHelp';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';
import { RefinementToolbar } from './RefinementToolbar';
import { useAIGenerator } from '../hooks/useAIGenerator';
import { ToolLayout } from './ToolLayout';

interface EmailStudioProps {
  language: string;
}

interface EmailResult {
    content: string;
    note: string;
}

export default function EmailStudio({ language }: { language: string }) {
  const { sharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { loading, error, generateStream } = useAIGenerator();
  const [emails, setEmails] = useState<EmailResult[]>([]);
  const [activeEmailTab, setActiveEmailTab] = useState(0);
  const [isLocked, setIsLocked] = useState(false);

  const { t, langCode } = useTranslation(language);
  const { emailTypes, tones } = getLocalizedLists(langCode);

  // ESTADO LOCAL ISOLADO
  const [localContext, setLocalContext] = useState('');

  const [params, setParams] = useState({
    type: emailTypes[0],
    count: 3,
    tone: tones[0],
    senderName: '',
    targetAudience: '',
  });

  const emailHelpDescription = `
O que é o Estúdio de Email Marketing:
Este módulo é uma usina de retenção e conversão. Diferente de geradores de texto simples, esta ferramenta arquiteta sequências lógicas que movem o lead através da jornada de compra.
`;

  useEffect(() => {
      setParams(p => ({ ...p, type: emailTypes[0], tone: tones[0] }));
  }, [langCode, emailTypes, tones]);

  const handleImportGlobal = () => {
    setLocalContext(sharedContext);
  };

  const handleGenerate = async () => {
    if (!localContext) { alert("Por favor, insira o contexto do e-mail."); return; }
    setEmails([]); setActiveEmailTab(0);
    generateStream(
        (onChunk) => generateEmailSequenceService({ ...params, context: localContext, language: language }, onChunk),
        (streamedText) => {
            const separator = "|||EMAIL_DIVIDER|||"; const noteSeparator = "|||NOTA_DIVIDER|||";
            let rawEmails = streamedText.split(separator);
            const parsedEmails = rawEmails.map(block => {
                if (!block.trim()) return null;
                const parts = block.split(noteSeparator);
                return { content: parts[0].trim(), note: parts[1] ? parts[1].replace(/NOTA DO ESTRATEGISTA:[\s]*/i, '').trim() : '' };
            }).filter(Boolean) as EmailResult[];
            if (parsedEmails.length > 0) { setEmails(parsedEmails); }
        }
    );
  };

  const handleVoiceInput = (text: string) => { setLocalContext(prev => prev ? prev + ' ' + text : text); };
  const handleEmailUpdate = (newText: string) => {
      const updatedEmails = [...emails];
      if (updatedEmails[activeEmailTab]) { updatedEmails[activeEmailTab].content = newText; setEmails(updatedEmails); }
  };

  // Teto 5/generation: sequências maiores estouram o teto dos modelos e
  // degradam todos os e-mails (re-gerar com outro tipo p/ continuar a série).
  const emailCountOptions = [1, 2, 3, 4, 5];
  const activeEmail = emails[activeEmailTab];

  const sidebarContent = (
    <div className="space-y-4">
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('email_type')}</label><select aria-label={t('email_type')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-sky-500 outline-none text-sm" value={params.type} onChange={(e) => setParams({...params, type: e.target.value})} disabled={loading || isLocked}>{emailTypes.map(t => (<option key={t} value={t}>{t}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('email_count')}</label><select aria-label={t('email_count')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-sky-500 outline-none text-sm" value={params.count} onChange={(e) => setParams({...params, count: parseInt(e.target.value)})} disabled={loading || isLocked}>{emailCountOptions.map(n => (<option key={n} value={n}>{n} Emails</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('label_tone')}</label><select aria-label={t('label_tone')} className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-sky-500 outline-none text-sm" value={params.tone} onChange={(e) => setParams({...params, tone: e.target.value})} disabled={loading || isLocked}>{tones.map(t => (<option key={t} value={t}>{t}</option>))}</select></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('email_sender')}</label><input aria-label="Ex: João da Silva" type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-sky-500 outline-none text-sm" placeholder="Ex: João da Silva" value={params.senderName} onChange={(e) => setParams({...params, senderName: e.target.value})} disabled={loading || isLocked} /></div>
      <div><label className="text-sm font-medium text-slate-300 block mb-1">{t('email_audience')}</label><input aria-label="Ex: Donos de pequenas empresas..." type="text" className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-sky-500 outline-none text-sm" placeholder="Ex: Donos de pequenas empresas..." value={params.targetAudience} onChange={(e) => setParams({...params, targetAudience: e.target.value})} disabled={loading || isLocked} /></div>
      <div className="relative">
          <div className="absolute right-2 top-8 z-10 flex gap-2">
            {sharedContext && (
                <button onClick={handleImportGlobal} className="p-2 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500 hover:text-white transition-all shadow-lg" title="Importar do Cérebro Central">
                    <Brain className="w-4 h-4" />
                </button>
            )}
            {!loading && !isLocked && <SpeechInput onTranscript={handleVoiceInput} language={language} />}
          </div>
         <div className="flex justify-between items-center mt-1 mb-1"><label className="text-sm font-medium text-slate-300 block">{t('email_context')}</label><div className="flex items-center gap-1 text-xs text-sky-400"><Link2 className="w-3 h-3" /> Sessão Isolada</div></div>
        <textarea aria-label={t('placeholder_context')} className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 resize-none focus:ring-1 focus:ring-sky-500 outline-none text-sm pr-10 text-slate-200" placeholder={t('placeholder_context')} value={localContext} onChange={(e) => setLocalContext(e.target.value)} disabled={loading || isLocked}></textarea>
      </div>
    </div>
  );

  const actions = (
      <button onClick={handleGenerate} disabled={loading || !localContext || isLocked} className="w-full bg-sky-600 hover:bg-sky-500 hover:shadow-sky-500/20 active:scale-95 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg uppercase tracking-widest">
        {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Send className="w-5 h-5" />}
        {loading ? 'Escrevendo...' : t('email_btn')}
      </button>
  );

  const mainContent = (
      <>
        {emails.length > 0 ? (
            <>
              <div className="bg-slate-900/50 p-1 border-b border-slate-800 rounded-t-xl overflow-x-auto no-scrollbar flex gap-1">{emails.map((_, idx) => (<button key={idx} onClick={() => setActiveEmailTab(idx)} className={`px-4 py-3 text-sm font-bold flex-1 whitespace-nowrap transition-colors ${activeEmailTab === idx ? 'bg-sky-600/20 text-sky-400 border-b-2 border-sky-500' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>{t('email_tab_prefix')} {idx + 1}</button>))}</div>
              <div className="prose prose-invert max-w-none overflow-y-auto custom-scrollbar flex-1 p-6 lg:p-10"><div className="whitespace-pre-wrap font-sans text-base lg:text-lg text-slate-300 leading-relaxed">{activeEmail?.content}</div>{loading && activeEmailTab === emails.length - 1 && <span className="inline-block w-2 h-4 bg-sky-500 animate-pulse ml-1 align-middle"></span>}{activeEmail?.note && (<div className="mt-8 p-4 bg-slate-800/50 border-l-4 border-yellow-400 rounded-r-lg animate-in fade-in"><h4 className="text-sm font-bold text-yellow-400 flex items-center gap-2"><Wand2 className="w-4 h-4" /> NOTA DO ESTRATEGISTA:</h4><p className="text-slate-300 italic mt-2 text-sm whitespace-pre-wrap">{activeEmail.note}</p></div>)}</div>
              <RefinementToolbar text={activeEmail?.content} onTextUpdate={handleEmailUpdate} language={language} titleForPDF={`${params.type} - Email ${activeEmailTab + 1}`} />
            </>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-600 min-h-[200px] p-6">{loading ? <Wand2 className="w-16 h-16 mb-4 animate-pulse text-sky-500" /> : <Mail className="w-16 h-16 mb-4 opacity-20" />}<p className="text-center text-slate-400">{loading ? 'Escrevendo...' : t('msg_wait_desc')}</p></div>
        )}
      </>
  );

  return (
    <ToolLayout
      title={t('email_title')}
      icon={Mail}
      iconColorClass="text-sky-400"
      description={emailHelpDescription}
      loading={loading}
      error={error}
      isLocked={isLocked}
      onToggleLock={() => setIsLocked(!isLocked)}
      sidebarContent={sidebarContent}
      actions={actions}
      mainContent={mainContent}
      hasResults={emails.length > 0}
    />
  );
}