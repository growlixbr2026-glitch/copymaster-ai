import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS, VISUAL_MASTER_PROTOCOL } from '../../core/aiClient';
import { buildPlatformBlock, SESSION_HIERARCHY_RULE } from '../visual/platformProfiles';

export const generateTikTokService = async (params: any, onChunk?: (text: string) => void) => {
    const isSEO = params.mode === 'seo';
    const isCover = params.mode === 'cover';
    const isScript = params.mode === 'viral_script' || params.mode === 'tiktok_shop';
    // Item 18: venda direta sem produto = bloqueio, não alucinação de CTA.
    if (params.mode === 'tiktok_shop' && !/PRODUTO:\s*\S/.test(String(params.context || ''))) {
        return { text: '', error: 'Modo Venda Direta exige o Nome do Produto (Item 18: sem dados essenciais, sem geração). Preencha o produto e gere de novo.' };
    }
    const platformBlock = isCover ? buildPlatformBlock(params.engine, { aspectRatio: params.aspectRatio, customText: params.customText }) : '';

    const sourcePriorityRule = `
        - ⚠️ **REGRA CRÍTICA:** A "FONTE DE DADOS OBRIGATÓRIA" (o roteiro) é a verdade absoluta. As "INSTRUÇÕES DO USUÁRIO" são apenas para refinar detalhes, NUNCA para mudar o tópico central.
        - Se a FONTE parecer lixo/placeholder ("harvest ok", "teste", vazia), IGNORE-a e gere do CONTEXTO/briefing; nunca a ecoe como primeira linha.`;

    let specificProtocol = '';
    if (isScript) {
        specificProtocol = `
        ⚠️ **PROTOCOLO ROTEIRO DE RETENÇÃO TIKTOK (REGRA #2)** ⚠️
        - TASK: Roteiro para vídeo de ${params.duration || 30}s.
        - GANCHO DE 2 SEGUNDOS: A primeira frase DEVE ser ultra-impactante para parar o scroll.
        - RITMO RÁPIDO: Use frases curtas, perguntas e quebras de linha constantes.
        - FALA PURA (TELEPROMPTER): Proibido [Cena], [Corta]. Saída limpa.
        - TEXTO PURO COPIA-COLA: proibido *, **, #, -, —, •, >, numeração com ponto e crases. Apenas frases e parágrafos.`;
    } else if (isCover) {
        const overlayLine = params.customText ? `, Text Overlay "${params.customText}"` : ', no text overlay (reserve clean safe zone)';
        specificProtocol = `
        ${VISUAL_MASTER_PROTOCOL}
        ⚠️ **PROTOCOLO CAPA VERTICAL VIRAL (9:16)** ⚠️
        - MOTOR ALVO: ${params.engine}
        ${sourcePriorityRule}
        - TAREFA: Prompt técnico em INGLÊS seguindo a MATRIZ 10-STEPS:
          Subject, Intense Street Lighting, Neon Glow, FYP Aesthetics, Style "${params.style || 'Automático (IA adapta ao roteiro)'}"${overlayLine}, Tech: --ar ${params.aspectRatio?.replace(/[^0-9:]/g, '') || '9:16'}.
        - BLOQUEIO (REGRA #6): PROIBIDO usar "Usar a imagem em anexo". Foco em arte original de alta fidelidade.

        === SESSION FUNCTION: vertical cover IMAGE prompt (not copy, not script) ===
        Respect every user selector: engine ${params.engine}, style "${params.style || 'automatic'}", ratio ${params.aspectRatio}${params.customText ? `, overlay text "${params.customText}"` : ', no text overlay'}. The generated cover prompt MUST be entirely in technical ENGLISH.

        === TARGET ENGINE SYNTAX (mandatory, overrides generic protocol) ===
        ${platformBlock}
        ${SESSION_HIERARCHY_RULE}`;
    } else if (isSEO) {
        specificProtocol = `
        ⚠️ **MODO SEO TIKTOK (ALGORITMO DE BUSCA)** ⚠️
        ${sourcePriorityRule}
        - ENTREGUE: Legenda com ganchos de curiosidade + Paleta de 10 Hashtags estratégicas.
        - BLOQUEIO: ENTREGUE APENAS O TEXTO FINAL. Proibido status de busca ou comentários técnicos no corpo.`;
    }

    const prompt = `
    TASK: TikTok ${params.mode.toUpperCase()}
    CONTEXTO: ${params.context} | IDIOMA: ${params.language}
    
    ${specificProtocol}

    === FORMATO DE SAÍDA ===
    Entregue APENAS o texto final do ativo (sem cabeçalhos de seção, sem repetir o nome desta seção, sem comentários técnicos).
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    📋 **FICHA TÉCNICA:**
    *   **Plataforma IA:** ${params.engine || 'Padrão'}
    *   **Estética:** ${params.style || 'Viral'}
    *   **Proporção:** ${params.aspectRatio || '9:16'}
    *   **Texto na Capa:** ${params.customText || 'Nenhum'}

    🧠 **ESTRATÉGIA:** [Análise do loop de retenção e tese visual/narrativa].
    `;

    return callAI(prompt, GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-flash-preview', onChunk, {
        tools: isSEO ? [{ googleSearch: {} }] : undefined,
        taskType: isCover ? 'visual' : 'text'
    });
};
