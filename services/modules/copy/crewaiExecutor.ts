// ═══════════════════════════════════════════════════════════════════════════
// CREWAI EXECUTOR — Executa workflows crewAI sequencialmente usando callAI
// Cada task = 1 agente especialista → output estruturado → próximo agente
// Padrão adotado do crewAI: task decomposition com outputs encadeados
// ═══════════════════════════════════════════════════════════════════════════

import { callAI } from '../../core/aiClient';
import { CrewAIWorkflow, CrewAITask } from './crewaiTasks';

interface TaskResult {
  taskId: string;
  output: string;
  parsed?: any;
  error?: string;
}

interface CrewExecutionResult {
  success: boolean;
  finalOutput: string;
  taskResults: TaskResult[];
  notes: string;
  error?: string;
}

/**
 * Executa um workflow crewAI sequencialmente
 * Cada task usa callAI com systemInstruction = agent role + goal + backstory
 * Output de cada task alimenta a próxima (via template string interpolation)
 */
export const executeCrewWorkflow = async (
  workflow: CrewAIWorkflow,
  context: Record<string, string>,
  onProgress?: (taskId: string, output: string) => void,
  onChunk?: (text: string) => void
): Promise<CrewExecutionResult> => {
  const taskResults: TaskResult[] = [];
  const completedOutputs: Record<string, string> = {};
  let allNotes = '';

  const sortedTasks = topologicalSort(workflow.tasks);

  for (const task of sortedTasks) {
    const prompt = buildTaskPrompt(task, context, completedOutputs);
    const systemInstruction = buildSystemInstruction(task);

    const config: any = {
      taskType: 'text',
      responseMimeType: task.responseSchema ? 'application/json' : undefined,
      responseSchema: task.responseSchema
    };

    try {
      let fullText = '';
      await callAI(prompt, systemInstruction, 'gemini-3-pro-preview', (chunk) => {
        fullText = chunk;
        onChunk?.(chunk);
      }, config);

      let parsed: any = null;
      if (task.responseSchema && fullText) {
        try {
          const jsonMatch = fullText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                           fullText.match(/(\{[\s\S]*\})/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[1]);
          }
        } catch (e) {
          console.warn(`Failed to parse JSON for task ${task.id}:`, e);
        }
      }

      const result: TaskResult = {
        taskId: task.id,
        output: fullText,
        parsed
      };
      taskResults.push(result);
      completedOutputs[task.id] = fullText;

      onProgress?.(task.id, fullText);

    } catch (error: any) {
      return {
        success: false,
        finalOutput: '',
        taskResults,
        notes: allNotes,
        error: `Task ${task.id} failed: ${error.message}`
      };
    }
  }

  const lastTask = sortedTasks[sortedTasks.length - 1];
  const lastResult = taskResults.find(r => r.taskId === lastTask.id);

  return {
    success: true,
    finalOutput: lastResult?.output || '',
    taskResults,
    notes: allNotes
  };
};

function topologicalSort(tasks: CrewAITask[]): CrewAITask[] {
  const visited = new Set<string>();
  const result: CrewAITask[] = [];
  const taskMap = new Map(tasks.map(t => [t.id, t]));

  function visit(taskId: string) {
    if (visited.has(taskId)) return;
    visited.add(taskId);
    const task = taskMap.get(taskId);
    if (!task) return;

    if (task.dependsOn) {
      for (const dep of task.dependsOn) {
        visit(dep);
      }
    }
    result.push(task);
  }

  for (const task of tasks) {
    visit(task.id);
  }
  return result;
}

function buildTaskPrompt(task: CrewAITask, context: Record<string, string>, completedOutputs: Record<string, string>): string {
  let prompt = task.description;

  for (const [key, value] of Object.entries(context)) {
    prompt = prompt.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }

  for (const [taskId, output] of Object.entries(completedOutputs)) {
    prompt = prompt.replace(new RegExp(`\\{${taskId}\\.output\\}`, 'g'), output);
    prompt = prompt.replace(new RegExp(`\\{${taskId}\\}`, 'g'), output);
  }

  return prompt;
}

function buildSystemInstruction(task: CrewAITask): string {
  return `ROLE: ${task.agentRole}
GOAL: ${task.agentGoal}
BACKSTORY: ${task.agentBackstory}

OUTPUT FORMAT: ${task.expectedOutput}

CRITICAL: Follow the output format EXACTLY. No extra commentary. No markdown unless specified.`;
}

export const createIterationPrompt = (
  originalOutput: string,
  iterationInstruction: string,
  agentRole: string,
  agentGoal: string,
  agentBackstory: string
): string => {
  return `PREVIOUS OUTPUT:
${originalOutput}

ITERATION INSTRUCTION:
${iterationInstruction}

Apply the iteration instruction to the previous output. Maintain all quality standards.`;
};

export const executeSingleTask = async (
  task: CrewAITask,
  context: Record<string, string>,
  completedOutputs: Record<string, string>,
  onChunk?: (text: string) => void
): Promise<TaskResult> => {
  const prompt = buildTaskPrompt(task, context, completedOutputs);
  const systemInstruction = buildSystemInstruction(task);

  const config: any = {
    taskType: 'text',
    responseMimeType: task.responseSchema ? 'application/json' : undefined,
    responseSchema: task.responseSchema
  };

  let fullText = '';
  await callAI(prompt, systemInstruction, 'gemini-3-pro-preview', (chunk) => {
    fullText = chunk;
    onChunk?.(chunk);
  }, config);

  let parsed: any = null;
  if (task.responseSchema && fullText) {
    try {
      const jsonMatch = fullText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) ||
                       fullText.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      }
    } catch (e) {
      console.warn(`Failed to parse JSON for task ${task.id}:`, e);
    }
  }

  return { taskId: task.id, output: fullText, parsed };
};
