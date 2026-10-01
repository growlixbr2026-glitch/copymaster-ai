import { test, expect } from '@playwright/test';
import * as MF from './helpers/mockFactories';
import { PROVIDER_CONFIGS } from '../services/providerConfig';

// PROXY /api/ai (fecha o H1 — produção sem segredos no bundle). Mock, 0 quota.
// A) contrato do endpoint: 405/403/400 (provider/SSRF/local)/503 — nunca upstream.
// B) seam de produção ON (flag copymaster_server_keys=1): a geração inteira passa
//    por /api/ai — payload SEM auth, provider escolhido via /api/env, render OK;
//    guarda global de abort garante que nenhum host externo é contactado.
// C) seam OFF (dev padrão): o proxy NUNCA é usado — chamada direta ao provider
//    (mockada), 0 chamadas de /api/ai e 0 consultas a /api/env.

const ORIGIN = 'http://localhost:5173';
const BRIEF = 'cafeteria de bairro com assinatura mensal';

// Candidatos a "escolhido": chat https, SEM exclusões do proxy (9router local,
// huggingface/runway/elevenlabs/stability nunca proxyam; cloudflare exige
// account_id), SEM corsWarning (openai/deepseek afundariam no ranking atrás dos
// esgotados não-CORS) e SEM shape de resposta próprio (gemini/anthropic).
const PROXY_CANDIDATES = [
  'zhipu', 'zai', 'together', 'hyperclova', 'yi', 'moonshot', 'qwen', 'ernie',
  'perplexity', 'cerebras', 'sambanova', 'chutes', 'siliconflow', 'nebius',
  'cohere', 'polinai', 'grok', 'mistral', 'nvidia', 'groq', 'openrouter',
  'meta',
];

// "Direto" no teste C: chat https + sem corsWarning (openai/deepseek afundam
// no ranking p/ último). Ordem = preferência.
const DIRECT_CANDIDATES = [
  'groq', 'nvidia', 'mistral', 'cerebras', 'sambanova', 'together', 'cohere',
  'chutes', 'siliconflow', 'nebius', 'moonshot', 'yi', 'qwen', 'perplexity',
  'grok', 'zhipu', 'meta', 'polinai', 'ernie',
];

const isHttpsChat = (p: string) =>
  !!(PROVIDER_CONFIGS as any)[p]?.url && String((PROVIDER_CONFIGS as any)[p].url).startsWith('https://');

async function realEnvKeys(request: any) {
  const r = await request.get('/api/env');
  const j = await r.json();
  const map = j?.keys || {};
  return { has: Object.keys(map).filter(p => map[p]?.has), map };
}

// Esgota (via histórico local) todos os providers EXCEPTO o escolhido: assim o
// ranking só pode começar por ele — determinístico mesmo com as ~17 chaves
// embutidas do dev (inclui gemini/9router/tennis/etc, que senão pontuariam
// acima por limite maior). Provider sem chave não é afetado (não entra no rank).
function exhaustAllBut(keep: string) {
  return Object.keys(PROVIDER_CONFIGS)
    .filter(p => p !== keep)
    .map(p => ({ timestamp: Date.now(), provider: p, inputTokens: 9_000_000, outputTokens: 0, totalTokens: 9_000_000 }));
}

async function runCopyFlow(page: any) {
  await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
  await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });
  await page.getByRole('tab', { name: /copy/i }).first().click();
  const p = await activeRoot(page);
  await p.getByLabel(/briefing: ideia ou referência/i).first().fill(BRIEF);
  await p.getByRole('button', { name: /executar comando/i }).first().click();
  await expect(async () => {
    expect(await p.getByText('ZAFRA-42').first().isVisible().catch(() => false)).toBeTruthy();
  }).toPass({ timeout: 45000 });
}

async function activeRoot(page: any) {
  const kids = page.locator('[role="tabpanel"] > div');
  const n = await kids.count();
  for (let i = 0; i < n; i++) {
    const kid = kids.nth(i);
    const st = (await kid.getAttribute('style').catch(() => '')) || '';
    const hidden = await kid.getAttribute('aria-hidden').catch(() => null);
    if (st.includes('block') && hidden === 'false') return kid;
  }
  return page.locator('[role="tabpanel"]:visible').first();
}

