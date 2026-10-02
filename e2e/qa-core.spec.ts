import { test, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

test('core: home loads clean', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text().slice(0, 150)); });
  await page.goto('/');
  await expect(page.locator('#root')).toBeVisible();
  await expect(page).toHaveTitle(/CopyMaster/i);
  expect(errors, JSON.stringify(errors.slice(0, 4))).toEqual([]);
});

test('core: ideas blocks empty niche', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /ideias|sala de ideias/i }).first().click();
  const genBtn = page.getByRole('button', { name: /gerar estratégia/i });
  await expect(genBtn).toBeVisible();
  expect(await genBtn.isDisabled()).toBeTruthy();
});

test('core: all sessions render without page errors', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
  await page.goto('/');
  await page.getByRole('button', { name: /ideias|sala de ideias/i }).first().click();
  await page.waitForTimeout(600);
  const tabs = page.getByRole('tab');
  const n = await tabs.count();
  expect(n).toBeGreaterThanOrEqual(33);
  for (let i = 0; i < n; i++) {
    await tabs.nth(i).click();
    await page.waitForTimeout(200);
    const len = (((await page.locator('#root').textContent()) || '').trim().length);
    expect(len, `sessao ${i} em branco`).toBeGreaterThan(200);
  }
  expect(errors, JSON.stringify(errors.slice(0, 4))).toEqual([]);
});

test('core: axe home zero critical', async ({ page }) => {
  await page.goto('/');
  const res = await new AxeBuilder({ page }).analyze();
  const critical = res.violations.filter((v) => v.impact === 'critical');
  expect(critical.map((c) => c.id)).toEqual([]);
});

test('core: total provider failure shows friendly error', async ({ page }) => {
  // Cadeia longa (9+ provedores × 4 seções Ideas em paralelo × throttle 2,5s):
  // falha total leva ~35s para agregar. Timeout padrão de 30s não basta.
  test.setTimeout(180000);
  await page.route(/localhost:20128|openrouter\.ai|nvidia\.com|polin\.ai|groq\.com|mistral\.ai|googleapis\.com|anthropic\.com|deepseek\.com|api\.deepseek\.com|api\.cohere\.ai/, (r) => r.abort('failed'));
  await page.goto('/');
  await page.getByRole('button', { name: /ideias|sala de ideias/i }).first().click();
  await page.locator('input[type="text"]').first().fill('teste de falha total');
  await page.getByRole('button', { name: /gerar estratégia/i }).click();
  const errBox = page.locator('div[class*="bg-red-950"]');
  await expect(errBox).toBeVisible({ timeout: 90000 });
  const errText = (await errBox.textContent()) || '';
  expect(errText).not.toContain('{"object"');
  expect(errText).not.toContain('tier_not_allowed');
  await expect(page.getByRole('button', { name: /centro de comando/i })).toBeVisible();
});
