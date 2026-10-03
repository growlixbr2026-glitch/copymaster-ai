import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

const envFilePath = path.resolve((process as any).cwd(), '.env');

const ENV_KEY_MAP: Record<string, string[]> = {
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

function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const idx = t.indexOf('=');
    if (idx === -1) continue;
    const k = t.slice(0, idx).trim();
    const v = t.slice(idx + 1).trim();
    out[k] = v;
  }
  return out;
}

// Campos extra de configuração (não-chaves) aceitos pelo POST /api/env: o
// Centro de Comando grava CLOUDFLARE_ACCOUNT_ID no .env quando o usuário
// informa o Account ID no card Cloudflare — mesmo fluxo KEY=VALUE das chaves.
const EXTRA_ENV_VARS: Record<string, string> = {
  cloudflare_account_id: 'CLOUDFLARE_ACCOUNT_ID',
};

function maskValue(v: string): string {
  if (!v || v.length < 8) return '********';
  return v.slice(0, 4) + '*'.repeat(Math.max(6, v.length - 8)) + v.slice(-4);
}

// Pool multi-chaves: base + _2.._9 para TODOS os providers (ex.: GROQ_API_2, NVIDIA_API_3).
// A UI continua com 1 campo por provider; extras vivem no .env.
const POOL_BASES = [...new Set(Object.values(ENV_KEY_MAP).flat())];
function collectPoolKeys(lookup: (k: string) => string | undefined): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const base of POOL_BASES) {
    const list: string[] = [];
    const push = (k: string) => { const v = (lookup(k) || '').trim(); if (v && v.length >= 8 && !list.includes(v)) list.push(v); };
    push(base);
    for (let i = 2; i <= 9; i++) push(`${base}_${i}`);
    out[base] = list;
  }
  return out;
}

