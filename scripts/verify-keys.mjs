import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');

function parseEnv(content) {
  const out = {};
  for (const line of content.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}
function mask(v) {
  if (!v || v.length < 8) return '********';
  return v.slice(0, 4) + '*'.repeat(Math.max(6, v.length - 8)) + v.slice(-4);
}

let env = {};
try { env = parseEnv(fs.readFileSync(envPath, 'utf8')); } catch {}
const maskAll = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, typeof v === 'string' && v.length >= 8 ? mask(v) : v]));

const PROVIDERS = [
  { id: '9router', envKey: 'LITELLM_API_KEY_9ROUTER', url: 'http://localhost:20128/v1/models', kind: 'litellm' },
  { id: 'openrouter', envKey: 'LITELLM_API_KEY_OPENROUTER', url: 'https://openrouter.ai/api/v1/models', kind: 'openrouter' },
  { id: 'nvidia', envKey: 'NVIDIA_API', url: 'https://integrate.api.nvidia.com/v1/models', kind: 'nvidia' },
  { id: 'mistral', envKey: 'MISTRAL_API', url: 'https://api.mistral.ai/v1/models', kind: 'mistral' },
  { id: 'groq', envKey: 'GROQ_API', url: 'https://api.groq.com/openai/v1/models', kind: 'groq' },
  { id: 'groq(meta)', envKey: 'META_API_KEY', url: 'https://api.groq.com/openai/v1/models', kind: 'groq' },
  { id: 'deepseek', envKey: 'DEEPSEEK_API_KEY', url: 'https://api.deepseek.com/models', kind: 'deepseek' },
  { id: 'cohere', envKey: 'COHERE_API_KEY', url: 'https://api.cohere.com/v1/models', kind: 'cohere' },
  { id: 'polinai', envKey: 'POLINAI_API', url: 'https://api.polin.ai/v1/models', kind: 'polin' },
];

const CHAT_FALLBACK = {
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-4o-mini', extra: { 'HTTP-Referer': 'http://localhost', 'X-Title': 'verify-keys' } },
  deepseek: { url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' },
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama-3.1-8b-instant' },
  nvidia: { url: 'https://integrate.api.nvidia.com/v1/chat/completions', model: 'meta/llama-3.1-8b-instruct' },
  mistral: { url: 'https://api.mistral.ai/v1/chat/completions', model: 'mistral-small-latest' },
  cohere: { url: 'https://api.cohere.ai/v1/chat', model: 'command-r-plus' },
  polin: { url: 'https://api.polin.ai/v1/chat/completions', model: 'polin/gpt-4o-mini' },
};

function classify(status, body) {
  const low = (body || '').toLowerCase();
  if (status === 200) return { ok: true, label: 'OK', note: 'autenticada' };
  if (status === 401 || low.includes('invalid_api_key') || low.includes('invalid api key') || low.includes('unauthorized') || low.includes('incorrect api key') || low.includes('user not found') || low.includes('invalid token')) return { ok: false, label: 'INVÁLIDA', note: '401/invalid key' };
  if (status === 403 || low.includes('forbidden') || low.includes('tier_not_allowed')) return { ok: false, label: 'BLOQUEADA', note: '403/tier/forbidden' };
  if (status === 429 || low.includes('rate') || low.includes('quota') || low.includes('insufficient')) return { ok: true, label: 'OK (sem cota/throttle)', note: `${status} quota/rate` };
  if (status === 402) return { ok: true, label: 'OK (sem créditos)', note: '402' };
  if (status >= 500) return { ok: null, label: 'ERRO SERVIDOR', note: `${status}` };
  return { ok: false, label: `FALHA ${status}`, note: low.slice(0, 80) || `${status}` };
}

async function probeModels(p) {
  const key = (env[p.envKey] || '').trim();
  if (!key) return { id: p.id, envKey: p.envKey, masked: '', has: false, label: 'VAZIA', note: 'sem chave no .env', latency: 0, detail: '' };
  const masked = mask(key);
  const headers = {};
  if (p.kind === 'cohere') headers['Authorization'] = `Bearer ${key}`;
  else if (p.kind === 'nvidia') headers['Authorization'] = `Bearer ${key}`;
  else headers['Authorization'] = `Bearer ${key}`;
  if (p.kind === 'openrouter') { headers['HTTP-Referer'] = 'http://localhost'; headers['X-Title'] = 'verify-keys'; }
  const t0 = Date.now();
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(p.url, { headers, signal: ctrl.signal });
    const body = await r.text().catch(() => '');
    clearTimeout(to);
    const c = classify(r.status, body);
    let detail = body.replace(/\s+/g, ' ').slice(0, 180);
    if (r.status === 200) {
      try { const j = JSON.parse(body); const n = Array.isArray(j.data) ? j.data.length : Array.isArray(j.models) ? j.models.length : '?'; detail = `modelos: ${n}`; } catch {}
    }
    return { id: p.id, envKey: p.envKey, masked, has: true, label: c.label, note: c.note, latency: Date.now() - t0, detail, http: r.status, _rbody: body };
  } catch (e) {
    clearTimeout(to);
    const msg = String(e?.message || e);
    if (msg.includes('abort') || msg.includes('Abort')) return { id: p.id, envKey: p.envKey, masked, has: true, label: 'TIMEOUT/OFFLINE', note: p.id === '9router' ? 'localhost:20128 offline' : 'timeout', latency: Date.now() - t0, detail: msg.slice(0, 120) };
    return { id: p.id, envKey: p.envKey, masked, has: true, label: 'ERRO REDE', note: msg.slice(0, 60), latency: Date.now() - t0, detail: msg.slice(0, 180) };
  }
}

