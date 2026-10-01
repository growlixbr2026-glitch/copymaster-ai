import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS, VISUAL_MASTER_PROTOCOL } from '../../core/aiClient';
import { buildPlatformBlock, SESSION_HIERARCHY_RULE } from '../visual/platformProfiles';

export const generateYouTubeService = async (params: any, onChunk?: (text: string) => void) => {
    const isSEO = params.type === 'seo';
    const isThumb = params.type === 'thumbnail';
    const isScript = params.type === 'script';
    const platformBlock = isThumb ? buildPlatformBlock(params.engine, { aspectRatio: params.aspectRatio, customText: params.customText }) : '';

    const sourcePriorityRule = `
        - ⚠️ **REGRA CRÍTICA:** A "FONTE DE DADOS OBRIGATÓRIA" (o roteiro) é a verdade absoluta. As "INSTRUÇÕES DO USUÁRIO" são apenas para refinar detalhes (ex: "foco no olhar do personagem"), NUNCA para mudar o tópico central.`;

    let specificProtocol = '';
    let notePrompt = '';

    if (isScript) {
        specificProtocol = `
        ⚠️ **PROTOCOLO ROTEIRO DE RETENÇÃO (REGRA #2 & #29)** ⚠️
        - TASK: Roteiro para vídeo de ${params.duration}s (~${Math.ceil(params.duration/60)} min).
        - ESTRUTURA: Gancho (30s), Desenvolvimento (com picos de curiosidade), CTA.
        - FALA PURA (TELEPROMPTER): Proibido [Cena], [Corta], [Slide]. Use pontuação rítmica.
        - TEXTO PURO COPIA-COLA: proibido *, **, #, -, —, •, >, numeração com ponto e crases. Apenas frases e parágrafos.
        - SAÍDA: Entregue APENAS o texto do roteiro.`;
        notePrompt = `**NOTA DO ESTRATEGISTA (AUDITORIA DE PERFORMANCE):**
        - **Análise da Estratégia:** [Explique a "Anatomia da Retenção" usada no roteiro e por que ela funciona para o YouTube].`;
    } else if (isSEO) {
        specificProtocol = `
        ⚠️ **PROTOCOLO SEO RANKING (GROUNDING ATIVO)** ⚠️
        - TASK: Pacote de otimização de SEO para o roteiro em anexo.
        - GROUNDING: Use Google Search para validar palavras-chave de alto volume.
        ${sourcePriorityRule}
        - ESTRUTURA DE SAÍDA OBRIGATÓRIA:
          **TÍTULOS MAGNÉTICOS (03 OPÇÕES):**
          1. [Título com gancho de curiosidade]
          2. [Título com gancho de benefício]
          3. [Título com palavra-chave forte]

          **DESCRIÇÃO OTIMIZADA (ESTRUTURA AIDA):**
          [Parágrafo de Atenção, Interesse, Desejo e Ação]

          **PALETA DE TAGS ESTRATÉGICAS (20 OPÇÕES):**
          [Lista de tags separadas por vírgula, misturando cauda longa e curta]`;
        notePrompt = `**NOTA DO ESTRATEGISTA (AUDITORIA DE PERFORMANCE):**
        - **Análise da Estratégia:** [Justifique a escolha das palavras-chave principais e como os títulos geram cliques].`;
    } else if (isThumb) {
        const textPrompt = params.customText ? `e texto curto e impactante ("${params.customText}")` : '';
        specificProtocol = `
        ${VISUAL_MASTER_PROTOCOL}
        ⚠️ **PROTOCOLO THUMBNAIL CLICKBAIT MRBEAST (REGRA #5)** ⚠️
        - TASK: Gere 03 prompts técnicos em INGLÊS para thumbnails (3 versões para teste A/B).
        ${sourcePriorityRule}
        - REGRA DOS 3 ELEMENTOS (nunca 4+): 1) rosto dominante com emoção extrema legível no mobile (ocupa 40%+ do frame, boca fechada performou melhor em A/B), 2) UM objeto de contexto que sinaliza o assunto, 3) texto overlay de 3 a 5 palavras ${textPrompt}.
        - TEXTO COMPLEMENTA O TÍTULO, NUNCA REPETE: o overlay abre um ângulo novo que conversa com o título do vídeo.
        - CONTRASTE ANTI-UI: amarelo+preto ou equivalentes saturados que se destacam do feed branco/vermelho do YouTube; PROIBIDO thumbnails predominantemente azuis ou brancas (derretem na interface).
        - ESTÉTICA SELECIONADA: "${params.style || 'Automático (IA adapta ao roteiro)'}" — o traço/paleta/clima dos 3 prompts OBEDECE a esta estética.
        - CURIOSITY GAP VISUAL: mostre a pergunta, não a resposta (setup dramático ou comparação "$1 vs $1.000" que só o clique resolve).
        - CLAREZA MOBILE: composição em terços, sujeito separado do fundo (rim light ou recorte limpo), sem poluição.
        - MATRIZ 10-STEPS: OBRIGATÓRIO seguir a estrutura para cada opção.
        - BLOQUEIO (REGRA #6): PROIBIDO usar "Usar a imagem em anexo".
        - TECH SPECS: --ar ${params.aspectRatio?.replace(/[^0-9:]/g, '') || '16:9'}.
        - SEPARADOR: Use "|||YT_OPTION_DIVIDER|||" entre as 3 opções, sempre em linha própria e exato.
        - SESSION FUNCTION: clickbait thumbnail IMAGE prompts (not script, not SEO). Respect every user selector: engine ${params.engine}, style "${params.style || 'automatic'}", ratio ${params.aspectRatio}${params.customText ? `, hook text "${params.customText}" (encurtar para 3-5 palavras complementares ao título, nunca repetir o título)` : ', no hook text (visual-only curiosity)'}. Output MUST be entirely in technical ENGLISH. Entregue APENAS os 3 prompts finais, sem repetir rótulos.

        === TARGET ENGINE SYNTAX (mandatory, overrides generic protocol) ===
        ${platformBlock}
        ${SESSION_HIERARCHY_RULE}`;
        notePrompt = `**NOTA DO ESTRATEGISTA (AUDITORIA DE PERFORMANCE):**
        RESUMO_LEGADO_PARA_NOTA_RICA`;
    }

    const prompt = `
    ⚠️ **MODO OPERAÇÃO: YOUTUBE GROWTH HACKER (REGRA #24)** ⚠️
    
    ${specificProtocol}
    
    CONTEXTO-BASE: ${params.context}
    IDIOMA-ALVO: ${params.language}

    === FORMATO DE SAÍDA ===
    Entregue APENAS o ativo final conforme o protocolo (sem cabeçalhos de seção, sem repetir rótulos).
    |||NOTA_DIVIDER|||
    ${notePrompt}
    `;

    const model = (isSEO || isScript) ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    const main = await callAI(prompt, GOLDEN_SYSTEM_INSTRUCTIONS, model, onChunk, {
        tools: isSEO ? [{ googleSearch: {} }] : undefined,
        taskType: isThumb ? 'visual' : 'text',
        maxTokens: 8192
    });

    // Nota rica dedicada (transparência/auditoria): 2ª chamada que explica
    // o que foi feito, como, por quê e com quais seletores — sem custo
    // para os modos de texto, só thumbnail.
    if (!isThumb || main.error || !main.text) return main;
    const mainContent = main.text.split('|||NOTA_DIVIDER|||')[0].trim();
    // Anti-lixo: 2ª chamada só sobre conteúdo real (nunca sobre eco/placeholder).
    if (mainContent.length < 200) return { text: mainContent };
    const richNotePrompt = `
    RELATÓRIO DE TRANSPARÊNCIA DO ESTRATEGISTA (modo auditoria, texto puro em ${params.language}, PROIBIDO Markdown):
    Você gerou 3 prompts de thumbnail. Explique ao usuário, nestas seções exatas:

    PARÂMETROS ESCOLHIDOS
    Liste cada seletor usado nesta geração e o valor: Plataforma IA = ${params.engine}; Estética = ${params.style}; Proporção = ${params.aspectRatio}; Texto de gancho = ${params.customText || 'automático (IA criou)'}; Duração do vídeo = ${params.duration || 'não informada'}.

    O QUE FOI FEITO
    Descreva em 2 frases o que cada uma das 3 opções entrega (rosto/objeto/texto).

    COMO FOI FEITO
    Quais regras MrBeast foram aplicadas em cada opção (3 elementos, emoção extrema, contraste anti-UI, texto 3-5 palavras complementar ao título, rosto dominante, curiosity gap).

    POR QUE ASSIM
    A tese de clique de cada opção: qual psicologia (cores, emoção, curiosidade) deve elevar o CTR e por quê. Feche indicando qual opção testar primeiro em A/B e o que observar.

    THUMBNAILS GERADOS:
    ${mainContent.slice(0, 2500)}
    `;
    const rich = await callAI(richNotePrompt, 'Você é o Estrategista-chefe explicando seu trabalho com transparência total. Texto puro, sem Markdown.', 'gemini-3-flash-preview', undefined, { taskType: 'visual' });
    if (rich.error || !rich.text) return main;
    return { text: `${mainContent}\n|||NOTA_DIVIDER|||\n${rich.text.trim()}` };
};
