// ═══════════════════════════════════════════════════════════════════════════
// COST OPTIMIZATION SERVICE — Otimização de custos para chamadas LLM
// Inspirado em: anthropics/claude-cookbooks (cost_optimization.ipynb)
// ═══════════════════════════════════════════════════════════════════════════

import { getProviderSettings } from './usageService';

export interface CostEstimate {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

export interface OptimizationSuggestion {
  type: 'model_downgrade' | 'prompt_shorten' | 'cache_hit' | 'batch';
  description: string;
  potentialSavings: number;
  priority: 'high' | 'medium' | 'low';
}

// Custos aproximados por 1k tokens (USD) — atualizado 2026
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'openai/gpt-4o': { input: 0.0025, output: 0.01 },
  'openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'openai/gpt-4-turbo': { input: 0.01, output: 0.03 },
  'anthropic/claude-opus-4-6': { input: 0.015, output: 0.075 },
  'anthropic/claude-sonnet-4-6': { input: 0.003, output: 0.015 },
  'anthropic/claude-haiku-4-5-20251001': { input: 0.0008, output: 0.004 },
  'google/gemini-2.5-pro': { input: 0.00125, output: 0.01 },
  'google/gemini-2.5-flash': { input: 0.00015, output: 0.0006 },
  'openrouter/openai/gpt-4o': { input: 0.0025, output: 0.01 },
  'openrouter/openai/gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'openrouter/anthropic/claude-3.5-sonnet': { input: 0.003, output: 0.015 },
  'openrouter/google/gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
  'groq/llama-3.3-70b-versatile': { input: 0.000059, output: 0.000079 },
  'groq/llama-3.1-8b-instant': { input: 0.00005, output: 0.00008 },
  'deepseek/deepseek-chat': { input: 0.00014, output: 0.00028 },
};

export const costOptimizationService = {
  /**
   * Estima custo de uma chamada LLM
   */
  estimateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): CostEstimate {
    const costs = MODEL_COSTS[model] || { input: 0.001, output: 0.002 };
    const estimatedCost = 
      (inputTokens / 1000) * costs.input + 
      (outputTokens / 1000) * costs.output;
    
    return {
      provider,
      model,
      inputTokens,
      outputTokens,
      estimatedCost,
      costPer1kInput: costs.input,
      costPer1kOutput: costs.output,
    };
  },

  /**
   * Sugere otimizações para reduzir custos
   */
  getOptimizationSuggestions(
    currentModel: string,
    promptLength: number,
    averageOutputLength: number
  ): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Sugere downgrade para modelo mais barato
    if (currentModel.includes('opus') || currentModel.includes('gpt-4o')) {
      suggestions.push({
        type: 'model_downgrade',
        description: 'Considere usar um modelo mais barato (ex: Haiku, GPT-4o-mini) para tarefas simples',
        potentialSavings: 0.7,
        priority: 'high',
      });
    }
    
    // Sugere prompt mais curto
    if (promptLength > 2000) {
      suggestions.push({
        type: 'prompt_shorten',
        description: 'Prompt muito longo — considere resumir ou dividir em partes',
        potentialSavings: 0.3,
        priority: 'medium',
      });
    }
    
    // Sugere cache
    suggestions.push({
      type: 'cache_hit',
      description: 'Ative o cache de prompts para evitar chamadas repetidas',
      potentialSavings: 0.5,
      priority: 'high',
    });
    
    return suggestions;
  },

  /**
   * Calcula economia potencial com cache
   */
  calculateCacheSavings(
    dailyCalls: number,
    cacheHitRate: number,
    averageCostPerCall: number
  ): number {
    return dailyCalls * cacheHitRate * averageCostPerCall;
  },

  /**
   * Retorna o modelo mais barato para um tipo de tarefa
   */
  getCheapestModel(taskType: 'simple' | 'complex' | 'creative'): string {
    switch (taskType) {
      case 'simple':
        return 'openrouter/openai/gpt-4o-mini';
      case 'creative':
        return 'openrouter/anthropic/claude-3.5-sonnet';
      case 'complex':
      default:
        return 'openrouter/openai/gpt-4o';
    }
  },

  /**
   * Verifica se um modelo é mais barato que outro
   */
  isCheaper(modelA: string, modelB: string): boolean {
    const costA = MODEL_COSTS[modelA];
    const costB = MODEL_COSTS[modelB];
    if (!costA || !costB) return false;
    return (costA.input + costA.output) < (costB.input + costB.output);
  },
};
