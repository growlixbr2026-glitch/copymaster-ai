import { test, expect } from '@playwright/test';
import * as MF from './helpers/mockFactories';

const BRIEFING = 'consultoria marketing premium ZAFRA-42 Café ZAFRA-42';

function buildMockHandler() {
  return async (route: any) => {
    const body = (route.request().postData() || '').toLowerCase();
    let hay = body;
    try { const j = JSON.parse(body); if (j.messages) hay += ' ' + j.messages.map((m: any) => String(m.content || '').toLowerCase()).join(' '); } catch {}
    const isIdeas = hay.includes('nicho') && (hay.includes('contentideas') || hay.includes('content_ideas') || hay.includes('estrategista'));
    if (isIdeas) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.mockIdeasJson('consultoria ZAFRA-42')) });
    let text = MF.mockTextWithNota(BRIEFING, 'GEN ZAFRA-42');
    if (hay.includes('copywriter') || hay.includes('campo de batalha')) text = MF.mockCopyText(BRIEFING);
    else if (hay.includes('logo') || hay.includes('marca') || hay.includes('brand')) text = MF.mockLogo(BRIEFING);
    else if (hay.includes('carousel') || hay.includes('carrossel')) text = MF.mockCarousel(BRIEFING, 3);
    else if (hay.includes('quote') || hay.includes('frase')) text = MF.mockQuote(BRIEFING);
    else if (hay.includes('meme')) text = MF.mockMeme(BRIEFING);
    else if (hay.includes('lettering') || hay.includes('tipografia')) text = MF.mockLettering(BRIEFING);
    else if (hay.includes('ppt') || hay.includes('apresenta')) text = MF.mockPPT(BRIEFING, 5);
    else if (hay.includes('product architect') || hay.includes('vibe coding') || hay.includes('prd_divider')) text = MF.mockPRD(BRIEFING);
    else if (hay.includes('inspiration') || hay.includes('inspira')) text = MF.mockInsp(BRIEFING);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices(text)) });
  };
}

test.describe('full-user: 28 sessoes como usuario (mock)', () => {
  test.beforeEach(async ({ page }) => {
    // Chave dummy hermética: callAI exige chave antes do fetch; o route mock
    // abaixo intercepta tudo (0 quota, nada sai do browser).
    await page.addInitScript(() => {
      try {
        localStorage.setItem('openrouter_api_key', 'e2e-mock-key-sem-quota');
        localStorage.setItem('primary_text_provider', 'openrouter');
        localStorage.setItem('primary_prompt_provider', 'openrouter');
      } catch {}
    });
    await page.route(/\/v1\/chat\/completions|openrouter\.ai|localhost:20128|api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com|api\.groq\.com|api\.mistral\.ai|integrate\.api\.nvidia|api\.cohere|dashscope\.aliyuncs/, buildMockHandler());
    await page.route(/\/api\/research.*/, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [{ title: 'Fonte ZAFRA-42', url: 'https://example.com', snippet: 'trecho', sourceType: 'web', source: 'mock' }] }) }));
  });

  test('home + navegacao 28 sessoes (smoke estendido)', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /O Arquiteto da/i })).toBeVisible();
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });
    const tabs = page.getByRole('tab');
    expect(await tabs.count()).toBeGreaterThanOrEqual(28);
    for (let i = 0; i < await tabs.count(); i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(300);
      expect(((await page.locator('#root').textContent()) || '').trim().length).toBeGreaterThan(120);
    }
  });

  test('Ideas: bloqueio vazio -> habilita -> gera JSON mockado com ZAFRA-42', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    const inp = page.locator('input[placeholder*="consultoria"]').first();
    await expect(inp).toBeVisible({ timeout: 10000 });
    const gen = page.getByRole('button', { name: /gerar estratégia/i });
    await expect(gen).toBeDisabled();
    await inp.fill(BRIEFING);
    await expect(gen).toBeEnabled();
    await gen.click();
    await expect(page.getByText('ZAFRA-42').first()).toBeVisible({ timeout: 20000 });
  });

  async function expectVisibleText(page: any, s: string, timeout = 8000) {
    await expect(async () => {
      const locs = page.locator(`text=${s}`);
      const n = await locs.count();
      let vis = false;
      for (let i = 0; i < n && !vis; i++) vis = await locs.nth(i).isVisible().catch(() => false);
      expect(vis).toBeTruthy();
    }).toPass({ timeout });
  }

  test('ToolLayout badge + EngineLink + bloqueio campo vazio (copy)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    await page.getByRole('tab', { name: /copy/i }).first().click();
    await page.waitForTimeout(500);
    await expectVisibleText(page, 'Texto', 8000);
    const exec = page.getByRole('button', { name: /executar comando/i }).first();
    await expect(exec).toBeDisabled();
    await page.getByLabel(/briefing: ideia ou referência/i).first().fill(BRIEFING + ' instagram copy ZAFRA-42');
    await expect(exec).toBeEnabled();
    await exec.click();
    await expect(page.getByText('ZAFRA-42').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/varia[cç][aã]o/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('RefinementToolbar: ver pdf copiar contexto (apos geracao)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    await page.getByRole('tab', { name: /copy/i }).first().click();
    await page.waitForTimeout(500);
    await page.getByLabel(/briefing: ideia ou referência/i).first().fill(BRIEFING + ' teste refinement ZAFRA-42');
    await page.getByRole('button', { name: /executar comando/i }).first().click();
    await expect(page.getByText('ZAFRA-42').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: /verificar ia/i }).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /copiar/i }).first()).toBeVisible();
  });

  test('Image session EngineLink muda por motor (logo)', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });
    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible({ timeout: 8000 });
    await page.getByRole('tab', { name: /logo|identidade|elite|brand/i }).first().click();
    await page.waitForTimeout(600);
    await expectVisibleText(page, 'Prompt imagem', 8000);
    const link = page.locator('a[target="_blank"]');
    const ln = await link.count();
    let hrefOk = false;
    for (let i = 0; i < ln && !hrefOk; i++) {
      if (await link.nth(i).isVisible().catch(() => false)) {
        await expect(link.nth(i)).toHaveAttribute('href', /https?:\/\//);
        hrefOk = true;
      }
    }
    expect(hrefOk, 'EngineLink visível com href').toBeTruthy();
  });

  test('PRD: bloqueio vazio -> preenche -> gera PRD + Tokens + Exportar', async ({ page }) => {
    test.setTimeout(60000);
    await page.goto('/');
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('tab', { name: /prd/i }).first().click();
    await page.waitForTimeout(600);
    await expect(page.locator('text=PRD Vibe Studio').first()).toBeVisible({ timeout: 8000 });
    const gen = page.getByRole('button', { name: /gerar prd/i }).first();
    await expect(gen).toBeDisabled();
    await page.getByLabel(/Nome do Negócio/i).first().fill('Studio ZAFRA-42');
    await expect(gen).toBeEnabled();
    await gen.click();
    await expect(page.getByText('ZAFRA-42').first()).toBeVisible({ timeout: 25000 });
    await page.getByRole('button', { name: /tokens json/i }).first().click();
    await page.waitForTimeout(400);
    await expect(page.getByRole('button', { name: /exportar prd/i }).first()).toBeVisible({ timeout: 8000 });
  });
});
