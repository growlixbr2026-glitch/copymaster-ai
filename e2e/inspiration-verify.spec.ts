import { test, expect } from '@playwright/test';
import * as MF from './helpers/mockFactories';

// Inspiration: selo de verificação via 2º pass (opt-in, +1 call). Mock, 0 quota.
const BRIEF = 'sabedoria para empreendedores sem marcador';

test.describe('inspiration-verify: selo do juiz', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('openrouter_api_key', 'e2e-mock-key-sem-quota');
        localStorage.setItem('primary_text_provider', 'openrouter');
        localStorage.setItem('primary_prompt_provider', 'openrouter');
      } catch {}
    });
    await page.route(/\/v1\/chat\/completions|openrouter\.ai|localhost:20128/, async (route) => {
      const body = (route.request().postData() || '');
      const hay = body.toLowerCase();
      // Marca distintiva do juiz (2º pass): "[CANDIDATA 0] FRASE:".
      // Só "candidata" casa também com o prompt da 1ª passada (falso-positivo).
      if (hay.includes('[candidata') && hay.includes('frase:')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices(JSON.stringify({ verdicts: [{ index: 0, verdict: 'DUVIDOSA', evidence: 'sem fonte primaria', note: 'conferir' }] }))) });
      }
      const opt = (i: number) => `"Disciplina ${BRIEF} opcao ${i}" — Sêneca\nPROMPT EN: stoic poster, marble, ZAFRA-42 ${i}`;
      const text = `${opt(1)}\n|||INSP_DIVIDER|||\n${opt(2)}\n|||INSP_DIVIDER|||\n${opt(3)}\n|||NOTA_DIVIDER|||\nNota insp ZAFRA-42`;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices(text)) });
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

  test('verificar citações sela as opções', async ({ page }) => {
    test.setTimeout(120000);
    await page.getByRole('tab', { name: /inspira/i }).first().click();
    const p = await activeRoot(page);
    const ta = p.locator('textarea:visible').first();
    await ta.fill('sabedoria estoica para empreendedores');
    await p.getByRole('button', { name: /buscar inspira|find inspiration/i }).first().click();
    await expect(async () => {
      expect(await p.getByText('ZAFRA-42').first().isVisible().catch(() => false)).toBeTruthy();
    }).toPass({ timeout: 25000 });
    await p.getByRole('button', { name: /verificar citações/i }).first().click();
    await expect(async () => {
      const t = ((await p.textContent().catch(() => '')) || '');
      expect(/não verificada|verificada|falsa/i.test(t)).toBeTruthy();
    }).toPass({ timeout: 30000 });
  });
});
