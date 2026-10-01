
import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

export const generateVSLService = async (params: any, onChunk?: (text: string) => void) => {
    const prompt = `
    ⚠️ **MODO OPERAÇÃO: ROTEIRISTA VSL DE ALTA PATENTE (ITEM 2 & 24)** ⚠️
    
    TASK: Roteiro de Vendas (VSL) de Alta Conversão.
    FRAMEWORK: ${params.framework} | PRODUTO: ${params.productName}
    MECANISMO ÚNICO: ${params.uniqueMechanism}
    DOR PRINCIPAL: ${params.mainPain || 'deduza do contexto sem inventar dados'}
    OFERTA: ${params.offer || 'não informada'} | GARANTIA: ${params.guarantee || 'não informada'}
    CONTEXTO/BRIEFING DO USUÁRIO (verdade absoluta — ancorar dor, prova e oferta aqui, sem inventar dados): ${params.context || 'não informado'}
    LANGUAGE: ${params.language} (Adaptar gírias e cultura local - ITEM 13).

    ⚠️ **PROTOCOLO TELEPROMPTER (ITEM 2 + TEXTO PURO COPIA-COLA):**
    - Use pontuação rítmica para leitura em voz alta.
    - Sentenças curtas.
    - FALA PURA. PROIBIDO: "Cena 1", "Corta para", "Slide".
    - PROIBIDO Markdown no roteiro: sem *, **, #, -, —, –, •, >, numeração com ponto e crases. Apenas frases e parágrafos.
    - Comece na primeira palavra do Pitch.

    MANDATORY FORMAT:
    [Roteiro pronto para ler na câmera]
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    📊 **PARÂMETROS DE EXECUÇÃO:**
    - Motor IA: rota automática do sistema (ver indicador "via" na interface)
    - Framework: ${params.framework}
    - Ritmo: Teleprompter Ready

    🧠 **ESTRATÉGIA DE PERSUASÃO:**
    [Explique como o Mecanismo Único foi ancorado na copy]
    `;
    
    // VSL exige raciocínio superior para não ser genérico (Item 9)
    return callAI(prompt, "You are a World-Class VSL Scripter like Stefan Georgi or Jon Benson.", 'gemini-3-pro-preview', onChunk, { maxTokens: 8192 });
};
