// PROXY /api/ai — fecha o H1 (chaves de LLM embutidas no bundle de produção).
// O browser NUNCA vê a chave: envia {provider, url, headers, body} e este
// handler injeta a autenticação server-side a partir das env vars do dashboard
// Vercel (produção) ou do .env local (dev), com allowlist rígida de destino
// (anti-SSRF), mesma-origem obrigatória e rate limit por IP.
//
// Contrato do corpo (JSON):
//   { provider: string,                 // precisa existir em ENV_KEY_MAP/PROVIDER_CONFIGS
//     url: string,                      // https + host exato do provider (gemini: REST v1beta)
//     headers?: Record<string,string>,  // headers não-auth (auth do cliente é descartada)
//     body: string | object }           // corpo JSON a reenviar (buffered: a branch
//                                       // OpenAI de callAI usa stream:false)
// Resposta: espelha status/content-type/retry-after/corpo do upstream — o
// cliente já trata response.ok/.status/.json(). Erros próprios são JSON
// { error } em PT-BR. Nenhuma chave aparece em resposta, log ou header.
import fs from 'fs';
import path from 'path';
import { ENV_KEY_MAP } from './env';
import { PROVIDER_CONFIGS } from '../services/providerConfig';

// Vercel: duração máxima da function (plano pode limitar abaixo disso).
export const maxDuration = 300;
export const config = { maxDuration: 300 };

const MAX_BODY = 6 * 1024 * 1024;      // teto do corpo do cliente (Ideas ~40KB)
const UPSTREAM_TIMEOUT_MS = 290_000;   // sempre abaixo do maxDuration
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;

// Rate limit por IP (melhor esforço — instância serverless é efêmera).
const hits = new Map<string, { n: number; at: number }>();

// Nunca no proxy: gateway local (o servidor não alcança o localhost do
// usuário) e endpoints que não são chat LLM nesta suíte.
const NEVER_PROXY = new Set(['9router', 'huggingface', 'runway', 'elevenlabs', 'stability']);

// Headers de auth do cliente são SEMPRE descartados (a chave verdadeira vem
// do servidor). Também caem headers de transporte que não devem ser reenviados.
const STRIP_HEADERS = new Set([
  'authorization', 'x-api-key', 'xi-api-key', 'x-goog-api-key', 'api-key',
  'cookie', 'host', 'content-length', 'connection', 'origin', 'referer',
  'x-forwarded-for', 'x-forwarded-host', 'x-real-ip',
]);

const json = (res: any, status: number, payload: any) => {
  try { res.setHeader('Content-Type', 'application/json'); } catch {}
  if (typeof res.status === 'function') res.status(status).json(payload);
  else { res.statusCode = status; res.end(JSON.stringify(payload)); }
};

// Mesma-origem obrigatória: navegador sempre manda Origin em POST; Origin
// diferente (ou ausente) = chamada cross-site/curl → recusada (anti-CSRF).
const originOk = (req: any): boolean => {
  const origin = req?.headers?.origin;
  const host = String(req?.headers?.host || '').toLowerCase();
  if (!origin || !host) return false;
  try { return new URL(String(origin)).host.toLowerCase() === host; } catch { return false; }
};

const readBody = (req: any): Promise<any> => {
  // Vercel parseia JSON em req.body; o plugin dev do Vite entrega o stream cru.
  if (req && req.body !== undefined && req.body !== null && req.body !== '') {
    try { return Promise.resolve(typeof req.body === 'string' ? JSON.parse(req.body) : req.body); }
    catch { return Promise.reject(new Error('JSON inválido')); }
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    req.on('data', (c: any) => {
      if (done) return;
      const b: Buffer = Buffer.isBuffer(c) ? c : Buffer.from(c);
      size += b.length;
      if (size > MAX_BODY) { done = true; reject(new Error('corpo maior que 6MB')); return; }
      chunks.push(b);
    });
    req.on('end', () => {
      if (done) return;
      done = true;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(new Error('JSON inválido')); }
    });
    req.on('error', (e: any) => { if (!done) { done = true; reject(e); } });
  });
};

