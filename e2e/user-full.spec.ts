import { test, expect } from '@playwright/test';
import { activePanelText } from './helpers/sessionTabs';

// Geração :free é flaky por throughput externo (provado: 170–360s p/ corpos grandes).
// Retry cobre a variância do tier gratuito sem mascarar bug de app (erros de app falham determinístico).
test.describe.configure({ retries: 1 });

test('usuario: home hero + todas ferramentas listadas', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(String(e).slice(0,200)));
  page.on('console', m => { if (m.type()==='error' && !m.text().includes('favicon')) errors.push(m.text().slice(0,200)); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /O Arquiteto da/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i })).toBeVisible();
  const cards = page.locator('button:has-text("Acessar Módulo")');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThanOrEqual(20);
  expect(errors, JSON.stringify(errors.slice(0,3))).toEqual([]);
});

test('usuario: navega 50 sessoes via sidebar sem quebrar', async ({ page }) => {
  // 50 tabs × (click + 1500ms) + lazy chunks + wallet/settings ≈ 90s+.
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(String(e).slice(0,200)));
  // SettingsCenter sonda http://localhost:20128 (9Router opcional); com ele offline o
  // browser loga ERR_CONNECTION_REFUSED — esperado e tratado na UI ("usando OpenRouter direto").
  page.on('console', m => { const t = m.text(); if (m.type()==='error' && !t.includes('favicon') && !t.includes('20128') && !t.includes('ERR_CONNECTION_REFUSED')) errors.push(t.slice(0,200)); });
  await page.goto('/');
  await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
  await page.waitForTimeout(900);
  await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });

  // 50 tabs no sidebar (wallet/settings sao botoes, nao tabs)
  const tabs = page.getByRole('tab');
  const n = await tabs.count();
  expect(n, 'sidebar tabs').toBeGreaterThanOrEqual(50);
  for (let i=0;i<n;i++) {
    await tabs.nth(i).click();
    // Aguarda o painel visível (keep-alive: display:none → display:block)
    await page.waitForTimeout(1500);
    // Escopar asserts ao painel visível — o App.tsx usa keep-alive com
    // display:block/none nos FILHOS do role=tabpanel; o aria-hidden="false"
    // fica neles, nunca no contêiner (ver basic-flow.spec.ts).
    const panelText = await activePanelText(page);
    // 50 = anti-vazio (Personas em estado inicial tem ~86 chars com UI real).
    expect(panelText.length, `sessao ${i} em branco`).toBeGreaterThan(50);
    expect(await page.locator('text=Algo deu errado').count(), `sessao ${i} error boundary`).toBe(0);
  }
  // wallet + settings via botoes inferiores
  await page.getByRole('button', { name: /carteira tokens/i }).click();
  await page.waitForTimeout(1500);
  const walletPanelText = await activePanelText(page);
  expect(walletPanelText.length).toBeGreaterThan(150);
  await page.getByRole('button', { name: /configura/i }).click();
  await page.waitForTimeout(1500);
  // SettingsCenter redesenhado (auto-seleção V24): a antiga seção
  // "OpenRouter :free" agora é "Modelos Gratuitos OpenRouter (... na rotação)".
  await expect(page.getByText(/Modelos Gratuitos OpenRouter/i).first()).toBeVisible({ timeout: 8000 });
  expect(errors, JSON.stringify(errors.slice(0,4))).toEqual([]);
  await page.getByRole('button', { name: /Voltar ao Início/i }).click();
  await expect(page.getByRole('heading', { name: /O Arquiteto da/i })).toBeVisible();
});

test('usuario: bloqueios de campo vazio + ajuda', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
  await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });
  const gen = page.getByRole('button', { name: /gerar estratégia/i });
  await expect(gen).toBeVisible();
  expect(await gen.isDisabled()).toBeTruthy();
  await page.locator('input[placeholder*="consultoria"]').first().fill('skincare vegano premium');
  await expect(gen).toBeEnabled();
  await page.getByRole('tab', { name: /copy/i }).first().click();
  await page.waitForTimeout(700);
  const exec = page.getByRole('button', { name: /executar comando/i });
  if (await exec.count()) {
    expect(await exec.isDisabled(), 'copy executar deve bloquear sem briefing').toBeTruthy();
  }
  // Centro de comando / wallet acessíveis via tabs (sistema)
  const settingsTab = page.getByRole('tab', { name: /settings|centro|auditoria/i }).first();
  await expect(settingsTab).toBeVisible({ timeout: 5000 });
});

