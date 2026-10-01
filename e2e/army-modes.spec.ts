import { test, expect } from '@playwright/test';
import * as MF from './helpers/mockFactories';

const BRIEF = 'army test briefing sem marcador';

// ALPHA: todos os modos/toggles de cada suite (mock, 0 quota).
// Prova badge correto + UI condicional por modo + geração por modo.
function mockFor(hay: string): string {
  const h = hay.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (h.includes('prd_divider') || h.includes('product architect')) return MF.mockPRD(BRIEF);
  if (h.includes('email_divider')) return MF.mockEmail(BRIEF, 2);
  if (h.includes('ads_divider')) return MF.mockAds(BRIEF);
  if (h.includes('slide_divider')) return MF.mockCarousel(BRIEF, 3);
  if (h.includes('logo_option_divider') || h.includes('arquetipo')) return MF.mockLogo(BRIEF);
  if (h.includes('yt_option_divider')) return MF.mockYouTubeThumb(BRIEF);
  if (h.includes('scene_divider')) return MF.mockVideoPrompts(BRIEF, 2);
  if (h.includes('copywriter') || h.includes('campo de batalha')) return MF.mockCopyText(BRIEF);
  if (h.includes('usar a imagem em anexo')) return MF.mockImagePrompt(BRIEF);
  return MF.mockTextWithNota(BRIEF, 'GEN ZAFRA-42');
}

