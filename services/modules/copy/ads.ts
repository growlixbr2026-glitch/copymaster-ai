
import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { personaBlock } from './crewaiPersona';

export const generateAdsService = async (params: any, onChunk?: (text: string) => void) => {
    const prompt = `
    ⚠️ **MODO OPERAÇÃO: GESTOR DE PERFORMANCE (ITEM 24)** ⚠️
    ${personaBlock(params?.crewPersona)}
    TASK: 03 Variações de Anúncios de Alta Performance (TESTE A/B).
    PLATAFORMA: ${params.platform} | OBJETIVO: ${params.goal}
    PRODUTO: ${params.productName} | OFERTA: ${params.offer || 'não informada'}
    PÚBLICO: ${params.targetAudience || 'amplo'} | CONTEXTO: ${params.context}
    LANGUAGE: ${params.language}

    ⚠️ **REGRA DE OURO #16 (LIMITES TÉCNICOS):**
    - Respeite rigorosamente os limites de caracteres da plataforma ${params.platform}.
    - Google Ads: Títulos máx 30, Descrições máx 90.
    - Meta Ads: Headline curta, Texto Principal persuasivo.

    ⚠️ **REGRA DE OURO #10 (CURADOR MESTRE):**
    Apresente apenas as 3 melhores variações com ângulos de ataque distintos.

    MANDATORY: Use "|||ADS_DIVIDER|||" entre variações, sempre em linha própria e exato.
    TEXTO PURO COPIA-COLA em cada variação: proibido *, **, #, -, —, •, >, numeração com ponto e crases. Apenas frases e parágrafos.
    
    |||NOTA_DIVIDER|||
    **NOTA DO ESPECIALISTA (AUDITORIA V22):**
    📊 **ESTRATÉGIA DE LANCES:** Por que estas chamadas maximizam o CTR?
    `;
    return callAI(prompt, "You are a Paid Media Specialist.\n" + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', onChunk, { maxTokens: 8192 });
};