async function probeChat(kind, key) {
  const cfg = CHAT_FALLBACK[kind];
  if (!cfg) return null;
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` };
  if (cfg.extra) Object.assign(headers, cfg.extra);
  let bodyObj;
  if (kind === 'cohere') bodyObj = { model: cfg.model, message: 'hi', max_tokens: 4 };
  else bodyObj = { model: cfg.model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 4 };
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(cfg.url, { method: 'POST', headers, body: JSON.stringify(bodyObj), signal: ctrl.signal });
    const txt = await r.text().catch(() => '');
    clearTimeout(to);
    return { status: r.status, body: txt };
  } catch (e) { clearTimeout(to); return { status: 0, body: String(e?.message || e) }; }
}

const results = [];
for (const p of PROVIDERS) {
  const r = await probeModels(p);
  if ((r.label === 'FALHA 404' || r.label.startsWith('FALHA 4')) && p.kind !== 'cohere' && r.has) {
    const fb = await probeChat(p.kind, (env[p.envKey] || '').trim());
    if (fb) {
      const c2 = classify(fb.status, fb.body);
      if (c2.ok !== false || fb.status === 200) {
        const keepDetail = fb.status === 200 ? 'chat OK' : fb.body.replace(/\s+/g, ' ').slice(0, 140);
        results.push({ ...r, label: c2.label, note: `fallback chat: ${c2.note}`, detail: keepDetail, http: fb.status });
        continue;
      }
      results.push({ ...r, detail: (r.detail + ' | chat ' + fb.status + ': ' + fb.body.replace(/\s+/g, ' ').slice(0, 100)).slice(0, 220) });
      continue;
    }
  }
  results.push(r);
}

const extraEnv = Object.keys(env).filter(k => /API|NVIDIA|GROQ|POLIN/.test(k) && !PROVIDERS.some(p => p.envKey === k) && (env[k] || '').trim());
for (const k of extraEnv) {
  const v = (env[k] || '').trim();
  results.push({ id: `(extra) ${k}`, envKey: k, masked: mask(v), has: !!v, label: v ? 'NÃO MAPEADA' : 'VAZIA', note: 'chave no .env sem provider mapeado', latency: 0, detail: '' });
}

console.log('\n=== Chaves API — verificação (.env) ===');
console.log(`Arquivo: ${envPath}`);
console.log(`Data: ${new Date().toISOString()}\n`);
const hdr = ['Provider', 'EnvKey', 'Mascarada', 'Status', 'Nota', 'ms', 'Detalhe'];
const rows = results.map(r => [r.id, r.envKey, r.masked || '-', r.label, r.note, r.latency ? String(r.latency) : '-', (r.detail || '').slice(0, 70)]);
const widths = hdr.map((h, i) => Math.max(h.length, ...rows.map(r => r[i].length)));
const line = (cols) => cols.map((c, i) => c.padEnd(widths[i])).join(' | ');
console.log(line(hdr));
console.log(widths.map(w => '-'.repeat(w)).join('-|-'));
for (const r of rows) console.log(line(r));

const ok = results.filter(r => r.label === 'OK' || r.label.startsWith('OK (')).length;
const bad = results.filter(r => r.label === 'INVÁLIDA' || r.label === 'BLOQUEADA' || r.label.startsWith('FALHA')).length;
console.log(`\nResumo: ${ok} OK (inclui sem cota), ${bad} inválida/bloqueada, ${results.length - ok - bad} outras (offline/vazia/extra).`);

const invalid = results.filter(r => r.label === 'INVÁLIDA' || r.label === 'BLOQUEADA');
if (invalid.length) {
  console.log('\nAção: regenere as chaves marcadas INVÁLIDA/BLOQUEADA nos portais dos providers e atualize o .env / Vercel env.');
}

const outPath = path.join(root, 'scripts', 'verify-keys.report.json');
fs.writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), results: results.map(({ _rbody, ...rest }) => rest) }, null, 2), 'utf8');
console.log(`\nRelatório JSON: ${outPath}`);

console.log('\nChaves mascaradas (sem valor real exposto).');
