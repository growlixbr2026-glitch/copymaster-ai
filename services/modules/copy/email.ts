import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { personaBlock } from './crewaiPersona';

// JSON Schema para Email Sequence estruturado (modo CrewAI)
export const EMAIL_SEQUENCE_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    emails: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          subjectLines: { type: 'array', items: { type: 'string' } },
          previewText: { type: 'string' },
          body: { type: 'string' },
          ps: { type: 'string' },
          strategistNote: { type: 'string' }
        },
        required: ['subjectLines', 'body']
      }
    },
    sequenceStrategy: { type: 'string' }
  },
  required: ['emails', 'sequenceStrategy']
};

export interface EmailParams {
  type: string;
  count: number;
  tone?: string;
  senderName?: string;
  targetAudience?: string;
  context: string;
  language: string;
  /** Ativa modo CrewAI com output JSON estruturado */
  useCrewAI?: boolean;
  /** ID da persona CrewAI (data/crewai-personas.ts) */
  crewPersona?: string;
}

export const generateEmailSequenceService = async (params: EmailParams, onChunk?: (text: string) => void) => {
  const { useCrewAI = false, ...p } = params;
  const count = Math.max(1, Math.min(Number(p.count) || 2, 5));
  
  if (useCrewAI) {
    // Modo CrewAI: output JSON estruturado
    const prompt = `
⚠️ **MODO CREWAI: EMAIL STRATEGIST + COPYWRITER** ⚠️
${personaBlock(p.crewPersona)}
TASK: Produza sequência de ${count} emails em JSON estruturado.

TIPO: ${p.type} | TOM: ${p.tone || 'não informado'} | PÚBLICO: ${p.targetAudience || 'não informado'}
REMETENTE: ${p.senderName || 'não informado'}
CONTEXTO/OFERTA: ${p.context}
LANGUAGE: ${p.language}

REGRAS:
- Cada email: 3 subject lines, preview text, body (200-400 words), PS
- Um 'Gancho Narrativo' diferente por email
- Email 1: Curiosidade | Email 2: Autoridade/Lógica | Email 3: Escassez/Medo | 4+: Prova Social, Story, Oferta
- Assuntos curtos, curiosos, 'Loop de Clique'
- Corpo: frases curtas, quebras rítmicas
- TEXTO PURO: sem *, **, #, -, —, •, >, numeração, crases
- Tom conversacional (escrevendo para um amigo)

OUTPUT: JSON conforme schema (emails[], sequenceStrategy)
`;
    return callAI(prompt, "You are a World-Class Email Sequence Strategist + Copywriter. Output ONLY valid JSON.", 'gemini-3-flash-preview', onChunk, { 
      responseMimeType: 'application/json', 
      responseSchema: EMAIL_SEQUENCE_RESPONSE_SCHEMA,
      maxTokens: 8192 
    });
  }

  // Modo tradicional (compatibilidade)
  const prompt = `
⚠️ **PROTOCOLO MASTER: MÁQUINA DE EMAIL (CONVERSÃO DIRETA)** ⚠️
${personaBlock(p.crewPersona)}

TASK: Escrever uma sequência de ${count} e-mails de alta conversão.
TIPO: ${p.type} | TOM: ${p.tone || 'não informado'} | PÚBLICO: ${p.targetAudience || 'não informado'}
REMETENTE (assinar cada e-mail com este nome quando fizer sentido): ${p.senderName || 'não informado'}
CONTEXTO/OFERTA: ${p.context}
LANGUAGE: ${p.language}

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
