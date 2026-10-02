import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { personaBlock } from './crewaiPersona';

export interface OutreachParams {
    recipientName?: string;
    recipientCompany?: string;
    recipientRole?: string;
    valueProposition: string;
    channel?: string;
    tone?: string;
    sequenceLength?: number;
    language?: string;
    crewPersona?: string;
}

export const generateOutreachService = async (params: OutreachParams, onChunk?: (text: string) => void) => {
    const channel = params.channel || 'email';
    const tone = params.tone || 'consultivo';
    const sequenceLength = params.sequenceLength || 3;

    const prompt = `
    ⚠️ **MODO OPERAÇÃO: SALES OUTREACH (2026)** ⚠️
    ${personaBlock(params.crewPersona)}
    
    ⚠️ **HIERARQUIA DE VERDADE:**
    - DESTINATÁRIO: ${params.recipientName || 'não informado'} | ${params.recipientCompany || 'não informada'} | ${params.recipientRole || 'não informado'}
    - PROPOSTA DE VALOR: ${params.valueProposition}
    - CANAL: ${channel}
    - TOM: ${tone}
    - TAMANHO DA SEQUÊNCIA: ${sequenceLength} mensagens
    
    ⚠️ **DIRETRIZ DE QUALIDADE:**
    - Crie uma sequência de outreach personalizada.
    - Cada mensagem deve ter: assunto (se email), corpo, call-to-action.
    - Tom ${tone} em todas as mensagens.
    - Não invente dados — use [INSERIR DADO] quando necessário.
    
    ⚠️ **FORMATO DE RESPOSTA MANDATÓRIO:**
    Texto puro, sem Markdown. Divisores em linha própria.
    
    Estrutura:
    [MENSAGEM 1]
    |||EMAIL_DIVIDER|||
    [MENSAGEM 2]
    |||EMAIL_DIVIDER|||
    [MENSAGEM 3]
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    `;

    const systemInstruction = `ATUE COMO: Especialista em Vendas B2B e Outreach. Conhece sequências de e-mail, LinkedIn e cold calling. Siga a Constitution da IA rigorosamente.\n${GOLDEN_SYSTEM_INSTRUCTIONS}`;

    return callAI(prompt, systemInstruction, 'gemini-3-pro-preview', onChunk, { maxTokens: 8192 });
};
