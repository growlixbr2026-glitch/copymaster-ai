
import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

export const generateEmailSequenceService = async (params: any, onChunk?: (text: string) => void) => {
    // Sequências longas estouram o teto dos modelos gratuitos e degradam todos
    // os e-mails: 5 por geração (o usuário repete com outro ângulo p/ mais).
    const count = Math.max(1, Math.min(Number(params.count) || 2, 5));
    const prompt = `
    ⚠️ **PROTOCOLO MASTER: MÁQUINA DE EMAIL (CONVERSÃO DIRETA)** ⚠️
    
    TASK: Escrever uma sequência de ${count} e-mails de alta conversão.
    TIPO: ${params.type} | TOM: ${params.tone} | PÚBLICO: ${params.targetAudience}
    REMETENTE (assinar cada e-mail com este nome quando fizer sentido): ${params.senderName || 'não informado'}
    CONTEXTO/OFERTA: ${params.context}
    LANGUAGE: ${params.language}

    ⚠️ **REGRA DE OURO #9 (ÂNGULO ÚNICO):**
    - Cada e-mail deve ter um "Gancho Narrativo" diferente.
    - E-mail 1: Gancho de Curiosidade.
    - E-mail 2: Gancho de Autoridade/Lógica (sem jargão científico falso, sem percentuais de efeito, sem nomes de clientes inventados).
    - E-mail 3: Gancho de Escassez/Medo de Perder.
    - E-mail 4 em diante: rotacione Prova Social, Story de transformação e Oferta direta (nunca repita um ângulo já usado).

    ⚠️ **REQUISITO TÉCNICO:**
    - Assuntos (Subject Lines) curtos, curiosos e que gerem o "Loop de Clique".
    - Corpo do e-mail com frases curtas e quebras de linha rítmicas.
    - TEXTO PURO COPIA-COLA no assunto e no corpo: proibido *, **, #, -, —, •, >, numeração com ponto e crases. Apenas frases e parágrafos.
    - Use "|||EMAIL_DIVIDER|||" para separar os e-mails, sempre em linha própria e exato.
    - Estrutura OBRIGATÓRIA por e-mail, nesta ordem exata:
      Assunto: [texto]
      Corpo: [texto]
      |||NOTA_DIVIDER|||
      **NOTA DO ESTRATEGISTA:** [1 frase: por que este assunto abre?]
    - O "|||EMAIL_DIVIDER|||" vem SEMPRE depois da nota do e-mail anterior, nunca antes do Assunto.

    FORMATO (exemplo mínimo de encadeamento com 2 e-mails):
    Assunto: [Texto do e-mail 1]
    Corpo: [Texto do e-mail 1]
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:** [Por que este assunto vai abrir?]
    |||EMAIL_DIVIDER|||
    Assunto: [Texto do e-mail 2]
    Corpo: [Texto do e-mail 2]
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:** [Por que este assunto vai abrir?]
    `;
    return callAI(prompt, "You are a World-Class Direct Response Email Copywriter.", 'gemini-3-flash-preview', onChunk, { maxTokens: 8192 });
};