function envApiPlugin() {
  return {
    name: 'env-api',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        // /api/ai = proxy de chaves (prod sem segredos no bundle — H1). Igual aos
        // demais: handler padrão lê o corpo do stream e responde via jsonRes.
        if (req.url?.startsWith('/api/research') || req.url?.startsWith('/api/pin') || req.url?.startsWith('/api/scrape') || req.url?.startsWith('/api/ai')) {
          try {
            const mod = await server.ssrLoadModule(
              req.url.startsWith('/api/pin') ? '/api/pin.ts'
                : req.url.startsWith('/api/scrape') ? '/api/scrape.ts'
                : req.url.startsWith('/api/ai') ? '/api/ai.ts'
                : '/api/research.ts');
            const handler = mod.default || mod;
            const url = new URL(req.url, 'http://localhost');
            (req as any).query = Object.fromEntries(url.searchParams.entries());
            const jsonRes = {
              setHeader: (k: string, v: string) => res.setHeader(k, v),
              status: (code: number) => { res.statusCode = code; return { json: (o: any) => res.end(JSON.stringify(o)), end: (d?: any) => res.end(d) }; },
            };
            return handler(req, jsonRes);
          } catch (e: any) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ ok: false, error: String(e?.message || e).slice(0, 200) }));
          }
        }
        if (!req.url?.startsWith('/api/env')) return next();
        // Sem CORS *: chamador é same-origin (Centro de Comando). Com `*`,
        // qualquer página aberta no navegador do dev podia ler os masks de chave
        // (GET) e gravar no .env (POST) em cross-origin.
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }

        const url = new URL(req.url, 'http://localhost');
        if (url.pathname !== '/api/env') return next();

        if (req.method === 'GET') {
          try {
            let content = '';
            try { content = fs.readFileSync(envFilePath, 'utf8'); } catch { content = ''; }
            const parsed = parseEnvFile(content);
            const poolLists = collectPoolKeys((k) => parsed[k]);
            const keys: Record<string, { has: boolean; masked: string; envKey: string; count?: number }> = {};
            for (const [provider, envKeys] of Object.entries(ENV_KEY_MAP)) {
              let foundVal = '';
              let foundKey = envKeys[0];
              for (const ek of envKeys) {
                const exact = parsed[ek];
                if (exact) { foundVal = exact; foundKey = ek; break; }
                const lower = Object.keys(parsed).find(k => k.toLowerCase() === ek.toLowerCase());
                if (lower && parsed[lower]) { foundVal = parsed[lower]; foundKey = lower; break; }
              }
              const entry: { has: boolean; masked: string; envKey: string; count?: number } =
                { has: !!foundVal, masked: foundVal ? maskValue(foundVal) : '', envKey: foundKey };
              // Pool multi-chaves: informa quantas chaves o .env tem (sem expor valores).
              for (const base of POOL_BASES) {
                if (envKeys.includes(base)) {
                  const list = poolLists[base] || [];
                  if (list.length > 0) { entry.count = list.length; entry.has = true; }
                }
              }
              keys[provider] = entry;
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, keys }));
          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: e.message }));
          }
          return;
        }

        if (req.method === 'POST') {
          let body = '';
          req.on('data', (c: any) => body += c);
          req.on('end', async () => {
            try {
              const { provider, apiKey } = JSON.parse(body || '{}');
              if (!provider || typeof apiKey !== 'string') throw new Error('provider e apiKey obrigatórios');
              // Provider de chave OU campo extra (ex.: CLOUDFLARE_ACCOUNT_ID).
              const envKeys = ENV_KEY_MAP[provider] || (EXTRA_ENV_VARS[provider] ? [EXTRA_ENV_VARS[provider]] : undefined);
              if (!envKeys) throw new Error('provider desconhecido: ' + provider);
              const envKey = envKeys[0];
              const trimmed = apiKey.trim();
              // CRLF: uma chave contendo \r/\n injetaria linhas KEY=VALUE
              // arbitrárias no .env (ex.: trocar LITELLM_MODEL_PRIMARY).
              if (/[\r\n]/.test(trimmed)) throw new Error('Chave com quebra de linha (CRLF) recusada.');
              // Account ID (Cloudflare): valor hex/alnum de 32 chars — bloqueia
              // URL ou texto livre colado no .env.
              if (EXTRA_ENV_VARS[provider] && trimmed && !/^[A-Za-z0-9-]{8,64}$/.test(trimmed)) {
                throw new Error('Account ID inválido: use o valor de 32 caracteres (dash.cloudflare.com → Workers & Pages → ID da conta).');
              }
              let content = '';
              try { content = fs.readFileSync(envFilePath, 'utf8'); } catch { content = ''; }
              const lines = content.split('\n');
              let found = false;
              const lowerMap = new Set(envKeys.map(k => k.toLowerCase()));
              const newLines: string[] = [];
              for (const line of lines) {
                const t = line.trim();
                if (!t || t.startsWith('#') || !t.includes('=')) { newLines.push(line); continue; }
                const k = t.slice(0, t.indexOf('=')).trim();
                if (lowerMap.has(k.toLowerCase())) {
                  if (!found) {
                    newLines.push(`${envKey}=${trimmed}`);
                    found = true;
                  }
                } else {
                  newLines.push(line);
                }
              }
              if (!found && trimmed) {
                const nl = `${envKey}=${trimmed}`;
                // Simetria adicionar→remover: o split('\n') de um arquivo que
                // termina em \n deixa um '' fantasma no fim; anexar DEPOIS dele
                // virava linha em branco e a remoção deixava +1 \n por rodada.
                if (lines.length > 0 && lines[lines.length - 1] === '') newLines.splice(newLines.length - 1, 0, nl);
                else newLines.push(nl);
              }
              if (!trimmed && found) {
              }
              let out = newLines.join('\n');
              if (trimmed && !found && !out.endsWith('\n')) out += '\n';
              if (!trimmed && found) {
                out = newLines.filter(l => {
                  const t = l.trim();
                  if (!t.includes('=')) return true;
                  const k = t.slice(0, t.indexOf('=')).trim().toLowerCase();
                  return !lowerMap.has(k);
                }).join('\n');
              }
              // Conteúdo idêntico = sem gravação (o watcher do Vite em .env
              // dispara full-reload do browser a cada escrita).
              if (out !== content) fs.writeFileSync(envFilePath, out, 'utf8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, envKey, masked: trimmed ? maskValue(trimmed) : '' }));
            } catch (e: any) {
              res.statusCode = 400;
              res.end(JSON.stringify({ ok: false, error: e.message }));
            }
          });
          return;
        }
        res.statusCode = 405;
        res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
      });
    }
  };
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  // SEGREDOS FORA DO BUNDLE EM BUILD (fecha o H1): o `define` só embute chaves
  // quando `command === 'serve'` (dev local) ou com ALLOW_BUNDLE_SECRETS=1
  // (escape hatch efêmero, nunca para distribuição). Em `vite build` — inclusive
  // `vercel build`, onde as env do dashboard estão em process.env — todo segredo
  // vira ""/[] e a autenticação passa a ser server-side via proxy /api/ai.
  // O guard de arquivo .env abaixo continua em pé como defesa em profundidade.
  const embedSecrets = command === 'serve' || !!process.env.ALLOW_BUNDLE_SECRETS;
  // Guard: inspeciona os ARQUIVOS .env no disco (não a flag VERCEL — `vercel build`
  // local também seta VERCEL=1 e embutiria segredos no bundle enviado ao preview).
  // No remoto Vercel não há arquivo .env (gitignore) — chaves vêm do dashboard via
  // process.env — então o guard passa lá e só trava build local com segredo em arquivo.
  const SECRET_FILE_KEY_RE = /^(LITELLM_API_KEY|NVIDIA_API|NVIDEA_API|GROQ_API|GROK_API|MISTRAL_API|POLINAI_API|DEEPSEEK_API_KEY|META_API_KEY|COHERE_API_KEY|GEMINI_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|ZHIPU_API_KEY|TOGETHER_API_KEY|PERPLEXITY_API_KEY|MOONSHOT_API_KEY|QWEN_API_KEY|ERNIE_API_KEY|YI_API_KEY|CEREBRAS_API_KEY|SAMBANOVA_API_KEY|CHUTES_API_KEY|SILICONFLOW_API_KEY|NEBIUS_API_KEY|CLOUDFLARE_API_KEY|HYPERCLOVA_API_KEY|HUGGINGFACE_API_KEY|HF_API_KEY|STABILITY_API_KEY|RUNWAY_API_KEY|ELEVENLABS_API_KEY)/i;
  const envFileHasSecrets = ['.env', '.env.production', '.env.local'].some((f) => {
    try {
      const content = fs.readFileSync(path.resolve((process as any).cwd(), f), 'utf8');
      return content.split('\n').some((line) => {
        const t = line.trim();
        if (!t || t.startsWith('#') || !t.includes('=')) return false;
        const k = t.slice(0, t.indexOf('=')).trim();
        const v = t.slice(t.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
        return SECRET_FILE_KEY_RE.test(k) && v.length >= 8;
      });
    } catch { return false; }
  });
  if (mode === 'production' && !process.env.ALLOW_BUNDLE_SECRETS && envFileHasSecrets) {
    throw new Error(
      'BLOQUEADO: arquivo .env com chaves detectado no build de produção. ' +
      'O `define` embute segredos no dist/ (inclusive via `vercel build` local). ' +
      'Mova o .env para fora, ou rode com ALLOW_BUNDLE_SECRETS=1 apenas para uso local efêmero (nunca distribua). ' +
      'Em produção real (Vercel), chaves devem ir no dashboard Environment Variables.'
    );
  }
  // Pool multi-chaves embarcado no build (base + _2.._9) — mesmos valores do .env local.
  // ATENÇÃO: embute segredos no bundle. Em distribuição, use Vercel env vars + .env vazio.
  const poolLists = collectPoolKeys((k) => (env as any)[k] || (process.env as any)[k]);

  return {
    plugins: [react(), envApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve((process as any).cwd(), './'),
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      target: 'esnext',
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-ui': ['lucide-react'],
            'vendor-genai': ['@google/genai'],
            'vendor-pdf': ['jspdf'], 
          },
        },
      },
    },
    define: (() => {
      const d: Record<string, any> = {
      'process.env.API_KEY': JSON.stringify(process.env.API_KEY || (env as any).GEMINI_API_KEY || (env as any).VITE_GEMINI_API_KEY || (env as any).API_KEY || ""),
      'process.env.LITELLM_API_KEY_9ROUTER': JSON.stringify((env as any).LITELLM_API_KEY_9ROUTER || process.env.LITELLM_API_KEY_9ROUTER || ""),
      'process.env.LITELLM_API_KEY_OPENROUTER': JSON.stringify((env as any).LITELLM_API_KEY_OPENROUTER || (env as any).OPENROUTER_API_KEY || process.env.LITELLM_API_KEY_OPENROUTER || process.env.OPENROUTER_API_KEY || ""),
      'process.env.OPENROUTER_API_KEY': JSON.stringify((env as any).OPENROUTER_API_KEY || (env as any).LITELLM_API_KEY_OPENROUTER || process.env.OPENROUTER_API_KEY || process.env.LITELLM_API_KEY_OPENROUTER || ""),
      ...Object.fromEntries(POOL_BASES.map((b) => [`process.env.${b}_LIST`, JSON.stringify(poolLists[b] || [])])),
      'process.env.LITELLM_MODEL_PRIMARY': JSON.stringify((env as any).LITELLM_MODEL_PRIMARY || process.env.LITELLM_MODEL_PRIMARY || "cohere/north-mini-code:free"),
      'process.env.LITELLM_MODEL_FALLBACK': JSON.stringify((env as any).LITELLM_MODEL_FALLBACK || process.env.LITELLM_MODEL_FALLBACK || "cohere/north-mini-code:free"),
      'process.env.NVIDIA_API': JSON.stringify((env as any).NVIDIA_API || (env as any).NVIDEA_API || process.env.NVIDIA_API || process.env.NVIDEA_API || ""),
      'process.env.NVIDEA_API': JSON.stringify((env as any).NVIDEA_API || (env as any).NVIDIA_API || process.env.NVIDEA_API || process.env.NVIDIA_API || ""),
      'process.env.GROQ_API': JSON.stringify((env as any).GROQ_API || (env as any).GROQ_API_KEY || process.env.GROQ_API || process.env.GROQ_API_KEY || ""),
      'process.env.GROQ_API_KEY': JSON.stringify((env as any).GROQ_API_KEY || (env as any).GROQ_API || process.env.GROQ_API_KEY || process.env.GROQ_API || ""),
      'process.env.GROK_API': JSON.stringify((env as any).GROK_API || (env as any).GROK_API_KEY || process.env.GROK_API || process.env.GROK_API_KEY || ""),
      'process.env.GROK_API_KEY': JSON.stringify((env as any).GROK_API_KEY || (env as any).GROK_API || process.env.GROK_API_KEY || process.env.GROK_API || ""),
      'process.env.MISTRAL_API': JSON.stringify((env as any).MISTRAL_API || (env as any).MISTRAL_api || process.env.MISTRAL_API || ""),
      'process.env.POLINAI_API': JSON.stringify((env as any).POLINAI_API || process.env.POLINAI_API || ""),
      'process.env.DEEPSEEK_API_KEY': JSON.stringify((env as any).DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY || ""),
      'process.env.META_API_KEY': JSON.stringify((env as any).META_API_KEY || process.env.META_API_KEY || ""),
      'process.env.COHERE_API_KEY': JSON.stringify((env as any).COHERE_API_KEY || process.env.COHERE_API_KEY || ""),
      'process.env.OPENAI_API_KEY': JSON.stringify((env as any).OPENAI_API_KEY || process.env.OPENAI_API_KEY || ""),
      'process.env.ANTHROPIC_API_KEY': JSON.stringify((env as any).ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || ""),
      'process.env.QWEN_API_KEY': JSON.stringify((env as any).QWEN_API_KEY || process.env.QWEN_API_KEY || ""),
      'process.env.ERNIE_API_KEY': JSON.stringify((env as any).ERNIE_API_KEY || process.env.ERNIE_API_KEY || ""),
      'process.env.MOONSHOT_API_KEY': JSON.stringify((env as any).MOONSHOT_API_KEY || process.env.MOONSHOT_API_KEY || ""),
      'process.env.YI_API_KEY': JSON.stringify((env as any).YI_API_KEY || process.env.YI_API_KEY || ""),
      'process.env.ZHIPU_API_KEY': JSON.stringify((env as any).ZHIPU_API_KEY || process.env.ZHIPU_API_KEY || ""),
      'process.env.ZAI_API_KEY': JSON.stringify((env as any).ZAI_API_KEY || process.env.ZAI_API_KEY || ""),
      'process.env.HYPERCLOVA_API_KEY': JSON.stringify((env as any).HYPERCLOVA_API_KEY || process.env.HYPERCLOVA_API_KEY || ""),
      'process.env.PERPLEXITY_API_KEY': JSON.stringify((env as any).PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY || ""),
      'process.env.HF_API_KEY': JSON.stringify((env as any).HF_API_KEY || (env as any).HUGGINGFACE_API_KEY || process.env.HF_API_KEY || ""),
      'process.env.HUGGINGFACE_API_KEY': JSON.stringify((env as any).HUGGINGFACE_API_KEY || (env as any).HF_API_KEY || process.env.HUGGINGFACE_API_KEY || ""),
      'process.env.TOGETHER_API_KEY': JSON.stringify((env as any).TOGETHER_API_KEY || process.env.TOGETHER_API_KEY || ""),
      'process.env.ELEVENLABS_API_KEY': JSON.stringify((env as any).ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY || ""),
      'process.env.STABILITY_API_KEY': JSON.stringify((env as any).STABILITY_API_KEY || process.env.STABILITY_API_KEY || ""),
      'process.env.RUNWAY_API_KEY': JSON.stringify((env as any).RUNWAY_API_KEY || process.env.RUNWAY_API_KEY || ""),
      'process.env.CEREBRAS_API_KEY': JSON.stringify((env as any).CEREBRAS_API_KEY || process.env.CEREBRAS_API_KEY || ""),
      'process.env.SAMBANOVA_API_KEY': JSON.stringify((env as any).SAMBANOVA_API_KEY || process.env.SAMBANOVA_API_KEY || ""),
      'process.env.CHUTES_API_KEY': JSON.stringify((env as any).CHUTES_API_KEY || process.env.CHUTES_API_KEY || ""),
      'process.env.SILICONFLOW_API_KEY': JSON.stringify((env as any).SILICONFLOW_API_KEY || process.env.SILICONFLOW_API_KEY || ""),
      'process.env.NEBIUS_API_KEY': JSON.stringify((env as any).NEBIUS_API_KEY || process.env.NEBIUS_API_KEY || ""),
      'process.env.CLOUDFLARE_API_KEY': JSON.stringify((env as any).CLOUDFLARE_API_KEY || process.env.CLOUDFLARE_API_KEY || ""),
      // Não-segredo (ID de conta aparece em URLs do próprio dashboard): fica
      // de fora do blanking para valer também em produção (dashboard Vercel).
      'process.env.CLOUDFLARE_ACCOUNT_ID': JSON.stringify((env as any).CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || ""),
      'process.env': {}
      };
      // Build: todo segredo vira "" (ou [] p/ os pools *_LIST). Os modelos
      // LITELLM_MODEL_* e o CLOUDFLARE_ACCOUNT_ID não são segredos e o
      // catch-all `process.env` vira {}.
      if (!embedSecrets) {
        for (const k of Object.keys(d)) {
          if (k === 'process.env' || k.endsWith('LITELLM_MODEL_PRIMARY') || k.endsWith('LITELLM_MODEL_FALLBACK') || k.endsWith('CLOUDFLARE_ACCOUNT_ID')) continue;
          d[k] = k.endsWith('_LIST') ? '[]' : '""';
        }
      }
      return d;
    })(),
  };
});
