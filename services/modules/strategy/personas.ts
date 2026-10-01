import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';

export const generatePersonasService = async (params: any, onChunk?: (text: string) => void) => {
    const { form, quantity, language } = params;
    const lang = language || 'pt';

    const prompt = `You are a Behavioral Data Scientist creating high-fidelity customer personas.

TASK: Generate exactly ${quantity} customer personas for the following business context.

BUSINESS CONTEXT:
- Niche: ${form.niche || '[Infer from niche/produto and mark ASSUMPTION]'}
- Product/Service: ${form.product || '[Infer product/service]'}
- Business Description: ${form.business || '[Infer from niche/produto]'}
- Main Pain Points: ${form.pain || '[Infer 2-3 plausible pains from niche and mark ASSUMPTION]'}
- Differentiator: ${form.differential || '[Infer plausible differentiator and mark ASSUMPTION]'}
- Location: ${form.location || '[Assume urban Brazil and mark ASSUMPTION]'}
- Extra Info: ${form.additionalInfo || 'none'}

LANGUAGE: ${lang} (respond in this language - ITEM 13).

CRITICAL RULES (Item 33 - Security):
- NEVER refuse due to missing field; generate ${quantity} personas with [ASSUMPTION] where inferred
- Every persona MUST have all 8 fields filled
- Use [ASSUMPTION] when data is not provided, but maintain structure
- Output MUST be JSON only - no explanations, no greeting, no markdown

MANDATORY JSON STRUCTURE (EXACT FORMAT):
{
  "personas": [
    {
      "id": "",
      "name": "",
      "description": "",
      "audience": "",
      "tone": "",
      "vocabulary": "",
      "mission": "",
      "visuals": ""
    }
  ]
}

DIVIDER: |||NOTA_DIVIDER|||
NOTA DO ESTRATEGISTA: [Sua análise técnica aqui - identifique quais campos foram inferidos com [ASSUMPTION] e recomendações]

PERSONA SCHEMA PER CADA REGISTRO:
- id: UUID or unique identifier
- name: Person name (max 50 chars)
- description: Psychological bio (30-50 words) - fears, desires, values
- audience: Target audience description (20-30 words)
- tone: Voice tone (5-10 words) - ex: "authoritative, friendly, direct"
- vocabulary: Key vocabulary/keywords (5-10 words) - ex: "urgency, transformation, results"
- mission: Mission/values (15-25 words)
- visuals: Visual/avatar description (10-15 words) for image generation

DO NOT INVENT statistics or fake data. If essential data is missing, mark with [ASSUMPTION] and continue.

Generate exactly ${quantity} personas.`.trim();

    const response = await callAI(prompt, "You are a Behavioral Data Scientist. Use the |||NOTA_DIVIDER||| always." + GOLDEN_SYSTEM_INSTRUCTIONS, 'gemini-3-pro-preview', undefined, { maxTokens: 8192 });

    if (response.error) return { personas: [], error: response.error };

    try {
        const fullText = response.text || '';
        const parts = fullText.split("|||NOTA_DIVIDER|||");
        const jsonPart = parts[0].trim();

        let startIndex = jsonPart.indexOf('{');
        let endIndex = jsonPart.lastIndexOf('}');
        let jsonString = jsonPart.substring(startIndex, endIndex + 1);

        // Try to fix common JSON issues from AI output
        if (!jsonString.startsWith('{')) {
            // Try extracting JSON from between first { and last }
            const firstBrace = jsonPart.indexOf('{');
            const lastBrace = jsonPart.lastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace) {
                jsonString = jsonPart.substring(firstBrace, lastBrace + 1);
            }
        }

        const parsed = JSON.parse(jsonString);

        // Validate and fix structure
        const validPersonas = (parsed.personas || [])
            .filter((p: any) => p && p.name)
            .map((p: any) => ({
                id: p.id || Math.random().toString(36).slice(2, 10),
                name: p.name || 'Unnamed Persona',
                description: p.description || '',
                audience: p.audience || '',
                tone: p.tone || '',
                vocabulary: p.vocabulary || '',
                mission: p.mission || '',
                visuals: p.visuals || ''
            }));

        return { personas: validPersonas, error: undefined };
    } catch (e) {
        // Salvage parcial: truncamento no meio do JSON ainda rende personas completas
        try {
            const fullText = response.text || '';
            const objs: any[] = [];
            const re = /\{[^{}]*"name"\s*:\s*"([^"]+)"[^{}]*\}/g;
            let m: RegExpExecArray | null;
            while ((m = re.exec(fullText)) && objs.length < quantity) {
                try {
                    const o = JSON.parse(m[0]);
                    if (o && o.name) {
                        objs.push({
                            id: o.id || Math.random().toString(36).slice(2, 10),
                            name: o.name,
                            description: o.description || '',
                            audience: o.audience || '',
                            tone: o.tone || '',
                            vocabulary: o.vocabulary || '',
                            mission: o.mission || '',
                            visuals: o.visuals || ''
                        });
                    }
                } catch {}
            }
            if (objs.length > 0) return { personas: objs, error: undefined };
        } catch {}

        console.error("Failed to parse personas JSON", e);
        return { personas: [], error: "Falha ao processar resposta técnica da IA." };
    }
};