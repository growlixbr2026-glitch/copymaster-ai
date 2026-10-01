import { test, expect, Page } from '@playwright/test';

// home (WelcomeScreen) é full-screen SEM sidebar (AGENTS.md §2): a nav
// (nav[role=tablist] + button[role=tab]) só existe DENTRO de uma sessão.
// Bug original: contava as abas estando na home → 0 tabs → reprovação falsa.
const enterApp = async (page: Page) => {
  await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
  await expect(page.getByRole('tab').first()).toBeVisible({ timeout: 10000 });
};

// Bug original: `[role="tabpanel"][aria-hidden="false"]` nunca casa — o
// role=tabpanel é o CONTÊINER (App.tsx) e o aria-hidden fica nos FILHOS
// keep-alive. Lê o filho visível de verdade (mesmo padrão de army-controls).
const activePanelText = async (page: Page): Promise<string> => {
  const kids = page.locator('[role="tabpanel"] > div');
  const n = await kids.count();
  for (let i = 0; i < n; i++) {
    const kid = kids.nth(i);
    const st = (await kid.getAttribute('style').catch(() => '')) || '';
    const hidden = await kid.getAttribute('aria-hidden').catch(() => null);
    if (st.includes('display: block') && hidden === 'false') {
      return ((await kid.textContent()) || '').trim();
    }
  }
  return '';
};

test('basic: home loads and sidebar tabs exist', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /O Arquiteto da/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i })).toBeVisible();

  await enterApp(page);

  const tabs = page.getByRole('tab');
  const tabCount = await tabs.count();
  console.log(`Total de tabs: ${tabCount}`);

  expect(tabCount).toBeGreaterThanOrEqual(20);

  await tabs.nth(0).click();
  await page.waitForTimeout(1000);

  const panelText = await activePanelText(page);
  console.log(`Painel 0 chars: ${panelText.length}`);

  expect(panelText.length).toBeGreaterThan(100);
});

test('basic: navigate through 5 tabs', async ({ page }) => {
  await page.goto('/');
  await enterApp(page);

  const tabs = page.getByRole('tab');

  for (let i = 0; i < 5; i++) {
    await tabs.nth(i).click();
    await page.waitForTimeout(800);

    const panelText = await activePanelText(page);
    expect(panelText.length, `painel ${i} em branco`).toBeGreaterThan(50);
  }

  // Keep-alive: voltar à home preserva a sessão (contrato §2) — e a home
  // volta a ficar full-screen navegável.
  await page.getByRole('button', { name: /Voltar ao Início/i }).first().click();
  await expect(page.getByRole('heading', { name: /O Arquiteto da/i })).toBeVisible({ timeout: 10000 });
});