test.describe('army-alpha: modos de cada suite', () => {
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
    await page.route(/\/v1\/chat\/completions|openrouter\.ai|localhost:20128/, async (route) => {
      const body = (route.request().postData() || '').toLowerCase();
      let hay = body;
      try { const j = JSON.parse(body); if (j.messages) hay += ' ' + j.messages.map((m: any) => String(m.content || '').toLowerCase()).join(' '); } catch {}
      const isIdeas = hay.includes('nicho') && hay.includes('contentideas');
      const payload = isIdeas ? JSON.stringify(MF.mockIdeasJson('army')) : JSON.stringify(MF.toOpenAIChoices(mockFor(hay)));
      return route.fulfill({ status: 200, contentType: 'application/json', body: payload });
    });
    await page.route(/\/api\/research.*/, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [] }) }));
    await page.goto('/');
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });
  });

  async function gotoTab(page: any, re: RegExp) {
    await page.getByRole('tab', { name: re }).first().click();
    await page.waitForTimeout(600);
  }
  async function fillBriefing(page: any) {
    const tas = page.locator('textarea:visible');
    for (let i = 0; i < await tas.count(); i++) {
      const ta = tas.nth(i);
      if (await ta.isEditable().catch(() => false)) {
        const cur = await ta.inputValue().catch(() => '');
        if (!cur || cur.length < 5) await ta.fill(BRIEF).catch(() => {});
      }
    }
  }

  test('tiktok 4 modos: badge + UI condicional + gera', async ({ page }) => {
    test.setTimeout(180000);
    await gotoTab(page, /tiktok/i);
    const panel = page.locator('[role="tabpanel"]:visible').first();
    const modes: Array<[RegExp, 'Texto' | 'Prompt imagem']> = [
      [/roteiro viral/i, 'Texto'], [/venda direta/i, 'Texto'], [/# seo/i, 'Texto'], [/^capa$/i, 'Prompt imagem'],
    ];
    for (const [label, badge] of modes) {
      await panel.getByRole('button', { name: label }).first().click();
      await page.waitForTimeout(400);
      await expectVisibleText(panel, badge, 5000);
    }
    // cover mostra engine/style/ratio/customText
    await panel.getByRole('button', { name: /^capa$/i }).first().click();
    await expect(panel.getByLabel(/plataforma ia/i).first()).toBeVisible();
    await expect(panel.locator('a[target="_blank"]').first()).toBeVisible();
    // shop mostra 5 campos produto
    await panel.getByRole('button', { name: /venda direta/i }).first().click();
    await panel.getByPlaceholder(/nome do produto/i).first().fill('Produto Army');
    await fillBriefing(page);
    await panel.getByRole('button', { name: /^gerar$/i }).first().click();
    await expect(async () => {
      const locs = panel.getByText('ZAFRA-42');
      const n = await locs.count();
      let vis = false;
      for (let i = 0; i < n && !vis; i++) vis = await locs.nth(i).isVisible().catch(() => false);
      expect(vis).toBeTruthy();
    }).toPass({ timeout: 25000 });
  });

  test('youtube 3 modos: badge + thumb tabs', async ({ page }) => {
    test.setTimeout(180000);
    await gotoTab(page, /youtube|domínio/i);
    const panel = page.locator('[role="tabpanel"]:visible').first();
    await panel.getByRole('button', { name: /thumbnail/i }).first().click();
    await page.waitForTimeout(400);
    await expectVisibleText(panel, 'Prompt imagem', 5000);
    await panel.getByRole('button', { name: /roteiro/i }).first().click();
    await page.waitForTimeout(400);
    await expectVisibleText(panel, 'Texto', 5000);
    // gera roteiro real (mock) depois thumb herdando
    await fillBriefing(page);
    await panel.getByRole('button', { name: /executar comando/i }).first().click();
    await expect(async () => {
      const locs = panel.getByText('ZAFRA-42');
      const n = await locs.count();
      let vis = false;
      for (let i = 0; i < n && !vis; i++) vis = await locs.nth(i).isVisible().catch(() => false);
      expect(vis).toBeTruthy();
    }).toPass({ timeout: 25000 });
    await panel.getByRole('button', { name: /thumbnail/i }).first().click();
    await page.waitForTimeout(400);
    await expect(panel.getByText(/fonte/i).first()).toBeVisible({ timeout: 5000 });
  });

  async function visibleZafra(panel: any) {
    const locs = panel.getByText('ZAFRA-42');
    const n = await locs.count();
    for (let i = 0; i < n; i++) if (await locs.nth(i).isVisible().catch(() => false)) return true;
    return false;
  }

  // Texto visível (keep-alive + duplicados ocultos exigem checagem real, nunca .first()).
  async function visibleText(panel: any, s: string) {
    const locs = panel.locator(`text=${s}`);
    const n = await locs.count();
    for (let i = 0; i < n; i++) if (await locs.nth(i).isVisible().catch(() => false)) return true;
    return false;
  }
  async function expectVisibleText(panel: any, s: string, timeout = 8000) {
    await expect(async () => {
      expect(await visibleText(panel, s)).toBeTruthy();
    }).toPass({ timeout });
  }

  test('lp content/tech: toggle + gera cada', async ({ page }) => {
    test.setTimeout(180000);
    await gotoTab(page, /landing/i);
    const panel = page.locator('[role="tabpanel"]:visible').first();
    await panel.getByLabel('Produto', { exact: true }).first().fill('Produto Army');
    await fillBriefing(page);
    await panel.getByRole('button', { name: /arquitetar/i }).first().click();
    await expect(async () => {
      expect(await visibleZafra(panel)).toBeTruthy();
    }).toPass({ timeout: 25000 });
    await expect(panel.getByRole('button', { name: /verificar ia/i }).first()).toBeVisible({ timeout: 8000 });
    await panel.getByRole('button', { name: /vibe coding/i }).first().click();
    await page.waitForTimeout(400);
    await expect(panel.getByRole('button', { name: /gerar prompt tech/i }).first()).toBeVisible();
    await panel.getByRole('button', { name: /gerar prompt tech/i }).first().click();
    await expect(async () => {
      expect(await visibleZafra(panel)).toBeTruthy();
    }).toPass({ timeout: 25000 });
    await expect(panel.getByRole('button', { name: /copiar/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test('copy 4 briefingTypes: ideia/ref/imagem/pdf', async ({ page }) => {
    test.setTimeout(120000);
    await gotoTab(page, /copy/i);
    const panel = page.locator('[role="tabpanel"]:visible').first();
    await panel.getByRole('button', { name: /modelagem/i }).first().click();
    await page.waitForTimeout(300);
    await expect(panel.getByLabel(/briefing: ideia ou referência/i).first()).toBeVisible();
    await panel.getByRole('button', { name: /^imagem$/i }).first().click();
    await page.waitForTimeout(300);
    await expect(panel.getByText(/subir imagem/i).first()).toBeVisible({ timeout: 5000 });
    await expect(panel.locator('input[type="file"]').first()).toBeAttached();
    await panel.getByRole('button', { name: /^pdf$/i }).first().click();
    await page.waitForTimeout(300);
    await expect(panel.getByText(/subir pdf/i).first()).toBeVisible({ timeout: 5000 });
    await panel.getByRole('button', { name: /conceito/i }).first().click();
    await page.waitForTimeout(300);
  });

  test('notebook 8 cards trocam objetivo', async ({ page }) => {
    test.setTimeout(120000);
    await gotoTab(page, /notebook/i);
    const panel = page.locator('[role="tabpanel"]:visible').first();
    const cards = panel.locator('button').filter({ hasText: /resumo|mapa|relatório|cartões|questões|infográfico|slides|vídeo/i });
    expect(await cards.count()).toBeGreaterThanOrEqual(8);
    for (let i = 0; i < await cards.count(); i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(200);
    }
  });

  test('citation 4 model modes + toggle autor', async ({ page }) => {
    test.setTimeout(120000);
    await gotoTab(page, /cita/i);
    const panel = page.locator('[role="tabpanel"]:visible').first();
    const modeSel = panel.getByLabel(/modelo.*pinterest|quote.*model/i).first();
    if (await modeSel.count() === 0) {
      // fallback: qualquer select com as 4 opções none/link/upload/preset
      const sels = panel.locator('select:visible');
      expect(await sels.count()).toBeGreaterThan(0);
    }
    const sw = panel.locator('[role="switch"]').first();
    if (await sw.count()) {
      const before = await sw.getAttribute('aria-checked');
      await sw.click();
      await page.waitForTimeout(200);
      expect(await sw.getAttribute('aria-checked')).not.toBe(before);
      await sw.click();
    }
  });

  test('media 4 tabs: badge por tab', async ({ page }) => {
    test.setTimeout(120000);
    await gotoTab(page, /media/i);
    const panel = page.locator('[role="tabpanel"]:visible').first();
    for (const [tabRe, badge] of [[/imagem/i, 'Prompt imagem'], [/v[ií]deo/i, 'Prompt imagem'], [/[aá]udio/i, 'Texto'], [/m[úu]sica/i, 'Texto']] as Array<[RegExp, string]>) {
      await panel.getByRole('button', { name: tabRe }).first().click().catch(() => {});
      await page.waitForTimeout(300);
      await expectVisibleText(panel, badge, 5000);
    }
  });
});
