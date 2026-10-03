import { test, expect } from '@playwright/test';

/**
 * Guia F1 (SectionHelp detalhado) — 0 quota, determinístico.
 * Prova: modal com guia registrado renderiza seções longas; Recolher/Expandir
 * funcionam; Esc fecha; F1 abre/fecha uma única instância (keep-alive multi-painel).
 */

const helpBtn = (page: import('@playwright/test').Page) =>
  page.locator('button[aria-label*="Guia detalhado"]:visible').first();

test('guide F1: Copywriting Pro abre com guia detalhado longo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /ideias|sala de ideias/i }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole('tab', { name: /copywriting/i }).click();
  await page.waitForTimeout(400);

  await helpBtn(page).click();
  const modal = page.locator('div.max-w-4xl');
  await expect(modal).toBeVisible();
  await expect(modal.getByText('Guia: Copywriting Pro')).toBeVisible();

  // Seções essenciais do guia F1
  await expect(modal.getByText('O que é este módulo').first()).toBeVisible();
  await expect(modal.getByText('Como usar (passo a passo)').first()).toBeVisible();
  await expect(modal.getByText('Perguntas rápidas (FAQ)').first()).toBeVisible();

  // Conteúdo detalhado (F1 longo, não a descrição de uma linha)
  const len = ((await modal.textContent()) || '').length;
  expect(len, `guia curto: ${len} chars`).toBeGreaterThan(3000);

  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
});

test('guide F1: Recolher/Expandir tudo alternam as seções', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /ideias|sala de ideias/i }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole('tab', { name: /copywriting/i }).click();
  await page.waitForTimeout(400);
  await helpBtn(page).click();

  const modal = page.locator('div.max-w-4xl');
  await expect(modal).toBeVisible();

  // Recolher: o <ol> do workflow some; Expandir: volta.
  await modal.getByRole('button', { name: 'Recolher tudo' }).click();
  await expect(modal.locator('ol.list-decimal').first()).toBeHidden();

  await modal.getByRole('button', { name: 'Expandir tudo' }).click();
  await expect(modal.locator('ol.list-decimal').first()).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(modal).toBeHidden();
});

test('guide F1: atalho F1 abre e fecha uma única instância', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /ideias|sala de ideias/i }).first().click();
  await page.waitForTimeout(600);
  await page.getByRole('tab', { name: /copywriting/i }).click();
  await page.waitForTimeout(400);

  const modal = page.locator('div.max-w-4xl');
  await page.keyboard.press('F1');
  await expect(modal).toBeVisible();

  // Segundo F1 fecha (não empilha modal de outro painel do keep-alive)
  await page.keyboard.press('F1');
  await expect(modal).toBeHidden();
  await expect(page.locator('div.max-w-4xl')).toHaveCount(0);
});

test('guide F1: bridge RevOps também tem guia registrado', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /ideias|sala de ideias/i }).first().click();
  await page.waitForTimeout(600);

  const revopsTab = page.getByRole('tab', { name: /revops/i }).first();
  await revopsTab.click();
  await page.waitForTimeout(500);

  await helpBtn(page).click();
  const modal = page.locator('div.max-w-4xl');
  await expect(modal).toBeVisible();
  await expect(modal.getByText('Guia: RevOps Brief')).toBeVisible();
  const len = ((await modal.textContent()) || '').length;
  expect(len, `guia bridge curto: ${len} chars`).toBeGreaterThan(2000);
});
