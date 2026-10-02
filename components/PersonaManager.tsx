import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Save, Trash2, CheckCircle, Edit, UserCheck, Briefcase, Sparkles, Wand2, Target, AlertTriangle, MapPin, Building, PlusCircle, CheckCircle2, Download, Image as ImageIcon, Maximize2, X, Camera, ScanFace, AlertCircle, Home, Brain } from 'lucide-react';
import { Persona } from '../types';
import { getPersonas, savePersona, deletePersona, setActivePersonaId, getActivePersonaId, personaToContext } from '../services/personaService';
import { generatePersonasService, generateImagePromptService } from '../services/geminiService';
import { downloadPDF } from '../services/pdfService';
import { splitNotaBlock } from '../utils/stripCopyFormat';
import { useTranslation } from '../hooks/useTranslation';
import { getLocalizedLists, IMAGE_AIS } from '../constants';
import { SectionHelp } from './SectionHelp';
import { OutputKindBadge } from './ToolLayout';
import { toFriendlyError } from '../services/friendlyErrors';
import SpeechInput from './SpeechInput';
import { useSharedContext } from '../contexts/SharedContext';

interface PersonaManagerProps {
  language: string;
}

const PersonaManager: React.FC<PersonaManagerProps> = ({ language }) => {
  const { sharedContext, setSharedContext, setActiveTab: setAppActiveTab } = useSharedContext();
  const { t, langCode } = useTranslation(language);
  const { imageStyles, videoRatios } = getLocalizedLists(langCode);
  
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoGenError, setAutoGenError] = useState<string | null>(null);
  
  const [expandedPersona, setExpandedPersona] = useState<Persona | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'portrait'>('profile');

  const [portraitConfig, setPortraitConfig] = useState({ ai: IMAGE_AIS[0], style: imageStyles[0], ratio: '3:4 (Retrato/3x4)' });
  const [portraitPrompt, setPortraitPrompt] = useState('');
  const [generatingPortrait, setGeneratingPortrait] = useState(false);
  const [portraitError, setPortraitError] = useState<string | null>(null);

  const [autoGenForm, setAutoGenForm] = useState({ niche: '', business: '', product: '', pain: '', differential: '', location: '', additionalInfo: '' });
  const [autoGenQty, setAutoGenQty] = useState(3);

  const emptyPersona: Persona = { id: '', name: '', description: '', audience: '', tone: '', vocabulary: '', mission: '', visuals: '' };
  const [currentPersona, setCurrentPersona] = useState<Persona>(emptyPersona);

  const personaHelpDescription = `
O que é o Gerenciador de Personas:
Este é o "Cérebro Estratégico" da sua aplicação. Uma persona não é apenas um nome; é um conjunto de medos, desejos, valores e um vocabulário específico. Ao ativar uma persona, você garante que toda copy, roteiro ou anúncio gerado nas outras ferramentas tenha uma consistência absoluta de marca.
`;

  useEffect(() => { loadData(); }, []);
  const loadData = () => { setPersonas(getPersonas()); setActiveId(getActivePersonaId()); };

  const handleEdit = (persona?: Persona) => { setCurrentPersona(persona ? persona : { ...emptyPersona, id: Date.now().toString() }); setIsEditing(true); setIsAutoGenerating(false); setExpandedPersona(null); };
  const handleSave = () => { if (!currentPersona.name) return alert('O nome é obrigatório'); savePersona(currentPersona); setIsEditing(false); loadData(); };
  const handleDelete = (id: string) => { if (confirm('Tem certeza que deseja excluir esta persona?')) { deletePersona(id); loadData(); if (expandedPersona?.id === id) setExpandedPersona(null); } };
  const handleActivate = (persona: Persona) => { setActivePersonaId(persona.id); setActiveId(persona.id); setSharedContext(personaToContext(persona)); alert(t('persona_msg_activated')); };

  const handleAutoGenerate = async () => {
    if (!autoGenForm.product || !autoGenForm.niche) return alert("Por favor, preencha o Nicho e o Produto.");
    setLoading(true); setAutoGenError(null);
    const { personas: generatedPersonas, error } = await generatePersonasService({ form: autoGenForm, quantity: autoGenQty, language: language });
    if (error) { setAutoGenError(toFriendlyError(error)); } else if (generatedPersonas && generatedPersonas.length > 0) {
      generatedPersonas.forEach(p => savePersona(p));
      // Atualiza o contexto compartilhado para a primeira persona gerada
      if (generatedPersonas.length > 0) setSharedContext(personaToContext(generatedPersonas[0]));
      loadData();
      setIsAutoGenerating(false);
      setAutoGenForm({ niche: '', business: '', product: '', pain: '', differential: '', location: '', additionalInfo: '' });
    } else { setAutoGenError("A IA não retornou personas válidas. Tente novamente com mais detalhes."); }
    setLoading(false);
  };

  const handleGeneratePortrait = async () => {
      if (!expandedPersona) return;
      setGeneratingPortrait(true); setPortraitError(null); setPortraitPrompt('');
      const hasVisuals = safeString(expandedPersona.visuals).length > 5;
      const visualContext = hasVisuals ? `PHYSICAL TRAITS: ${safeString(expandedPersona.visuals)}\n\nADDITIONAL CONTEXT: ${safeString(expandedPersona.description)}` : `PROFILE (Deduce physical appearance from this): ${safeString(expandedPersona.description)}\n\nROLE: ${safeString(expandedPersona.name)}`;
      const { text: fullResponse, error } = await generateImagePromptService({ aiModel: portraitConfig.ai, style: portraitConfig.style, aspectRatio: portraitConfig.ratio, customText: '', context: visualContext, platform: 'Persona Portrait', language: language });
      if (error) { 
        setPortraitError(toFriendlyError(error)); 
      } else if (fullResponse) {
        setPortraitPrompt(splitNotaBlock(fullResponse).content);
      }
      setGeneratingPortrait(false);
  };

  const downloadPersonaPDF = (p: Persona) => { const content = `NOME: ${safeString(p.name)}\n\nSOBRE:\n${safeString(p.description)}\n\nPÚBLICO E DORES:\n${safeString(p.audience)}\n\nTOM DE VOZ:\n${safeString(p.tone)}\n\nVOCABULÁRIO:\n${safeString(p.vocabulary)}\n\nMISSÃO:\n${safeString(p.mission)}\n\nVISUAL (Para IA):\n${safeString(p.visuals) || 'N/A'}`; downloadPDF(`Persona - ${safeString(p.name)}`, content); };
  const safeString = (val: any): string => { if (typeof val === 'string') return val; if (val === null || val === undefined) return ''; if (typeof val === 'object') return JSON.stringify(val); return String(val); };

  const handleVoiceBusiness = (text: string) => { setAutoGenForm({...autoGenForm, business: autoGenForm.business + ' ' + text}); };
  const handleVoiceExtra = (text: string) => { setAutoGenForm({...autoGenForm, additionalInfo: autoGenForm.additionalInfo + ' ' + text}); };
  const handleVoiceDesc = (text: string) => { setCurrentPersona({...currentPersona, description: currentPersona.description + ' ' + text}); };
  const handleVoiceAudience = (text: string) => { setCurrentPersona({...currentPersona, audience: currentPersona.audience + ' ' + text}); };

  if (isEditing) {
    return (
      <div className="max-w-4xl mx-auto h-full overflow-y-auto custom-scrollbar p-1">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-6 border-b border-slate-800 pb-4"><UserPlus className="w-6 h-6 text-emerald-400" />{currentPersona.name ? t('persona_edit') : t('persona_new')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-400 mb-1">{t('persona_name')}</label><input aria-label={t('persona_name')} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-emerald-500" placeholder={t('persona_placeholder_name')} value={currentPersona.name} onChange={(e) => setCurrentPersona({...currentPersona, name: e.target.value})} /></div>
            
            <div className="relative">
                <div className="absolute right-2 top-8 z-10"><SpeechInput onTranscript={handleVoiceDesc} language={language} /></div>
                <label className="block text-sm font-medium text-slate-400 mb-1">{t('persona_desc')}</label><textarea aria-label={t('persona_desc')} className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-emerald-500 resize-none pr-10" value={currentPersona.description} onChange={(e) => setCurrentPersona({...currentPersona, description: e.target.value})}></textarea>
            </div>
            
            <div className="relative">
                <div className="absolute right-2 top-8 z-10"><SpeechInput onTranscript={handleVoiceAudience} language={language} /></div>
                <label className="block text-sm font-medium text-slate-400 mb-1">{t('persona_audience')}</label><textarea aria-label={t('persona_audience')} className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-emerald-500 resize-none pr-10" value={currentPersona.audience} onChange={(e) => setCurrentPersona({...currentPersona, audience: e.target.value})}></textarea>
            </div>
            
            <div><label className="block text-sm font-medium text-slate-400 mb-1">{t('persona_tone')}</label><input aria-label={t('persona_tone')} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-emerald-500" value={currentPersona.tone} onChange={(e) => setCurrentPersona({...currentPersona, tone: e.target.value})} /></div>
            <div><label className="block text-sm font-medium text-slate-400 mb-1">{t('persona_mission')}</label><input aria-label={t('persona_mission')} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-emerald-500" value={currentPersona.mission} onChange={(e) => setCurrentPersona({...currentPersona, mission: e.target.value})} /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-400 mb-1">{t('persona_vocab')}</label><input aria-label={t('persona_vocab')} type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-emerald-500" value={currentPersona.vocabulary} onChange={(e) => setCurrentPersona({...currentPersona, vocabulary: e.target.value})} /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-400 mb-1">{t('persona_visuals')}</label><textarea aria-label="Descrição física para geração de imagem..." className="w-full h-20 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-emerald-500 resize-none" value={currentPersona.visuals || ''} onChange={(e) => setCurrentPersona({...currentPersona, visuals: e.target.value})} placeholder="Descrição física para geração de imagem..." ></textarea></div>
          </div>
          <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-800"><button onClick={() => setIsEditing(false)} className="px-6 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">{t('persona_cancel')}</button><button onClick={handleSave} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg flex items-center gap-2"><Save className="w-4 h-4" /> {t('persona_save')}</button></div>
        </div>
      </div>
    );
  }

  if (isAutoGenerating) {
    return (
      <div className="max-w-2xl mx-auto h-full flex items-center justify-center p-4 overflow-y-auto custom-scrollbar">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl w-full animate-in zoom-in-95 duration-300 my-auto">
              <div className="text-center mb-8">
                  <div className="inline-flex p-3 bg-indigo-500/10 rounded-full mb-4"><Sparkles className="w-8 h-8 text-indigo-400" /></div>
                  <h2 className="text-2xl font-bold text-white mb-2">{t('persona_auto_title')}</h2>
                  <p className="text-slate-400">{t('persona_auto_desc')}</p>
              </div>
              <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="block text-sm font-medium text-slate-300 mb-2">{t('persona_lbl_niche')}</label>
                        <input aria-label={t('persona_lbl_niche')} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500 pr-10" placeholder="Ex: Finanças, Fitness..." value={autoGenForm.niche} onChange={(e) => setAutoGenForm({...autoGenForm, niche: e.target.value})} />
                        {sharedContext && <button onClick={() => setAutoGenForm({...autoGenForm, niche: sharedContext})} className="absolute right-3 top-[38px] text-indigo-400 hover:text-white transition-colors"><Brain className="w-4 h-4"/></button>}
                      </div>
                      <div><label className="block text-sm font-medium text-slate-300 mb-2">{t('persona_lbl_location')}</label><input aria-label="Ex: São Paulo, Brasil..." className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500" placeholder="Ex: São Paulo, Brasil..." value={autoGenForm.location} onChange={(e) => setAutoGenForm({...autoGenForm, location: e.target.value})} /></div>
                  </div>
                  
                  <div className="relative">
                      <div className="absolute right-2 top-8 z-10 flex gap-2">
                        {sharedContext && <button onClick={() => setAutoGenForm({...autoGenForm, business: sharedContext})} className="p-2 bg-indigo-500/10 text-indigo-400 rounded-full hover:bg-indigo-500 hover:text-white transition-all"><Brain className="w-4 h-4"/></button>}
                        <SpeechInput onTranscript={handleVoiceBusiness} language={language} />
                      </div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">{t('persona_lbl_business')}</label><textarea aria-label="Ex: Escola de inglês focada em conversação para adultos..." className="w-full h-20 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500 resize-none pr-10" placeholder="Ex: Escola de inglês focada em conversação para adultos..." value={autoGenForm.business} onChange={(e) => setAutoGenForm({...autoGenForm, business: e.target.value})}></textarea>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <label className="block text-sm font-medium text-slate-300 mb-2">{t('persona_lbl_product')}</label>
                        <input aria-label={t('persona_lbl_product')} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500 pr-10" placeholder="Ex: Curso Online..." value={autoGenForm.product} onChange={(e) => setAutoGenForm({...autoGenForm, product: e.target.value})} />
                        {sharedContext && <button onClick={() => setAutoGenForm({...autoGenForm, product: sharedContext})} className="absolute right-3 top-[38px] text-indigo-400 hover:text-white transition-colors"><Brain className="w-4 h-4"/></button>}
                      </div>
                      <div><label className="block text-sm font-medium text-slate-300 mb-2">{t('persona_lbl_diff')}</label><input aria-label="Ex: Aulas de 15min..." className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500" placeholder="Ex: Aulas de 15min..." value={autoGenForm.differential} onChange={(e) => setAutoGenForm({...autoGenForm, differential: e.target.value})} /></div>
                  </div>
                  <div><label className="block text-sm font-medium text-slate-300 mb-2">{t('persona_lbl_pain')}</label><input aria-label="Ex: Medo de falar errado, falta de tempo..." className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500" placeholder="Ex: Medo de falar errado, falta de tempo..." value={autoGenForm.pain} onChange={(e) => setAutoGenForm({...autoGenForm, pain: e.target.value})} /></div>
                  
                  <div className="relative">
                      <div className="absolute right-2 top-8 z-10"><SpeechInput onTranscript={handleVoiceExtra} language={language} /></div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">{t('persona_lbl_extra')}</label><textarea aria-label={t('persona_lbl_extra')} className="w-full h-20 bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500 resize-none pr-10" placeholder="Ex: O público valoriza muito flexibilidade e humor..." value={autoGenForm.additionalInfo} onChange={(e) => setAutoGenForm({...autoGenForm, additionalInfo: e.target.value})}></textarea>
                  </div>

                  <div><label className="block text-sm font-medium text-slate-300 mb-2">{t('persona_auto_qty')}</label><div className="flex gap-2">{[1, 2, 3].map(qty => ( <button key={qty} onClick={() => setAutoGenQty(qty)} className={`flex-1 py-3 rounded-lg font-bold transition-all border ${ autoGenQty === qty ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'}`} >{qty}</button>))}</div></div>
                  {autoGenError && ( <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm flex items-center gap-2" role="alert" aria-live="assertive"><AlertCircle className="w-4 h-4" /> {autoGenError}</div>)}
                  <div className="flex gap-3 pt-4"><button onClick={() => setIsAutoGenerating(false)} className="flex-1 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors font-medium" >{t('persona_cancel')}</button><button onClick={handleAutoGenerate} disabled={loading || !autoGenForm.product} className="flex-[2] bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95" >{loading ? <Wand2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />} {loading ? t('btn_generating') : t('persona_auto_btn')}</button></div>
              </div>
          </div>
      </div>
    );
  }

  if (expandedPersona) {
    return (
        <div className="h-full flex flex-col relative bg-slate-950">
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">{safeString(expandedPersona.name).charAt(0).toUpperCase()}</div>
                    <div><h2 className="text-xl font-bold text-white">{safeString(expandedPersona.name)}</h2><div className="flex items-center gap-2 text-sm text-slate-400"><Briefcase className="w-3 h-3" /><span className="truncate max-w-xs">{safeString(expandedPersona.audience || 'Geral').split('.')[0]}</span></div></div>
                </div>
                <button onClick={() => setExpandedPersona(null)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="flex border-b border-slate-800 bg-slate-900/30 px-6">
                <button onClick={() => setActiveTab('profile')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'profile' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}`}>{t('persona_tab_profile')}</button>
                <button onClick={() => setActiveTab('portrait')} className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'portrait' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-white'}`}>{t('persona_tab_portrait')}</button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8">
                {activeTab === 'profile' ? (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in">
                        <div className="space-y-2"><h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">{t('persona_desc')}</h3><p className="text-lg text-slate-200 leading-relaxed whitespace-pre-wrap">{safeString(expandedPersona.description)}</p></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800"><h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Target className="w-4 h-4" /> {t('persona_audience')}</h3><p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">{safeString(expandedPersona.audience)}</p></div>
                            <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-800"><h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4" /> {t('persona_mission')}</h3><p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">{safeString(expandedPersona.mission)}</p></div>
                        </div>
                        <div className="space-y-2"><h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">{t('persona_tone')}</h3><div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50 text-slate-300">{safeString(expandedPersona.tone)}</div></div>
                        <div className="space-y-2"><h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500"/> {t('persona_vocab')}</h3><p className="text-slate-300 leading-relaxed">{safeString(expandedPersona.vocabulary)}</p></div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto animate-in fade-in">
                        <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
                            <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 p-6 border-b border-slate-700">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2"><Camera className="w-6 h-6 text-indigo-400" /> {t('persona_tab_portrait')}</h3>
                                <p className="text-indigo-200/70 text-sm mt-1">Crie um rosto realista para sua persona usar em perfis, sites e apresentações.</p>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase">{t('label_ai_model')}</label><select aria-label={t('label_ai_model')} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500 text-sm" value={portraitConfig.ai} onChange={(e) => setPortraitConfig({...portraitConfig, ai: e.target.value})}>{IMAGE_AIS.map(i => <option key={i} value={i}>{i}</option>)}</select></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase">{t('persona_portrait_style')}</label><select aria-label={t('persona_portrait_style')} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500 text-sm" value={portraitConfig.style} onChange={(e) => setPortraitConfig({...portraitConfig, style: e.target.value})}>{imageStyles.map(style => (<option key={style} value={style}>{style}</option>))}</select></div>
                                    <div><label className="block text-xs font-bold text-slate-500 mb-2 uppercase">{t('label_aspect_ratio')}</label><select aria-label={t('label_aspect_ratio')} className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-slate-200 outline-none focus:border-indigo-500 text-sm" value={portraitConfig.ratio} onChange={(e) => setPortraitConfig({...portraitConfig, ratio: e.target.value})}><option value="3:4">3:4 (Retrato/3x4)</option><option value="1:1">1:1 (Quadrado/Perfil)</option><option value="4:5">4:5 (Instagram Portrait)</option><option value="16:9">16:9 (Paisagem/Capa)</option></select></div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2"><label className="text-sm font-medium text-slate-400">Contexto Analisado pela IA</label><div className={`text-xs px-2 py-1 rounded font-bold flex items-center gap-1 ${safeString(expandedPersona.visuals).length > 5 ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400'}`}>{safeString(expandedPersona.visuals).length > 5 ? <><CheckCircle2 className="w-3 h-3"/> Fonte: Descrição Física Manual</> : <><ScanFace className="w-3 h-3"/> Fonte: Dedução Automática (Perfil)</>}</div></div>
                                    <div className="bg-slate-950 p-4 rounded-lg text-slate-300 text-sm italic border border-slate-800 leading-relaxed">"{safeString(expandedPersona.visuals) || safeString(expandedPersona.description).substring(0, 150) + '...'}"</div>
                                </div>
                                {portraitError && ( <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm flex items-center gap-2" role="alert" aria-live="assertive"><AlertCircle className="w-4 h-4" /> {portraitError}</div>)}
                                <button onClick={handleGeneratePortrait} disabled={generatingPortrait} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-900/20">{generatingPortrait ? <Wand2 className="animate-spin w-5 h-5" /> : <Camera className="w-5 h-5" />} {t('persona_gen_portrait')}</button>
                                {portraitPrompt && ( <div className="bg-slate-950 border border-indigo-900/50 rounded-xl p-6 mt-6 animate-in slide-in-from-bottom-2"><div className="flex justify-between items-center mb-4"><span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Prompt Gerado</span><button onClick={() => navigator.clipboard.writeText(portraitPrompt)} className="text-slate-400 hover:text-white text-xs flex items-center gap-1 transition-colors"><CheckCircle2 className="w-3 h-3" /> Copiar</button></div><p className="text-slate-300 text-sm font-mono leading-relaxed">{portraitPrompt}</p></div>)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3"><Users className="w-8 h-8 text-emerald-400" /> {t('persona_title')} <OutputKindBadge kind="text" /></h2>
                <SectionHelp title={t('persona_title')} description={personaHelpDescription} sessionId="personas" />
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setAppActiveTab('home')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-500/80 hover:text-emerald-300 hover:bg-emerald-500/20 transition-all border border-transparent"
                    title="Voltar para o Início"
                >
                    <Home className="w-4 h-4" />
                    <span className="hidden sm:inline">Início</span>
                </button>
                <button onClick={() => setIsAutoGenerating(true)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-indigo-900/20 flex items-center gap-2 transition-all active:scale-95"><Sparkles className="w-4 h-4" /> {t('persona_auto_btn')}</button>
                <button onClick={() => handleEdit()} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg font-bold text-sm border border-slate-700 flex items-center gap-2 transition-all active:scale-95"><PlusCircle className="w-4 h-4" /> {t('persona_new')}</button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {personas.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Users className="w-16 h-16 mb-4" />
                    <p className="text-lg font-medium text-slate-400">{t('persona_empty')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {personas.map(persona => (
                        <div key={persona.id} className={`group bg-slate-900 border rounded-xl p-5 transition-all hover:shadow-xl hover:-translate-y-1 relative overflow-hidden ${activeId === persona.id ? 'border-emerald-500/50 shadow-emerald-900/10' : 'border-slate-800 hover:border-slate-700'}`}>
                            {activeId === persona.id && ( <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1"><CheckCircle className="w-3 h-3" /> ATIVA</div>)}
                            
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-400 group-hover:text-white group-hover:bg-slate-700 transition-colors">
                                    {persona.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setExpandedPersona(persona)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors" title="Expandir e Ver Detalhes"><Maximize2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleEdit(persona)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-400 transition-colors" title="Editar"><Edit className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(persona.id)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-red-400 transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-1 truncate">{persona.name}</h3>
                            <p className="text-sm text-slate-400 mb-4 line-clamp-2 h-10">{persona.description}</p>

                            <div className="flex flex-wrap gap-2 mb-4">
                                <span className="text-xs bg-slate-950 text-slate-500 px-2 py-1 rounded border border-slate-800">{persona.audience.split(' ')[0]}...</span>
                                <span className="text-xs bg-slate-950 text-slate-500 px-2 py-1 rounded border border-slate-800">{persona.tone.split(' ')[0]}...</span>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleActivate(persona)}
                                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${activeId === persona.id ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 cursor-default' : 'bg-slate-800 text-slate-300 hover:bg-emerald-600 hover:text-white'}`}
                                >
                                    {activeId === persona.id ? <UserCheck className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                                    {activeId === persona.id ? t('persona_active') : t('persona_activate')}
                                </button>
                                <button 
                                    onClick={() => downloadPersonaPDF(persona)}
                                    className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg border border-slate-800 transition-colors"
                                    title="Baixar PDF"
                                >
                                    <Download className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default PersonaManager;