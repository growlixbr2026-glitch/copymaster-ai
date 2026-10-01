import { test, expect } from '@playwright/test';
import * as MF from './helpers/mockFactories';

// outputGuard em fluxo real: divisor quebrado vira abas; selo de stats + limpar;
// recusa no carousel dispara retry robusto. Mock, 0 quota.
const BRIEF = 'cafeteria guard sem marcador';

test.describe('outputguard: reparo e verificação em fluxo real', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('openrouter_api_key', 'e2e-mock-key-sem-quota');
        localStorage.setItem('primary_text_provider', 'openrouter');
        localStorage.setItem('primary_prompt_provider', 'openrouter');
      } catch {}
    });
    await page.route(/\/api\/research.*/, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [] }) }));
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

  test('quote com divisor sem pipe final ainda abre 3 abas', async ({ page }) => {
    test.setTimeout(120000);
    await page.route(/\/v1\/chat\/completions|openrouter\.ai|localhost:20128/, async (route) => {
      const broken = MF.mockQuote(BRIEF).replaceAll('|||QUOTE_DIVIDER|||', '|||QUOTE_DIVIDER||');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices(broken)) });
    });
    await page.getByRole('tab', { name: /frases|impacto/i }).first().click();
    const p = await activeRoot(page);
    const tas = p.locator('textarea:visible');
    for (let i = 0; i < await tas.count(); i++) {
      const ta = tas.nth(i);
      if (await ta.isEditable().catch(() => false)) await ta.fill('frase guard teste').catch(() => {});
    }
    await p.getByRole('button', { name: /gerar cards|gerar/i }).first().click();
    await expect(async () => {
      expect(await p.getByText('ZAFRA-42').first().isVisible().catch(() => false)).toBeTruthy();
    }).toPass({ timeout: 25000 });
    const tabs = p.getByRole('tab', { name: /opção/i });
    expect(await tabs.count()).toBeGreaterThanOrEqual(3);
  });

  test('toolbar exibe selo sem-fonte e limpa stats', async ({ page }) => {
    test.setTimeout(120000);
    const withStat = `${BRIEF} cresce 20% ao mes sem lastro algum\n|||NOTA_DIVIDER|||\nNota guard`;
    await page.route(/\/v1\/chat\/completions|openrouter\.ai|localhost:20128/, async (route) => {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices(withStat)) });
    });
    await page.getByRole('tab', { name: /copy/i }).first().click();
    const p = await activeRoot(page);
    await p.getByLabel(/briefing: ideia ou referência/i).first().fill('cafeteria guard stats');
    await p.getByRole('button', { name: /executar comando/i }).first().click();
    const badge = p.getByRole('button', { name: /sem fonte/i }).first();
    await expect(async () => {
      expect(await badge.count() && await badge.isVisible().catch(() => false)).toBeTruthy();
    }).toPass({ timeout: 25000 });
    await badge.click();
    await page.waitForTimeout(500);
    const t = ((await p.textContent().catch(() => '')) || '');
    expect(t).toContain('[INSERIR DADO]');
  });

  test('carousel com recusa faz retry e entrega laminas', async ({ page }) => {
    test.setTimeout(180000);
    let calls = 0;
    await page.route(/\/v1\/chat\/completions|openrouter\.ai|localhost:20128/, async (route) => {
      calls++;
      const body = calls === 1
        ? 'I need the reference image to create the visual prompts. Please provide the image.'
        : MF.mockCarousel(BRIEF, 3);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices(body)) });
    });
    await page.getByRole('tab', { name: /carrossel|carousel/i }).first().click();
    const p = await activeRoot(page);
    const tas = p.locator('textarea:visible');
    for (let i = 0; i < await tas.count(); i++) {
      const ta = tas.nth(i);
      if (await ta.isEditable().catch(() => false)) await ta.fill('topico guard retry').catch(() => {});
    }
    await p.getByRole('button', { name: /criar narrativa|gerar|criar/i }).first().click();
    await expect(async () => {
      expect(await p.getByText('ZAFRA-42').first().isVisible().catch(() => false)).toBeTruthy();
    }).toPass({ timeout: 40000 });
    expect(calls, 'retry robusto disparou').toBeGreaterThanOrEqual(2);
  });
});