test('usuario: geracao real OpenRouter :free (sample ideas)', async ({ page }) => {
  // Modelo :free gratuito: corpo de ~40KB chega a ~360s sob throttle; com repair-retry o pior caso passa de 600s.
  test.setTimeout(740000);
  await page.goto('/');
  await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
  await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });
  await page.locator('input[placeholder*="consultoria"]').first().fill('café especial em grãos para baristas');
  const gen = page.getByRole('button', { name: /gerar estratégia/i });
  await gen.click();
  await expect(page.locator('text=Pesquisa Instantânea').first()).toBeVisible({ timeout: 35000 });
  // Aguarda fim do LLM: ou erro friendly, ou botao "Baixar Relatório" (sucesso).
  // Polling manual pois o erro pode chegar bem depois da pesquisa instantânea.
  const errBox = page.locator('div[class*="bg-red-950"]');
  const doneBtn = page.locator('button:has-text("Baixar Relatório")');
  let outcome: 'ok' | 'err' | 'timeout' = 'timeout';
  for (let i = 0; i < 200; i++) {
    await page.waitForTimeout(3000);
    // Erro tem precedência: "Baixar Relatório" aparece também no estado de erro
    if (await errBox.count() && await errBox.first().isVisible().catch(()=>false)) { outcome = 'err'; break; }
    if (await doneBtn.count() && await doneBtn.first().isVisible().catch(()=>false)) { outcome = 'ok'; break; }
  }
  if (outcome === 'err') {
    const t = (await errBox.first().textContent())||'';
    expect(t).not.toContain('tier_not_allowed');
    expect(t).not.toContain('{"object"');
    expect(t).not.toContain('JSON not found');
    await expect(page.getByRole('button', { name: /tentar novamente/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /centro de comando/i })).toBeVisible();
  } else {
    expect(outcome, 'geracao nao terminou em ~600s (nem sucesso nem erro)').toBe('ok');
    // Ideias ficam na aba interna "Ideias de Copy" — precisa clicar.
    // Asserts por card real (headers vazios não contam).
    await page.getByRole('tab', { name: /ideias de copy/i }).click();
    await expect(page.getByRole('button', { name: /desenvolver no editor/i }).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('tab', { name: /tendências/i }).click();
    await expect(page.locator('text=Análise Estratégica').first()).toBeVisible({ timeout: 15000 });
  }
});

test('usuario: geracao leve OpenRouter :free (copy pro)', async ({ page }) => {
  // Resposta curta (~2KB): mesmo sob throttle do :free completa em <300s.
  test.setTimeout(340000);
  await page.goto('/');
  await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
  await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });
  await page.getByRole('tab', { name: /^copywriting pro$/i }).click();
  await page.waitForTimeout(800);
  const brief = page.getByLabel(/briefing: ideia ou referência/i);
  await expect(brief).toBeVisible({ timeout: 8000 });
  await brief.fill('Café especial em grãos para baristas: frase de impacto curta para Instagram, tom desafiador.');
  const exec = page.getByRole('button', { name: /executar comando/i });
  await expect(exec).toBeEnabled();
  await exec.click();
  // Tab "Variação 1" só renderiza com copy gerado (generatedCopies[0].copy truthy).
  // Sob throttle do :free pode falhar — nesse caso o erro DEVE ser visível e friendly (nunca silêncio).
  const varTab = page.getByRole('button', { name: /variação 1/i });
  const errBox = page.locator('div[class*="bg-red-950"]');
  await expect(varTab.or(errBox)).toBeVisible({ timeout: 300000 });
  if (await errBox.first().isVisible().catch(()=>false)) {
    const t = (await errBox.first().textContent())||'';
    expect(t).not.toContain('tier_not_allowed');
    expect(t).not.toContain('{"object"');
    await expect(page.getByRole('button', { name: /tentar novamente/i })).toBeVisible();
  } else {
    await expect(varTab).toBeVisible();
  }
});
