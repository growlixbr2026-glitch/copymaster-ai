import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS, VISUAL_MASTER_PROTOCOL } from '../../core/aiClient';
import { buildPlatformBlock, SESSION_HIERARCHY_RULE } from '../visual/platformProfiles';

export const generateReelsService = async (params: any, onChunk?: (text: string) => void) => {
    const isSEO = params.mode === 'seo';
    const isCover = params.mode === 'cover';
    const isScript = params.mode === 'viral_script' || params.mode === 'sales_promo';
    // Item 18: venda sem produto = bloqueio, não alucinação de oferta.
    if (params.mode === 'sales_promo' && !/PRODUTO:\s*\S/.test(String(params.context || ''))) {
        return { text: '', error: 'Modo Venda exige o Nome do Produto (Item 18: sem dados essenciais, sem geração). Preencha o produto e gere de novo.' };
    }
    const platformBlock = isCover ? buildPlatformBlock(params.engine, { aspectRatio: params.aspectRatio, customText: params.customText }) : '';

    const sourcePriorityRule = `
        - ⚠️ **REGRA CRÍTICA:** A "FONTE OBRIGATÓRIA" (o roteiro) é a verdade absoluta. As "DIRETRIZES DE REFINAMENTO" são apenas para detalhes, NUNCA para mudar o tópico.
        - Se a FONTE parecer lixo/placeholder ("harvest ok", "teste", vazia), IGNORE-a e gere do CONTEXTO/briefing; nunca a ecoe como primeira linha.`;

    let specificProtocol = '';
    if (isScript) {
        specificProtocol = `
        ⚠️ **PROTOCOLO ROTEIRO REELS (REGRA #2 & #9)** ⚠️
        - TASK: Roteiro para vídeo de ${params.duration || 30}s.
        - GANCHO VISUAL & TEXTUAL: A primeira frase e a primeira cena devem ser magnéticas.
        - CURIOSITY LOOP: Termine com uma pergunta ou afirmação que incentive o replay e comentários.
        - FALA PURA (TELEPROMPTER): Proibido [Cena], [Corta]. Saída 100% limpa e pronta para narração.
        - TEXTO PURO COPIA-COLA: proibido *, **, #, -, —, •, >, numeração com ponto e crases. Apenas frases e parágrafos.`;
    } else if (isCover) {
        const textOverlay = params.customText ? `, texto "${params.customText}"` : ', sem texto (reserve safe zone limpa)';
        specificProtocol = `
        ${VISUAL_MASTER_PROTOCOL}
        ⚠️ **PROTOCOLO CAPA DE FEED INSTAGRAM (GRID HARMONY)** ⚠️
        - MOTOR ALVO: ${params.engine}
        ${sourcePriorityRule}
        - TAREFA: Prompt para ${params.engine} em INGLÊS.
        - MATRIZ 10-STEPS: Detalhe profundidade de campo rasa (bokeh), iluminação suave de estúdio, paleta luxuosa, Style "${params.style || 'Automático (IA adapta ao roteiro)'}"${textOverlay} e enquadramento centralizado (Safe Zone). Tech: --ar ${params.aspectRatio?.replace(/[^0-9:]/g, '') || '4:5'}.
        - BLOQUEIO (REGRA #6): NÃO use "Usar a imagem em anexo".
        - SESSION FUNCTION: feed cover IMAGE prompt (not caption, not script). Respect every user selector: engine ${params.engine}, style "${params.style || 'automatic'}", ratio ${params.aspectRatio}${params.customText ? `, overlay "${params.customText}"` : ', no text overlay'}. Output MUST be entirely in technical ENGLISH. Entregue APENAS o prompt final, sem repetir rótulos de seção.

        === TARGET ENGINE SYNTAX (mandatory, overrides generic protocol) ===
        ${platformBlock}
        ${SESSION_HIERARCHY_RULE}`;
    } else if (isSEO) {
        specificProtocol = `
        ⚠️ **MODO LEGENDA ESTRATÉGICA (REGRA #1 & #29)** ⚠️
        ${sourcePriorityRule}
        - TAREFA: Legenda estruturada (Gancho -> Conteúdo -> CTA -> Hashtags).
        - BLOQUEIO: Proibido ruído de busca ou explicações iniciais.`;
    }

    const prompt = `
    TASK: Instagram Reels ${params.mode.toUpperCase()}
    CONTEXTO: ${params.context} | IDIOMA: ${params.language}
    
    ${specificProtocol}

    === ESTRUTURA DE SAÍDA ===
    Entregue APENAS o ativo final (sem cabeçalhos de seção, sem repetir rótulos).
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    📋 **FICHA TÉCNICA:**
    *   **Plataforma IA:** ${params.engine || 'Padrão'}
    *   **Estética:** ${params.style || 'High-End'}
    *   **Proporção:** ${params.aspectRatio || '4:5'}
    *   **Texto Customizado:** ${params.customText || 'Nenhum'}

    🧠 **POSICIONAMENTO:** [Análise de tom e posicionamento de autoridade no Grid].
    `;

    return callAI(prompt, GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', onChunk, {
        tools: isSEO ? [{ googleSearch: {} }] : undefined,
        taskType: isCover ? 'visual' : 'text'
    });
};