test.describe('api/ai: contrato do proxy (nenhum upstream)', () => {
  test('GET responde 405 (bloqueia preflight cross-origin)', async ({ request }) => {
    expect((await request.get('/api/ai')).status()).toBe(405);
  });

  test('POST sem Origin (curl/cross-site) responde 403', async ({ request }) => {
    const r = await request.post('/api/ai', {
      data: { provider: 'zhipu', url: PROVIDER_CONFIGS.zhipu.url, body: '{}' },
    });
    expect(r.status()).toBe(403);
  });

  test('POST com Origin divergente responde 403', async ({ request }) => {
    const r = await request.post('/api/ai', {
      headers: { Origin: 'https://evil.example' },
      data: { provider: 'zhipu', url: PROVIDER_CONFIGS.zhipu.url, body: '{}' },
    });
    expect(r.status()).toBe(403);
  });

  test('provider desconhecido responde 400', async ({ request }) => {
    const r = await request.post('/api/ai', {
      headers: { Origin: ORIGIN },
      data: { provider: 'evilcorp', url: 'https://x.example/v1/chat', body: '{}' },
    });
    expect(r.status()).toBe(400);
  });

  test('SSRF: URL fora do allowlist (IP interno, host divergente, http) → 400', async ({ request }) => {
    const cases = [
      'https://169.254.169.254/latest/meta-data/',
      'https://open.bigmodel.cn@evil.example/v4/chat/completions',
      'http://open.bigmodel.cn/api/paas/v4/chat/completions',
      'https://open.bigmodel.cn:8443/api/paas/v4/chat/completions',
    ];
    for (const url of cases) {
      const r = await request.post('/api/ai', {
        headers: { Origin: ORIGIN },
        data: { provider: 'zhipu', url, body: '{}' },
      },
      );
      expect(r.status(), `url=${url}`).toBe(400);
    }
  });

  test('gateway local (9router → localhost) não passa pelo proxy → 400', async ({ request }) => {
    const r = await request.post('/api/ai', {
      headers: { Origin: ORIGIN },
      data: { provider: '9router', url: 'http://localhost:20128/v1/chat/completions', body: '{}' },
    });
    expect(r.status()).toBe(400);
  });

  test('provider sem chave no servidor → 503 PT-BR, sem vazar segredo', async ({ request }) => {
    const { has } = await realEnvKeys(request);
    const pick = PROXY_CANDIDATES.find(p => !has.includes(p) && isHttpsChat(p));
    test.skip(!pick, 'todos os candidatos têm chave local (.env) — sem candidato p/ este teste');
    const t0 = Date.now();
    const r = await request.post('/api/ai', {
      headers: { Origin: ORIGIN },
      data: {
        provider: pick,
        url: (PROVIDER_CONFIGS as any)[pick].url,
        headers: {},
        body: JSON.stringify({ model: 'x', messages: [] }),
      },
    });
    expect(r.status()).toBe(503);
    const txt = await r.text();
    expect(txt).toMatch(/ausente no servidor/);
    // Sem chave em claro na resposta de erro (e sem tentativa de upstream:
    // a resolução de chave falha ANTES de qualquer fetch — prova indireta é o 503).
    expect(txt).not.toMatch(/sk-[A-Za-z0-9]{6,}|nvapi-|gsk_/);
    expect(Date.now() - t0).toBeLessThan(5000);
  });
});

