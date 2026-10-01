import { test, expect } from '@playwright/test';

// I18N: troca de idioma não quebra nada; listas localizam; ES cai em EN.
test.describe('i18n: EN/ES sem crash, notebook localiza', () => {
  test.beforeEach(async ({ page }) => {
    page.on('pageerror', (e) => { throw new Error('PAGEERROR: ' + String(e).slice(0, 200)); });
    await page.goto('/');
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });
  });

  async function setLang(page: any, v: string) {
    const sel = page.getByLabel(/Idioma \/ Language/i).first();
    await sel.selectOption(v);
    await page.waitForTimeout(800);
  }

  test('EN: notebook card 1 em ingles + 28 tabs sem erro', async ({ page }) => {
    test.setTimeout(180000);
    await setLang(page, 'English (US)');
    await page.getByRole('tab', { name: /notebook/i }).first().click();
    await page.waitForTimeout(600);
    const panel = page.locator('[role="tabpanel"]:visible').first();
    await expect(panel.getByText(/Audio Overview Instructions/i).first()).toBeVisible({ timeout: 8000 });
    const tabs = page.getByRole('tab');
    expect(await tabs.count()).toBeGreaterThanOrEqual(28);
    for (let i = 0; i < await tabs.count(); i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(350);
    }
  });

  test('ES: fallback sem crash + 28 tabs', async ({ page }) => {
    test.setTimeout(180000);
    await setLang(page, 'Español');
    await page.getByRole('tab', { name: /notebook/i }).first().click();
    await page.waitForTimeout(600);
    const panel = page.locator('[role="tabpanel"]:visible').first();
    await expect(panel.getByText(/Resumen de Audio/i).first()).toBeVisible({ timeout: 8000 });
    const tabs = page.getByRole('tab');
    expect(await tabs.count()).toBeGreaterThanOrEqual(28);
  });

  test('PT: cards PT de volta (sem estado grudado)', async ({ page }) => {
    test.setTimeout(120000);
    await setLang(page, 'English (US)');
    await setLang(page, 'Português (Brasil)');
    await page.getByRole('tab', { name: /notebook/i }).first().click();
    await page.waitForTimeout(600);
    const panel = page.locator('[role="tabpanel"]:visible').first();
    await expect(panel.getByText(/Resumo em Áudio/i).first()).toBeVisible({ timeout: 8000 });
  });
});
