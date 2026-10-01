import { test, expect } from '@playwright/test';
import * as MF from './helpers/mockFactories';

// FALLBACK ROBUSTO: troca automática sem prejudicar o resultado. Mock, 0 quota.
const FALLBACK_TEXT = 'fallback ok ZAFRA-42 fala pura de teste vallen';

function seedTwoKeys() {
  return () => {
    try {
      localStorage.setItem('openrouter_api_key', 'e2e-mock-key-openrouter');
      localStorage.setItem('groq_api_key', 'e2e-mock-key-groq');
      localStorage.setItem('primary_text_provider', 'openrouter');
      localStorage.setItem('primary_prompt_provider', 'openrouter');
    } catch {}
  };
}

test.describe('fallback: troca automatica preserva resultado', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(seedTwoKeys());
    await page.goto('/');
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });
  });

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

  test('429 no primario => sucesso no secundario com mesmo output', async ({ page }) => {
    test.setTimeout(120000);
    let groqHits = 0;
    await page.route(/openrouter\.ai/, async (r) => r.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Rate limit exceeded, free-models-per-day' } }) }));
    await page.route(/groq\.com/, async (r) => { groqHits++; return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices(`${FALLBACK_TEXT}\n|||NOTA_DIVIDER|||\nNota fallback`)) }); });
    await page.getByRole('tab', { name: /copy/i }).first().click();
    const p = await activeRoot(page);
    await p.getByLabel(/briefing: ideia ou referência/i).first().fill('cafeteria teste fallback');
    await p.getByRole('button', { name: /executar comando/i }).first().click();
    await expect(async () => {
      expect(await p.getByText('ZAFRA-42').first().isVisible().catch(() => false)).toBeTruthy();
    }).toPass({ timeout: 45000 });
    expect(groqHits, 'secundario foi acionado').toBeGreaterThan(0);
    const via = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('copymaster_last_via') || 'null'); } catch { return null; } });
    expect(via && via.provider, 'via registrado').toBe('groq');
  });

  test('providor morto (abort) => pula sem travar', async ({ page }) => {
    test.setTimeout(120000);
    await page.route(/openrouter\.ai/, async (r) => r.abort('failed'));
    await page.route(/groq\.com/, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices(`${FALLBACK_TEXT}\n|||NOTA_DIVIDER|||\nNota`)) }));
    await page.getByRole('tab', { name: /copy/i }).first().click();
    const p = await activeRoot(page);
    await p.getByLabel(/briefing: ideia ou referência/i).first().fill('cafeteria teste dead skip');
    await p.getByRole('button', { name: /executar comando/i }).first().click();
    await expect(async () => {
      expect(await p.getByText('ZAFRA-42').first().isVisible().catch(() => false)).toBeTruthy();
    }).toPass({ timeout: 45000 });
  });

  test('quota local zerada => primario vai pro fim (secundario primeiro)', async ({ page }) => {
    test.setTimeout(120000);
    const order: string[] = [];
    await page.addInitScript(() => {
      try {
        const hist = [{ timestamp: Date.now(), provider: 'openrouter', inputTokens: 2500000, outputTokens: 0, totalTokens: 2500000 }];
        localStorage.setItem('copymaster_usage_history', JSON.stringify(hist));
      } catch {}
    });
    await page.reload();
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });
    await page.route(/openrouter\.ai/, async (r) => { order.push('openrouter'); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices('primario ZAFRA-42')) }); });
    await page.route(/groq\.com/, async (r) => { order.push('groq'); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices('secundario ZAFRA-42')) }); });
    await page.getByRole('tab', { name: /copy/i }).first().click();
    const p = await activeRoot(page);
    await p.getByLabel(/briefing: ideia ou referência/i).first().fill('cafeteria teste short-circuit');
    await p.getByRole('button', { name: /executar comando/i }).first().click();
    await expect(async () => {
      expect(await p.getByText('ZAFRA-42').first().isVisible().catch(() => false)).toBeTruthy();
    }).toPass({ timeout: 45000 });
    expect(order.length, 'houve chamadas').toBeGreaterThan(0);
    expect(order[0], 'secundario saudavel primeiro').toBe('groq');
  });

  test('auditoria: testa todas e mostra semaforo', async ({ page }) => {
    test.setTimeout(120000);
    await page.route(/openrouter\.ai|groq\.com/, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices('OK')) }));
    await page.getByRole('button', { name: /configura|settings|centro/i }).first().click();
    await page.waitForTimeout(700);
    const p = await activeRoot(page);
    await p.getByRole('button', { name: /testar todas as chaves/i }).first().click();
    await expect(async () => {
      const t = ((await p.textContent().catch(() => '')) || '');
      expect(/concluído/i.test(t)).toBeTruthy();
    }).toPass({ timeout: 60000 });
    const t = ((await p.textContent().catch(() => '')) || '');
    expect(t).toMatch(/chaves OK/);
    const map = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('copymaster_keyhealth:v1') || 'null'); } catch { return null; } });
    expect(map && Array.isArray(map.keys) && map.keys.length >= 2, 'mapa com as 2 chaves').toBeTruthy();
  });

  test('turbo: usa o mais rapido e registra via', async ({ page }) => {
    test.setTimeout(120000);
    await page.addInitScript(() => { try { localStorage.setItem('turbo_mode', '1'); } catch {} });
    await page.reload();
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });
    await page.route(/openrouter\.ai/, async (r) => { await new Promise((x) => setTimeout(x, 3000)); return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices('lento ZAFRA-42')) }); });
    await page.route(/groq\.com/, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices('rapido ZAFRA-42 turbo')) }));
    await page.getByRole('tab', { name: /copy/i }).first().click();
    const p = await activeRoot(page);
    await p.getByLabel(/briefing: ideia ou referência/i).first().fill('cafeteria teste turbo');
    await p.getByRole('button', { name: /executar comando/i }).first().click();
    await expect(async () => {
      const t = ((await p.textContent().catch(() => '')) || '');
      expect(t.includes('ZAFRA-42')).toBeTruthy();
    }).toPass({ timeout: 45000 });
    const t = ((await p.textContent().catch(() => '')) || '');
    expect(t.includes('rapido'), 'vencedor foi o rapido').toBeTruthy();
  });
});