// Allowlist de destino: host exato do provider, https, sem credenciais nem
// porta não-padrão. gemini é restrito ao REST oficial v1beta/models/...
const resolveTarget = (provider: string, rawUrl: string): string | null => {
  const cfg: any = PROVIDER_CONFIGS[provider];
  if (!cfg || !ENV_KEY_MAP[provider] || NEVER_PROXY.has(provider)) return null;
  let u: URL;
  try { u = new URL(rawUrl); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  if (u.username || u.password) return null;
  if (u.port && u.port !== '443') return null;
  const ref = provider === 'gemini' ? 'https://generativelanguage.googleapis.com' : cfg.url;
  if (!ref) return null;
  let refHost: string;
  try { refHost = new URL(ref.replace('{account_id}', 'placeholder')).host; } catch { return null; }
  if (u.host !== refHost) return null;
  if (provider === 'gemini' && !u.pathname.startsWith('/v1beta/models/')) return null;
  return u.toString();
};

// Pool de chaves do servidor: base + _2.._9 de cada env var do provider.
// Fontes na mesma ordem de /api/env: process.env (dashboard Vercel em prod,
// shell em dev) + arquivo .env local (dev — o plugin dev também lê o arquivo;
// em produção o .env não existe no filesystem e a leitura falha em silêncio).
let _fileEnv: Record<string, string> | null = null;
const fileEnv = (): Record<string, string> => {
  if (_fileEnv) return _fileEnv;
  _fileEnv = {};
  try {
    const content = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
    for (const line of content.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || !t.includes('=')) continue;
      const eq = t.indexOf('=');
      const k = t.slice(0, eq).trim();
      let v = t.slice(eq + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (k && v) _fileEnv![k] = v;
    }
  } catch { /* sem .env (prod): só process.env */ }
  return _fileEnv;
};

const envLookup = (name: string): string | undefined => {
  const direct = (process.env as any)[name];
  if (direct) return String(direct);
  const fe = fileEnv();
  if (fe[name]) return fe[name];
  const lower = Object.keys(fe).find(k => k.toLowerCase() === name.toLowerCase());
  return lower ? fe[lower] : undefined;
};

const keyPool = (provider: string): string[] => {
  const envNames: string[] = (ENV_KEY_MAP as any)[provider] || [];
  const pool: string[] = [];
  for (const base of envNames) {
    for (let i = 1; i <= 9; i++) {
      const name = i === 1 ? base : `${base}_${i}`;
      const v = envLookup(name);
      if (typeof v === 'string' && v.trim().length >= 8 && !pool.includes(v.trim())) pool.push(v.trim());
    }
  }
  return pool;
};

// Injeção de auth por família de provider (espelha o que o cliente faria).
const authFor = (provider: string, key: string): Record<string, string> => {
  if (provider === 'anthropic') return { 'x-api-key': key, 'anthropic-version': '2023-06-01' };
  if (provider === 'gemini') return { 'x-goog-api-key': key };
  return { authorization: `Bearer ${key}` };
};

// Repasse ao upstream com retry nas chaves do pool em 401/429 (até 3 chaves).
const forward = async (
  url: string, provider: string, keys: string[],
  headers: Record<string, string>, body: string, signal: AbortSignal,
): Promise<Response> => {
  const attempts = Math.min(3, keys.length);
  let last: Response | null = null;
  for (let i = 0; i < attempts; i++) {
    const up = await fetch(url, {
      method: 'POST',
      headers: { ...headers, ...authFor(provider, keys[i]) },
      body,
      signal,
      redirect: 'error' as any, // allowlist não redireciona: 3xx é suspeito
    });
    if ((up.status === 401 || up.status === 429) && i < attempts - 1) { last = up; continue; }
    return up;
  }
  return last as Response;
};

export default async function handler(req: any, res: any) {
  if (req?.method !== 'POST') return json(res, 405, { error: 'Método não permitido. Use POST.' });
  if (!originOk(req)) return json(res, 403, { error: 'Origem não autorizada.' });

  const ip = String((req.headers?.['x-forwarded-for'] || '').split(',')[0]).trim()
    || String(req.headers?.['x-real-ip'] || '').trim() || 'local';
  const now = Date.now();
  const hit = hits.get(ip);
  if (!hit || now - hit.at > RATE_WINDOW_MS) hits.set(ip, { n: 1, at: now });
  else if (++hit.n > RATE_MAX) {
    try { res.setHeader('Retry-After', '60'); } catch {}
    return json(res, 429, { error: 'Limite de requisições excedido. Aguarde um minuto.' });
  }

  let input: any;
  try { input = await readBody(req); }
  catch (e: any) { return json(res, 400, { error: `Corpo inválido: ${String(e?.message || e)}` }); }

  const provider = String(input?.provider || '');
  if (!provider || !ENV_KEY_MAP[provider] || NEVER_PROXY.has(provider)) {
    return json(res, 400, { error: 'Provider desconhecido ou não-proxyável.' });
  }
  const target = resolveTarget(provider, String(input?.url || ''));
  if (!target) return json(res, 400, { error: 'URL de destino não permitida para este provider.' });

  const bodyIn = input?.body;
  const bodyStr = typeof bodyIn === 'string' ? bodyIn : JSON.stringify(bodyIn ?? {});
  if (Buffer.byteLength(bodyStr, 'utf8') > MAX_BODY) return json(res, 413, { error: 'Corpo maior que 6MB.' });

  const keys = keyPool(provider);
  if (!keys.length) {
    return json(res, 503, {
      error: `Chave de API de ${provider} ausente no servidor. Configure a Environment Variable no dashboard da Vercel (ou no .env, em dev).`,
    });
  }

  const fwd: Record<string, string> = {};
  const incoming = input?.headers && typeof input.headers === 'object' ? input.headers : {};
  for (const [k, v] of Object.entries(incoming)) {
    const lk = String(k).toLowerCase();
    if (STRIP_HEADERS.has(lk)) continue;
    if (typeof v === 'string' && v.length < 4096) fwd[lk] = v;
  }
  fwd['content-type'] = 'application/json';

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const up = await forward(target, provider, keys, fwd, bodyStr, ac.signal);
    const txt = await up.text().catch(() => '');
    const ct = up.headers.get('content-type');
    if (ct) { try { res.setHeader('Content-Type', ct); } catch {} }
    const ra = up.headers.get('retry-after');
    if (ra) { try { res.setHeader('Retry-After', ra); } catch {} }
    if (typeof res.status === 'function') res.status(up.status).end(txt);
    else { res.statusCode = up.status; res.end(txt); }
  } catch (e: any) {
    const aborted = e?.name === 'AbortError' || ac.signal.aborted;
    json(res, aborted ? 504 : 502, {
      error: aborted
        ? `Timeout ao contatar ${provider} (upstream > 290s).`
        : `Falha ao contatar ${provider} no upstream.`,
    });
  } finally {
    clearTimeout(timer);
  }
}
