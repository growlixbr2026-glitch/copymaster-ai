import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// A11Y: Axe zero critical em 6 tabs representativas + teclado até o gerar.
const TABS: Array<{ re: RegExp; name: string }> = [
  { re: /copy/i, name: 'copy' },
  { re: /prd/i, name: 'prd' },
  { re: /youtube|domínio/i, name: 'youtube' },
  { re: /identidade|elite|brand/i, name: 'logo' },
  { re: /media/i, name: 'media' },
  { re: /cita/i, name: 'citation' },
];

test.describe('a11y: axe por tab + teclado', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (e) => { throw new Error('PAGEERROR: ' + String(e).slice(0, 200)); });
    await page.goto('/');
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });
  });

  for (const t of TABS) {
    test(`axe ${t.name} zero critical`, async ({ page }) => {
      test.setTimeout(120000);
      await page.getByRole('tab', { name: t.re }).first().click();
      await page.waitForTimeout(800);
      const res = await new AxeBuilder({ page } as any).withTags(['wcag2a', 'wcag2aa']).analyze();
      const crit = res.violations.filter((v: any) => v.impact === 'critical');
      expect(crit, JSON.stringify(crit.map((c: any) => c.id + ':' + (c.nodes?.length || 0)))).toEqual([]);
    });
  }

  test('teclado: skip link leva ao painel e tab alcanca gerar', async ({ page }) => {
    test.setTimeout(120000);
    await page.getByRole('tab', { name: /copy/i }).first().click();
    await page.waitForTimeout(500);
    // Skip link (sr-only até o foco): foca e ativa por teclado.
    const skip = page.getByRole('button', { name: /pular para o conteúdo/i }).first();
    await skip.focus();
    await expect(skip).toBeFocused({ timeout: 5000 });
    await skip.press('Enter');
    await page.waitForTimeout(300);
    // Habilita o gerar (botão desabilitado sai da ordem de Tab).
    const panel = page.locator('[role="tabpanel"]:visible').first();
    await panel.getByLabel(/briefing: ideia ou referência/i).first().fill('cafeteria teste teclado');
    // Do painel, Tab alcança o gerar (copy tem ~40 controles antes: tons+gatilhos).
    let focused = '';
    for (let i = 0; i < 80; i++) {
      await page.keyboard.press('Tab');
      const el = page.locator(':focus');
      const tag = await el.evaluate((n: any) => `${n.tagName}.${(n.getAttribute('aria-label') || n.textContent || '').slice(0, 40)}`).catch(() => '');
      if (/executar comando/i.test(tag)) { focused = tag; break; }
    }
    expect(focused).toMatch(/executar comando/i);
  });
});
