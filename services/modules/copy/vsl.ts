import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { personaBlock } from './crewaiPersona';

// JSON Schema para VSL estruturado (modo CrewAI)
export const VSL_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          timestamp: { type: 'string' },
          content: { type: 'string' },
          hooks: { type: 'array', items: { type: 'string' } }
        },
        required: ['name', 'content']
      }
    },
    fullScript: { type: 'string' },
    cta: { type: 'string' },
    strategistNote: { type: 'string' }
  },
  required: ['blocks', 'fullScript', 'cta', 'strategistNote']
};

export interface VSLParams {
  framework: string;
  productName: string;
  uniqueMechanism?: string;
  offer?: string;
  guarantee?: string;
  mainPain?: string;
  context: string;
  language: string;
  /** Ativa modo CrewAI com output JSON estruturado */
  useCrewAI?: boolean;
  /** ID da persona CrewAI (data/crewai-personas.ts) */
  crewPersona?: string;
}


export const generateVSLService = async (params: VSLParams, onChunk?: (text: string) => void) => {
  const { useCrewAI = false, ...p } = params;
  
  if (useCrewAI) {
    // Modo CrewAI: output JSON estruturado
    const prompt = `
⚠️ **MODO CREWAI: VSL ARCHITECT + COPYWRITER + REVIEWER** ⚠️
${personaBlock(p.crewPersona)}
TASK: Produza VSL completa em JSON estruturado conforme schema.

PRODUTO: ${p.productName}
FRAMEWORK: ${p.framework}
MECANISMO ÚNICO: ${p.uniqueMechanism || 'não informado'}
DOR PRINCIPAL: ${p.mainPain || 'não informado'}
OFERTA: ${p.offer || 'não informado'} | GARANTIA: ${p.guarantee || 'não informado'}
CONTEXTO: ${p.context}
LANGUAGE: ${p.language}

ESTRUTURA OBRIGATÓRIA (12 blocos):
1. Pattern Interrupt (0:00-0:08) - Hook que quebra padrão
2. Empathy Bridge (0:08-1:30) - Conecta com dor real
3. Authority Establish (1:30-3:00) - Por que você?
4. Problem Agitation (3:00-6:00) - Inferno sem solução
5. Solution Reveal (6:00-9:00) - Mecanismo Único
6. Proof Stack (9:00-14:00) - Provas específicas
7. Offer Stack (14:00-17:00) - Valor + Bônus
8. Risk Reversal (17:00-18:30) - Garantia forte
9. Urgency/Scarcity (18:30-19:30) - Por que agora
10. Clear CTA (19:30-20:00) - Ação única
11. FAQ/Objections (opcional)
12. Final CTA + Lembrete

REGRAS TELEPROMPTER:
- Fala pura, pontuação rítmica, frases curtas
- PROIBIDO: "Cena", "Slide", "Corta", Markdown
- Open loops a cada ~60s
- Comece na primeira palavra do Pitch

OUTPUT: JSON conforme schema (blocks, fullScript, cta, strategistNote)
`;
    return callAI(prompt, "You are a World-Class VSL Architect + Copywriter + Reviewer. Output ONLY valid JSON.", 'gemini-3-pro-preview', onChunk, { 
      responseMimeType: 'application/json', 
      responseSchema: VSL_RESPONSE_SCHEMA,
      maxTokens: 8192 
    });
  }

  // Modo tradicional (compatibilidade)
  const prompt = `
⚠️ **MODO OPERAÇÃO: ROTEIRISTA VSL DE ALTA PATENTE (ITEM 2 & 24)** ⚠️
${personaBlock(p.crewPersona)}

TASK: Roteiro de Vendas (VSL) de Alta Conversão.
FRAMEWORK: ${p.framework} | PRODUTO: ${p.productName}
MECANISMO ÚNICO: ${p.uniqueMechanism || 'não informado'}
DOR PRINCIPAL: ${p.mainPain || 'não informado'}
OFERTA: ${p.offer || 'não informado'} | GARANTIA: ${p.guarantee || 'não informado'}
CONTEXTO/BRIEFING DO USUÁRIO (verdade absoluta — ancorar dor, prova e oferta aqui, sem inventar dados): ${p.context}
LANGUAGE: ${p.language} (Adaptar gírias e cultura local - ITEM 13).

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
- Framework: ${p.framework}
- Ritmo: Teleprompter Ready

🧠 **ESTRATÉGIA DE PERSUASÃO:**
[Explique como o Mecanismo Único foi ancorado na copy]
`;

  // VSL exige raciocínio superior para não ser genérico (Item 9)
  return callAI(prompt, "You are a World-Class VSL Scripter like Stefan Georgi or Jon Benson.", 'gemini-3-pro-preview', onChunk, { maxTokens: 8192 });
};
