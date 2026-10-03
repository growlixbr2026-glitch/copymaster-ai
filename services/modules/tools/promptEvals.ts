// ═══════════════════════════════════════════════════════════════════════════
// PROMPT EVALS — Sistema de avaliação de qualidade de prompts
// Inspirado em: promptfoo/promptfoo (LLM evals)
// ═══════════════════════════════════════════════════════════════════════════

import { callAI } from '../../core/aiClient';

export interface EvalResult {
  testName: string;
  passed: boolean;
  score: number;
  expected: string;
  actual: string;
  feedback: string;
}

export interface EvalSuite {
  name: string;
  description: string;
  tests: EvalResult[];
  overallScore: number;
  timestamp: number;
}

// Casos de teste para avaliar qualidade de prompts
const EVAL_TEST_CASES = [
  {
    name: 'copy_persuasivo',
    description: 'Copy persuasiva com CTA claro',
    prompt: 'Gere uma copy persuasiva para um curso de marketing digital',
    expectedElements: ['benefício', 'CTA', 'urgência', 'proposta de valor'],
    minLength: 200,
  },
  {
    name: 'roteiro_teleprompter',
    description: 'Roteiro em formato teleprompter',
    prompt: 'Gere um roteiro de 30 segundos para um vídeo sobre produtividade',
    expectedElements: ['gancho', 'desenvolvimento', 'CTA'],
    minLength: 150,
  },
  {
    name: 'email_marketing',
    description: 'E-mail marketing com assunto e corpo',
    prompt: 'Gere um e-mail de boas-vindas para uma newsletter de tecnologia',
    expectedElements: ['assunto', 'saudação', 'corpo', 'assinatura'],
    minLength: 100,
  },
  {
    name: 'prompt_visual',
    description: 'Prompt visual em inglês técnico',
    prompt: 'Gere um prompt para Midjourney de uma foto de produto',
    expectedElements: ['subject', 'lighting', 'composition', 'style'],
    minLength: 100,
    mustBeInEnglish: true,
  },
  {
    name: 'resposta_comentario',
    description: 'Resposta a comentário com autoridade',
    prompt: 'Gere uma resposta para um comentário crítico no Instagram',
    expectedElements: ['empatia', 'resposta', 'pergunta'],
    minLength: 80,
  },
];

export const promptEvals = {
  /**
   * Executa todos os testes de avaliação
   */
  async runAllTests(): Promise<EvalSuite> {
    const results: EvalResult[] = [];
    
    for (const testCase of EVAL_TEST_CASES) {
      const result = await this.runSingleTest(testCase);
      results.push(result);
    }
    
    const overallScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    
    return {
      name: 'CopyMaster AI Prompt Evals',
      description: 'Avaliação de qualidade dos prompts do sistema',
      tests: results,
      overallScore,
      timestamp: Date.now(),
    };
  },

  /**
   * Executa um único teste
   */
  async runSingleTest(testCase: typeof EVAL_TEST_CASES[0]): Promise<EvalResult> {
    try {
      const response = await callAI(
        testCase.prompt,
        'Você é um especialista em marketing e copywriting. Gere conteúdo de alta qualidade.',
        'gemini-3-flash-preview'
      );
      
      if (response.error) {
        return {
          testName: testCase.name,
          passed: false,
          score: 0,
          expected: testCase.expectedElements.join(', '),
          actual: response.error,
          feedback: 'Erro na chamada ao LLM',
        };
      }
      
      const text = response.text || '';
      const lowerText = text.toLowerCase();
      
      // Verifica elementos esperados
      const foundElements = testCase.expectedElements.filter(el => 
        lowerText.includes(el.toLowerCase())
      );
      
      // Verifica comprimento mínimo
      const hasMinLength = text.length >= testCase.minLength;
      
      // Verifica idioma (se aplicável)
      const isCorrectLanguage = testCase.mustBeInEnglish 
        ? this.detectLanguage(text) === 'en'
        : true;
      
      // Calcula score
      const elementScore = foundElements.length / testCase.expectedElements.length;
      const lengthScore = hasMinLength ? 1 : text.length / testCase.minLength;
      const languageScore = isCorrectLanguage ? 1 : 0.5;
      
      const score = Math.round((elementScore * 0.5 + lengthScore * 0.3 + languageScore * 0.2) * 100);
      const passed = score >= 70;
      
      return {
        testName: testCase.name,
        passed,
        score,
        expected: testCase.expectedElements.join(', '),
        actual: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
        feedback: passed 
          ? 'Todos os elementos esperados encontrados' 
          : `Faltando: ${testCase.expectedElements.filter(el => !foundElements.includes(el)).join(', ')}`,
      };
    } catch (error: any) {
      return {
        testName: testCase.name,
        passed: false,
        score: 0,
        expected: testCase.expectedElements.join(', '),
        actual: error.message,
        feedback: 'Erro inesperado',
      };
    }
  },

  /**
   * Detecta idioma do texto (simplificado)
   */
  detectLanguage(text: string): 'pt' | 'en' | 'es' | 'unknown' {
    const lowerText = text.toLowerCase();
    
    // Palavras comuns em inglês
    const enWords = ['the', 'and', 'for', 'with', 'this', 'that', 'from'];
    // Palavras comuns em português
    const ptWords = ['de', 'da', 'do', 'para', 'com', 'este', 'esse', 'que'];
    // Palavras comuns em espanhol
    const esWords = ['el', 'la', 'de', 'que', 'en', 'un', 'una', 'por'];
    
    const enCount = enWords.filter(w => lowerText.includes(w)).length;
    const ptCount = ptWords.filter(w => lowerText.includes(w)).length;
    const esCount = esWords.filter(w => lowerText.includes(w)).length;
    
    if (enCount > ptCount && enCount > esCount) return 'en';
    if (ptCount > enCount && ptCount > esCount) return 'pt';
    if (esCount > enCount && esCount > ptCount) return 'es';
    return 'unknown';
  },

  /**
   * Gera relatório de evals
   */
  generateReport(suite: EvalSuite): string {
    const lines = [
      '# Relatório de Avaliação de Prompts',
      '',
      `**Suite:** ${suite.name}`,
      `**Data:** ${new Date(suite.timestamp).toLocaleString()}`,
      `**Score Geral:** ${suite.overallScore.toFixed(1)}%`,
      '',
      '## Resultados',
      '',
    ];
    
    for (const test of suite.tests) {
      const status = test.passed ? '✅' : '❌';
      lines.push(`### ${status} ${test.testName}`);
      lines.push(`- **Score:** ${test.score}%`);
      lines.push(`- **Esperado:** ${test.expected}`);
      lines.push(`- **Feedback:** ${test.feedback}`);
      lines.push('');
    }
    
    return lines.join('\n');
  },
};
