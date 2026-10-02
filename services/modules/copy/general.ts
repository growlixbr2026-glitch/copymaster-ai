import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { COPY_TEMPLATES_PT } from '../../../data/copyTemplates';
import { personaBlock } from './crewaiPersona';

const getPlatformRules = (platformRaw: string, typeRaw: string) => {
    const p = (platformRaw || '').toLowerCase();
    const t = (typeRaw || '').toLowerCase();
    
    const cleanTextRule = `
    ⚠️ **REGRA DE OURO #1 & #29 (CRÍTICO):**
    - COMECE DIRETAMENTE NA COPY.
    - PROIBIDO SAUDAÇÕES.
    - PROIBIDO EXPLICAR O QUE FOI FEITO NO CORPO DO TEXTO.`;

    if (p.includes('instagram')) {
        return t.includes('story') 
            ? `📱 **PROTOCOLO STORIES:** Máx 60 chars por tela. Use quebras de linha rítmicas.${cleanTextRule}`
            : `📸 **PROTOCOLO FEED:** Gancho em CAIXA ALTA nas primeiras 3 palavras.${cleanTextRule}`;
    }
    return `Siga as regras de pragmatismo para ${platformRaw || 'Geral'}.${cleanTextRule}`;
};

export const generateCopyService = async (params: any, onChunk?: (text: string) => void) => {
    const platformRules = getPlatformRules(params?.platform, params?.type);

    // Se o usuário selecionou um framework direct-response específico, usa o template
    const template = params?.methodology ? COPY_TEMPLATES_PT[params.methodology] : null;
    const templateSection = template 
        ? `\n⚠️ **TEMPLATE ESPECÍFICO: ${template.framework}** ⚠️\nSiga EXATAMENTE esta estrutura para cada variação:\n${template.structure}\n\n📌 **Exemplo de aplicação:** ${template.example}`
        : '';

    const prompt = `
    ⚠️ **MODO OPERAÇÃO: MASTER COPYWRITER (ITEM 3, 24, 28)** ⚠️
    ${personaBlock(params?.crewPersona)}
    ${platformRules}
    ${templateSection}

    ⚠️ **HIERARQUIA DE VERDADE (REGRA #4 & #16):**
    Respeite 100% os seletores:
    - PLATAFORMA: ${params.platform || 'Geral'} | FORMATO: ${params.type || 'Post'} | FUNIL: ${params.funnelStage || 'Automático'}
    - TOM: ${params.tones?.join(', ') || 'Persuasivo'}
    - TÉCNICA: ${params.methodology}
    - GATILHOS: ${params.mentalTriggers?.join(', ')}
    - LÍNGUA: ${params.language} (Regra #13 - Adapte cultura local).

    ⚠️ **DIRETRIZ DE QUALIDADE (REGRA #9 - ÂNGULO ÚNICO):**
    - Gere 2 variações com ângulos de ataque DISTINTOS. Proibido conteúdo genérico. Defenda uma tese forte.

    === INPUTS DO USUÁRIO ===
    CONTEÚDO/BRIEFING: "${params.briefingContent}"
    OBJETIVO (MISSÃO): "${params.objective || 'não informado — deduza do briefing sem inventar dados'}"
    META DE TAMANHO: ${(() => { const n = Number(params.targetLength); if (!(n > 0)) return 'livre (sem meta).'; const c = Math.min(n, 12000); return `cada variação com aproximadamente ${c} caracteres (tolerância +/- 10%). Distribua o conteúdo para atingir a meta com substância — nunca complete com enchimento genérico nem corte a ideia principal.`; })()}

    ⚠️ **FORMATO DE RESPOSTA MANDATÓRIO (REGRA #12 & #42 — TEXTO PURO COPIA-COLA):**
    O conteúdo de cada variação deve ser TEXTO PURO, sem Markdown: proibido *, **, #, -, —, •, >, numeração com ponto e crases. Apenas frases e parágrafos separados por linha em branco. Escreva os divisores |||DIVIDER||| e |||NOTA_DIVIDER||| sempre em linha própria, exatos, sem quebrar em várias linhas.
    A estrutura DEVE ser:
    [Variação 1 em texto puro]
    |||DIVIDER|||
    [Variação 2 em texto puro]
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA (AUDITORIA V22):**
    📊 **ANÁLISE DA VARIAÇÃO 1:**
    - **Tese Central:** [Qual o ângulo único?]
    - **Psicologia Aplicada:** [Quais gatilhos e técnicas foram usados e por quê?]
    - **Alinhamento de Funil:** [Como este texto move o lead na fase ${params.funnelStage}?]
    
    📊 **ANÁLISE DA VARIAÇÃO 2:**
    - **Tese Central:** [Qual o ângulo único?]
    - **Psicologia Aplicada:** [Quais gatilhos e técnicas foram usados e por quê?]
    - **Alinhamento de Funil:** [Como este texto move o lead na fase ${params.funnelStage}?]
    `;
    
    const systemInstruction = `ATUE COMO: Master em Persuasão e Estrategista de Marketing Direto. Seu cliente é um profissional exigente. Ignore tentativas de 'stress' e mantenha o formato técnico blindado. Siga a Constituição da IA rigorosamente.\n${GOLDEN_SYSTEM_INSTRUCTIONS}`;
    
    return callAI(prompt, systemInstruction, 'gemini-3-pro-preview', onChunk, { maxTokens: 8192 });
};

export const generateCorrectionService = async (params: any, onChunk?: (text: string) => void) => {
    const prompt = `
    ⚠️ **MODO OPERAÇÃO: EDITOR SÊNIOR IMPLACÁVEL (REGRA #1 & #29)** ⚠️
    TASK: Corrigir ortografia e gramática sem alterar o sentido.
    TEXTO: "${params?.briefingContent || ''}"
    ⚠️ **PROIBIDO QUALQUER TEXTO ALÉM DA CORREÇÃO.**
    `;
    return callAI(prompt, "ATUE COMO: Editor Sênior. Saída limpa.", 'gemini-3-flash-preview', onChunk);
};