test.describe('proxy ON (seam de produção): geração via /api/ai', () => {
  test('roteia pelo proxy sem auth no payload e renderiza', async ({ page, request }) => {
    test.setTimeout(120000);
    const { has, map } = await realEnvKeys(request);
    const picked = PROXY_CANDIDATES.find(p => !has.includes(p) && isHttpsChat(p));
    test.skip(!picked, 'todos os candidatos têm chave local (.env) — sem candidato p/ este teste');

    // /api/env mentido: só `picked` "tem chave no servidor".
    const envMock: any = { ok: true, keys: {} };
    for (const p of Object.keys(map)) envMock.keys[p] = { has: false, masked: '', envKey: '' };
    envMock.keys[picked] = { has: true, masked: 'sk-servidor********', envKey: 'SERVIDOR_KEY' };

    const exhausted = exhaustAllBut(picked);
    let aiPayload: any = null;
    let envHits = 0;
    let directHits = 0;

    await page.addInitScript(({ hist }: any) => {
      try {
        localStorage.setItem('copymaster_server_keys', '1');
        localStorage.setItem('copymaster_usage_history', JSON.stringify(hist));
        localStorage.removeItem('copymaster_last_via');
      } catch {}
    }, { hist: exhausted });

    await page.route('**/*', (route) => {
      const url = route.request().url();
      let u: URL;
      try { u = new URL(url); } catch { return route.continue(); }
      if (u.host !== 'localhost:5173') {
        // 0 rede externa: chamada direta a um provider seria abortada E contada.
        if (/chat\/completions|generativelanguage/.test(url)) directHits++;
        return route.abort();
      }
      if (u.pathname === '/api/env') {
        envHits++;
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envMock) });
      }
      if (u.pathname === '/api/ai') {
        try { aiPayload = JSON.parse(route.request().postData() || '{}'); } catch { aiPayload = null; }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices(MF.mockCopyText(BRIEF))) });
      }
      return route.continue();
    });

    await page.goto('/');
    await runCopyFlow(page);

    expect(aiPayload, 'a geração DEVE ter passado por /api/ai').toBeTruthy();
    expect(aiPayload.provider).toBe(picked);
    const hk = Object.keys(aiPayload.headers || {}).map(k => k.toLowerCase());
    for (const bad of ['authorization', 'x-api-key', 'xi-api-key', 'x-goog-api-key', 'api-key']) {
      expect(hk, `header ${bad} não deve chegar ao proxy`).not.toContain(bad);
    }
    expect(String(aiPayload.url)).toMatch(/^https:/);
    expect(String(aiPayload.body)).toContain(BRIEF);
    expect(envHits, 'ensureServerKeys consultou /api/env').toBeGreaterThan(0);
    expect(directHits, 'nenhuma chamada direta ao provider').toBe(0);
  });
});

test.describe('proxy OFF (dev padrão): nunca usa /api/ai', () => {
  test('sem a flag, o mapa do servidor é ignorado e a chamada é direta', async ({ page, request }) => {
    test.setTimeout(120000);
    const { has, map } = await realEnvKeys(request);
    const direct = DIRECT_CANDIDATES.find(p => has.includes(p) && isHttpsChat(p));
    test.skip(!direct, 'sem chave dev em candidato https direto — nada a provar aqui');

    // /api/env mentindo (TODOS com chave): se o gate fosse ligado sem flag,
    // o cliente usaria o proxy — provar que em dev ele é ignorado.
    const envLying: any = { ok: true, keys: {} };
    for (const p of Object.keys(map)) envLying.keys[p] = { has: true, masked: 'x', envKey: 'X' };

    const exhausted = exhaustAllBut(direct);
    const directHost = new URL(String((PROVIDER_CONFIGS as any)[direct].url)).host;
    let aiHits = 0;
    let envHits = 0;
    let directHits = 0;

    // Sem copymaster_server_keys: é o estado padrão do dev.
    await page.addInitScript(({ hist }: any) => {
      try {
        localStorage.setItem('copymaster_usage_history', JSON.stringify(hist));
        localStorage.removeItem('copymaster_last_via');
      } catch {}
    }, { hist: exhausted });

    await page.route('**/*', (route) => {
      const url = route.request().url();
      let u: URL;
      try { u = new URL(url); } catch { return route.continue(); }
      if (u.host !== 'localhost:5173') {
        if (u.host === directHost) {
          directHits++;
          return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices(MF.mockCopyText(BRIEF))) });
        }
        return route.abort(); // qualquer outra rede externa morre aqui
      }
      if (u.pathname === '/api/ai') { aiHits++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices(MF.mockCopyText(BRIEF))) }); }
      if (u.pathname === '/api/env') { envHits++; return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(envLying) }); }
      return route.continue();
    });

    await page.goto('/');
    await runCopyFlow(page);

    expect(aiHits, 'em dev o proxy /api/ai NUNCA é usado').toBe(0);
    expect(envHits, 'sem a flag nem /api/env é consultado').toBe(0);
    expect(directHits, 'chamada direta ao provider (chave dev embutida)').toBeGreaterThan(0);
  });
});
