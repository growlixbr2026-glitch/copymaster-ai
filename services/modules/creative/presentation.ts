import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

export const generatePresentationService = async (params: any, onChunk?: (text: string) => void) => {
    const prompt = `
    ⚠️ **PROTOCOLO MASTER: ESTRATEGISTA DE PITCH DECKS (GROUNDING ATIVADO)** ⚠️
    
    TASK: Gerar o roteiro técnico e persuasivo de um Pitch Deck para ${params.platform}.
    ESTRUTURA: ${params.slideCount} Slides.
    PÚBLICO-ALVO: ${params.audience}
    OBJETIVO: ${params.purpose || 'Automático'}
    ESTILO: ${params.style}
    CONTEXTO/DADOS: ${params.context}
    LANGUAGE: ${params.language}

    ⚠️ **REGRA DE OURO #1 (PRAGMATISMO):** 
    - Comece IMEDIATAMENTE no "SLIDE 01". 
    - Não use frases de introdução como "Aqui está seu roteiro".
    - O texto deve ser denso e pronto para ser copiado para os slides.

    ⚠️ **PESQUISA DE MERCADO (GROUNDING):**
    Utilize o Google Search para encontrar 02 estatísticas ou tendências REAIS (2024-2025) sobre o setor mencionado no contexto para validar os slides de "Oportunidade" ou "Mercado".

    ⚠️ **ARQUITETURA POR SLIDE:**
    Para cada slide, siga este padrão rigoroso:
    [SLIDE XX: TÍTULO IMPACTANTE]
    - CONTEÚDO VISUAL (Bullets/Gráficos): [O que deve estar escrito no slide]
    - SUGESTÃO VISUAL: [Prompt curto em inglês para imagem de fundo]
    - NOTAS DO ORADOR: [Script persuasivo focado em converter ${params.audience}]

    ⚠️ **FORMATO DO CABEÇALHO (OBRIGATÓRIO — ITEM 35):**
    Cada slide DEVE começar exatamente assim: [SLIDE 01: TÍTULO]
    Exemplo válido: [SLIDE 01: O PROBLEMA QUE NINGUÉM VÊ]
    PROIBIDO usar "###", "**Slide", "Slide 1:" ou qualquer outro formato de cabeçalho.
    Responda exatamente ao solicitado, sem expandir seções extras.

    FORMATO DE SAÍDA:
    [Conteúdo de todos os slides seguindo a regra acima]
    
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    Análise técnica do Storytelling aplicado (Framework PAS ou AIDA) e resumo dos dados reais encontrados via Grounding.
    `;

    return callAI(
        prompt, 
        "You are a World-Class Pitch Deck Consultant. Your mission is to provide high-stakes presentation scripts with zero noise and real market data.", 
        'gemini-3-pro-preview', 
        onChunk, 
        { tools: [{ googleSearch: {} }], maxTokens: 8192 }
    );
};

export const generateInfographicService = async (params: any, onChunk?: (text: string) => void) => {
    const { buildPlatformBlock, SESSION_HIERARCHY_RULE } = await import('../visual/platformProfiles');
    const { VISUAL_MASTER_PROTOCOL } = await import('../../core/aiClient');
    const platformBlock = buildPlatformBlock(params.aiModel, {
        aspectRatio: params.aspectRatio || '1:1',
        customText: params.footer || undefined,
    });
    const prompt = `
    ⚠️ **MODO OPERAÇÃO: DATA DESIGNER + VISUAL ENGINEER (ITEM 5 & 24)** ⚠️
    TASK: Plan an infographic based on: ${params.context}
    ESTILO: ${params.style || 'Automático'} | LAYOUT: ${params.layout || 'Automático'}
    MOTOR/PLATAFORMA: ${params.aiModel || 'automático'} | ${params.platform || 'geral'} | ${params.aspectRatio || '1:1'}
    ${params.referenceImages && params.referenceImages.length > 0 ? `REFERÊNCIA VISUAL ANEXADA (${params.referenceImages.length} imagem(ns), modo ${params.referenceMode || 'creative'}): manter fidelidade de estilo e paleta descritos a partir da referência.` : 'SEM IMAGEM ANEXADA: crie estilo e paleta a partir dos DADOS e do LAYOUT; nunca alegue anexo.'}
    Language: ${params.language}
    ${VISUAL_MASTER_PROTOCOL}
    ${platformBlock}
    ${SESSION_HIERARCHY_RULE}
    MANDATORY: Use Google Search to validate data.
    ESTRUTURA MÍNIMA: 4+ blocos numerados "BLOCO N: [DADO PT] + [VISUAL EN curto: chart/icon/layout]". Sem dado real → escreva [INSERIR DADO], nunca texto genérico. PROIBIDO apresentar URL de busca como fonte sem ter buscado.
    
    FORMAT:
    [Infographic Structure & Visual Prompts]
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    🧠 **Hierarquia de Informação:** [Explicação técnica]
    `;
    return callAI(prompt, "You are a Data Expert.", 'gemini-3-flash-preview', onChunk, {
        tools: [{ googleSearch: {} }],
        taskType: 'visual',
        images: params.referenceImages || [],
        maxTokens: 8192,
    });
};