// Vercel Serverless — espelho somente-leitura do plugin dev /api/env (vite.config.ts).
// Em produção o filesystem é read-only: GET retorna status mascarado das env vars
// configuradas no dashboard Vercel; POST é rejeitado com instrução (use o dashboard).
// Exportado p/ o proxy /api/ai (allowlist de providers + resolução das chaves
// do servidor). Mantido em espelho com vite.config.ts (plugin dev).
export const ENV_KEY_MAP: Record<string, string[]> = {
  '9router': ['LITELLM_API_KEY_9ROUTER'],
  'openrouter': ['LITELLM_API_KEY_OPENROUTER', 'OPENROUTER_API_KEY'],
  'nvidia': ['NVIDIA_API', 'NVIDEA_API'],
  'polinai': ['POLINAI_API'],
  'groq': ['GROQ_API', 'GROQ_API_KEY'],
  'grok': ['GROK_API', 'GROK_API_KEY'],
  'mistral': ['MISTRAL_API', 'MISTRAL_api'],
  'gemini': ['GEMINI_API_KEY', 'API_KEY', 'VITE_GEMINI_API_KEY'],
  'openai': ['OPENAI_API_KEY'],
  'anthropic': ['ANTHROPIC_API_KEY'],
  'deepseek': ['DEEPSEEK_API_KEY'],
  'cohere': ['COHERE_API_KEY'],
  'qwen': ['QWEN_API_KEY'],
  'ernie': ['ERNIE_API_KEY'],
  'moonshot': ['MOONSHOT_API_KEY'],
  'yi': ['YI_API_KEY'],
  'zhipu': ['ZHIPU_API_KEY'],
  'hyperclova': ['HYPERCLOVA_API_KEY'],
  'perplexity': ['PERPLEXITY_API_KEY'],
  'huggingface': ['HUGGINGFACE_API_KEY', 'HF_API_KEY'],
  'together': ['TOGETHER_API_KEY'],
  'elevenlabs': ['ELEVENLABS_API_KEY'],
  'stability': ['STABILITY_API_KEY'],
  'runway': ['RUNWAY_API_KEY'],
  'meta': ['META_API_KEY'],
  'cerebras': ['CEREBRAS_API_KEY'],
  'sambanova': ['SAMBANOVA_API_KEY'],
  'chutes': ['CHUTES_API_KEY'],
  'siliconflow': ['SILICONFLOW_API_KEY'],
  'zai': ['ZAI_API_KEY', 'ZHIPU_API_KEY'],
  'nebius': ['NEBIUS_API_KEY'],
  'cloudflare': ['CLOUDFLARE_API_KEY'],
};

function maskValue(v: string): string {
  if (!v || v.length < 8) return '********';
  // Só o prefixo: o endpoint era same-origin mas trazia `Access-Control-
  // Allow-Origin: *`, então qualquer site podia ler 4+4 chars de cada chave.
  return v.slice(0, 4) + '*'.repeat(10);
}

export default function handler(req: any, res: any) {
  // Mesmo origin (Centro de Comando): sem CORS *, sem inventário de chaves
  // legível por sites de terceiros.
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') {
    const keys: Record<string, { has: boolean; masked: string; envKey: string; count?: number }> = {};
    const countPool = (base: string): number => {
      let n = 0;
      if (process.env[base]) n++;
      for (let i = 2; i <= 9; i++) if (process.env[`${base}_${i}`]) n++;
      return n;
    };
    for (const [provider, envKeys] of Object.entries(ENV_KEY_MAP)) {
      let foundVal = '';
      let foundKey = envKeys[0];
      for (const ek of envKeys) {
        if (process.env[ek]) { foundVal = process.env[ek] as string; foundKey = ek; break; }
      }
      const entry: { has: boolean; masked: string; envKey: string; count?: number } =
        { has: !!foundVal, masked: foundVal ? maskValue(foundVal) : '', envKey: foundKey };
      // Pool multi-chaves (_2.._9) — só contagem, sem valores (todos os providers).
      let poolCount = 0;
      for (const ek of envKeys) { const n = countPool(ek); if (n > poolCount) poolCount = n; }
      if (poolCount > 0) { entry.count = poolCount; entry.has = true; }
      keys[provider] = entry;
    }
    return res.status(200).json({ ok: true, keys, readonly: true });
  }
  return res.status(405).json({ ok: false, error: 'Escrita de .env disponível apenas em desenvolvimento local (npm run dev). Em produção, configure as chaves no dashboard Vercel → Settings → Environment Variables.' });
}
