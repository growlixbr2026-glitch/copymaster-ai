
import { callAI, GOLDEN_SYSTEM_INSTRUCTIONS } from '../../core/aiClient';
import { toFriendlyError } from '../../friendlyErrors';

export const analyzeImageContextService = async (base64Image: string, language: string) => {
  const prompt = `
    ⚠️ **MODO OPERAÇÃO: ANALISTA VISUAL (ITEM 20 & 24)** ⚠️
    
    TASK: Analyze this image and extract content for copywriting.
    
    MANDATORY STRUCTURE:
    **FATOS VISUAIS (ITEM 20):**
    [Liste apenas o que é visível: objetos, cores, textos detectados, pessoas, ambiente]

    **ANÁLISE DE MOOD:**
    [Sentimentos e atmosfera transmitidos]

    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    🧠 **Interpretação Estratégica:**
    [Sua opinião profissional sobre como usar esta imagem em uma campanha de marketing]
  `;
  
  // FIX: Updated model name from gemini-2.5-flash to gemini-3-flash-preview.
  return callAI(
      prompt,
      GOLDEN_SYSTEM_INSTRUCTIONS,
      'gemini-3-flash-preview',
      undefined,
      { images: [base64Image] }
  );
};

export const analyzePdfContextService = async (base64Pdf: string, language: string) => {
  const prompt = `
    ⚠️ **MODO OPERAÇÃO: ANALISTA DE DOCUMENTOS (ITEM 20 & 24)** ⚠️
    TASK: Deep analysis of this PDF.
    
    MANDATORY STRUCTURE:
    **CONTEÚDO FACTUAL (ITEM 20):** [Dados, estatísticas e afirmações brutas do PDF]
    **RESUMO EXECUTIVO:** [Principais pontos]
    
    |||NOTA_DIVIDER|||
    **NOTA DO ESTRATEGISTA:**
    🧠 **Insights de Mercado:** [Sua análise sobre os dados encontrados]
  `;
  
  // Via callAI (ponto único de I/O): roteamento de provider, cofre, fallback,
  // quota tracking e friendly errors — sem `new GoogleGenAI` direto.
  try {
      if (!base64Pdf || typeof base64Pdf !== 'string') {
          throw new Error("Conteúdo do PDF inválido ou vazio.");
      }
      const raw = base64Pdf.includes(',') ? base64Pdf.split(',')[1] : base64Pdf;
      const response = await callAI(
          prompt,
          GOLDEN_SYSTEM_INSTRUCTIONS,
          'gemini-3-flash-preview',
          undefined,
          { images: [{ data: raw, mimeType: 'application/pdf' }] }
      );
      if (response.error) return { text: '', error: response.error };
      return { text: response.text || '' };
  } catch (e: any) {
      return { text: '', error: toFriendlyError(e?.message || e) };
  }
};
