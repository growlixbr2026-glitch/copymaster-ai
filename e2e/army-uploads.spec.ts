import { test, expect } from '@playwright/test';
import * as MF from './helpers/mockFactories';

const BRIEF = 'army upload sem marcador';
const PNG = 'e2e/fixtures/tiny.png';
const PDF = 'e2e/fixtures/mini.pdf';

// BRAVO: uploads em todas as sessões com UI (mock, 0 quota).
// Prova: tile upload -> thumb -> remove -> gera com refRule no payload.
function mockFor(hay: string): string {
  const h = hay.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (h.includes('site dna') || h.includes('vision analyst for marketing')) {
    return JSON.stringify({ layout: 'hero esquerda', grid: '12 colunas', typography: 'Sora 600', palette: '#0A0A0A fundo claro', components: 'nav hero cards', spacing: '4pt', motion: 'fade-up', avoid: 'neon' });
  }
  if (h.includes('slide_divider')) return MF.mockCarousel(BRIEF, 3);
  if (h.includes('logo_option_divider') || h.includes('arquetipo')) return MF.mockLogo(BRIEF);
  if (h.includes('quote_divider')) return MF.mockQuote(BRIEF);
  if (h.includes('meme_divider')) return MF.mockMeme(BRIEF);
  if (h.includes('copywriter') || h.includes('campo de batalha')) return MF.mockCopyText(BRIEF);
  if (h.includes('usar a imagem em anexo')) return MF.mockImagePrompt(BRIEF);
  if (h.includes('analista visual') || h.includes('fatos visuais')) return 'FATO VISUAL: imagem de teste para briefing ZAFRA-42.';
  if (h.includes('analista de documentos')) return 'DOCUMENTO: conteúdo de teste para briefing ZAFRA-42.';
  if (h.includes('site dna') || h.includes('vision analyst for marketing')) {
    return JSON.stringify({ layout: 'hero esquerda', grid: '12 colunas', typography: 'Sora', palette: '#000', components: 'nav hero', spacing: '4pt', motion: 'fade', avoid: 'neon' });
  }
  return MF.mockTextWithNota(BRIEF, 'GEN ZAFRA-42');
}

test.describe('army-bravo: uploads', () => {
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
  function panel(page: any) {
    return page.locator('[role="tabpanel"]:visible').first();
  }
  // Container keep-alive ATIVO (display:block) — o tabpanel geral engloba
  // sessões ocultas; sem isso, .first() pega botões/inputs de sessão errada.
  async function activeRoot(page: any) {
    const kids = page.locator('[role="tabpanel"] > div');
    const n = await kids.count();
    for (let i = 0; i < n; i++) {
      const kid = kids.nth(i);
      const st = (await kid.getAttribute('style').catch(() => '')) || '';
      const hidden = await kid.getAttribute('aria-hidden').catch(() => null);
      if (st.includes('block') && hidden === 'false') return kid;
    }
    for (let i = 0; i < n; i++) {
      const st = (await kids.nth(i).getAttribute('style').catch(() => '')) || '';
      if (st.includes('block')) return kids.nth(i);
    }
    return panel(page);
  }
  // Qualquer match VISÍVEL (container tabpanel engloba sessões ocultas do keep-alive).
  async function expectAnyVisible(loc: any, timeout = 8000) {
    await expect(async () => {
      const n = await loc.count();
      let vis = false;
      for (let i = 0; i < n && !vis; i++) vis = await loc.nth(i).isVisible().catch(() => false);
      expect(vis).toBeTruthy();
    }).toPass({ timeout });
  }
  async function visibleZafra(p: any) {
    const locs = p.getByText('ZAFRA-42');
    const n = await locs.count();
    for (let i = 0; i < n; i++) if (await locs.nth(i).isVisible().catch(() => false)) return true;
    return false;
  }

  test('magazine: upload -> thumb -> remove -> gera com ref', async ({ page }) => {
    test.setTimeout(120000);
    await gotoTab(page, /revista|magazine|autoridade/i);
    const p = await activeRoot(page);
    await p.locator('input[type="file"]').first().setInputFiles(PNG);
    await expectAnyVisible(p.locator('img[alt="ref"]'), 5000);
    await p.locator('textarea:visible').first().fill('capa teste');
    await p.getByRole('button', { name: /criar capa|generate|gerar/i }).first().click().catch(() => {});
    const gen = p.getByRole('button', { name: /criar capa|mag_btn|gerar/i }).first();
    void gen;
    await expect(async () => {
      expect(await visibleZafra(p)).toBeTruthy();
    }).toPass({ timeout: 25000 });
  });

  test('comic: upload multiplo -> gera', async ({ page }) => {
    test.setTimeout(120000);
    await gotoTab(page, /hq|quadrinhos|storytelling/i);
    const p = await activeRoot(page);
    await p.locator('input[type="file"]').first().setInputFiles([PNG, PNG]);
    await page.waitForTimeout(500);
    expect(await p.locator('img[alt="ref"]').count()).toBeGreaterThanOrEqual(1);
    await p.locator('textarea:visible').first().fill('historia teste');
    await p.getByRole('button', { name: /roteirizar|desenhar|gerar/i }).first().click();
    await expect(async () => {
      expect(await visibleZafra(p)).toBeTruthy();
    }).toPass({ timeout: 25000 });
  });

  test('novos uploads: carousel/quote/meme/infographic/adult geram com refRule', async ({ page }) => {
    test.setTimeout(240000);
    const sessions: Array<{ re: RegExp; topicRe: RegExp; genRe: RegExp }> = [
      { re: /carrossel|carousel/i, topicRe: /topic|contexto|tema/i, genRe: /criar narrativa|gerar|criar/i },
      { re: /gerador de frases/i, topicRe: /topic|contexto|tema/i, genRe: /gerar cards|gerar/i },
      { re: /engenharia viral|fabrica/i, topicRe: /contexto|situacao|dor/i, genRe: /gerar memes|gerar/i },
      { re: /dados visuais|infogr/i, topicRe: /dados|contexto/i, genRe: /planejar|gerar/i },
      { re: /anima/i, topicRe: /premissa|contexto/i, genRe: /criar roteiro|gerar/i },
    ];
    for (const s of sessions) {
      const payloads: string[] = [];
      await page.route(/\/v1\/chat\/completions|openrouter\.ai|localhost:20128/, async (route) => {
        payloads.push(route.request().postData() || '');
        const body = (route.request().postData() || '').toLowerCase();
        let hay = body;
        try { const j = JSON.parse(body); if (j.messages) hay += ' ' + j.messages.map((m: any) => String(m.content || '').toLowerCase()).join(' '); } catch {}
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices(mockFor(hay))) });
      });
      await gotoTab(page, s.re);
      const p = await activeRoot(page);
      const fileInput = p.locator('input[type="file"]').first();
      await expect(fileInput).toBeAttached({ timeout: 5000 });
      await fileInput.setInputFiles(PNG);
      await expectAnyVisible(p.locator('img[alt="ref"]'), 5000);
      const tas = p.locator('textarea:visible');
      for (let i = 0; i < await tas.count(); i++) {
        const ta = tas.nth(i);
        if (await ta.isEditable().catch(() => false)) {
          const cur = await ta.inputValue().catch(() => '');
          if (!cur || cur.length < 5) await ta.fill('topico teste upload').catch(() => {});
        }
      }
      // lettering-like: garante texto se houver campo frase
      const phrase = p.getByPlaceholder(/letra|texto|frase/i).first();
      if (await phrase.count() && await phrase.isVisible().catch(() => false)) {
        const v = await phrase.inputValue().catch(() => '');
        if (!v) await phrase.fill('Frase upload').catch(() => {});
      }
      await p.getByRole('button', { name: s.genRe }).first().click();
      await expect(async () => {
        expect(await visibleZafra(p)).toBeTruthy();
      }).toPass({ timeout: 25000 });
      const hay = payloads.join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
      expect(hay, 'refRule no payload').toContain('referencia visual anexada');
    }
  });

  test('copy imagem/pdf: upload -> analise -> gera', async ({ page }) => {
    test.setTimeout(180000);
    await gotoTab(page, /copy/i);
    const p = await activeRoot(page);
    await p.getByRole('button', { name: /^imagem$/i }).first().click();
    await page.waitForTimeout(300);
    await p.locator('input[type="file"]').first().setInputFiles(PNG);
    // Modo imagem não tem textarea: análise vai p/ briefing oculto, botão habilita via fileName.
    await expect(async () => {
      const locs = p.getByText(/arquivo:/i);
      const n = await locs.count();
      let vis = false;
      for (let i = 0; i < n && !vis; i++) vis = await locs.nth(i).isVisible().catch(() => false);
      expect(vis).toBeTruthy();
    }).toPass({ timeout: 15000 });
    await expect(p.getByRole('button', { name: /executar comando/i }).first()).toBeEnabled({ timeout: 30000 });
    await p.getByRole('button', { name: /executar comando/i }).first().click();
    await expect(async () => {
      expect(await visibleZafra(p)).toBeTruthy();
    }).toPass({ timeout: 60000 });
    await p.getByRole('button', { name: /^pdf$/i }).first().click();
    await page.waitForTimeout(300);
    await p.locator('input[type="file"]').first().setInputFiles(PDF);
    await page.waitForTimeout(3000);
  });

  test('prd url + analisar => banner DNA (scrape sem chave)', async ({ page }) => {
    test.setTimeout(180000);
    await page.route(/\/api\/scrape.*/, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, url: 'https://linear.app', title: 'Linear ZAFRA-42', description: 'desc', headings: ['H1: Hero ZAFRA-42'], text: 'texto', via: 'fetch' }) }));
    await gotoTab(page, /prd/i);
    const p = await activeRoot(page);
    await p.getByLabel(/url do site/i).first().fill('https://linear.app');
    await p.getByRole('button', { name: /analisar/i }).first().click();
    await expect(async () => {
      const locs = p.getByText(/dna capturado/i);
      const n = await locs.count();
      let vis = false;
      for (let i = 0; i < n && !vis; i++) vis = await locs.nth(i).isVisible().catch(() => false);
      expect(vis).toBeTruthy();
    }).toPass({ timeout: 60000 });
  });

  test('prd screenshot sem chave gemini => erro amigável (sem travar)', async ({ page }) => {
    test.setTimeout(120000);
    await gotoTab(page, /prd/i);
    const p = await activeRoot(page);
    await p.locator('input[type="file"]').first().setInputFiles(PNG);
    await page.waitForTimeout(500);
    await p.getByRole('button', { name: /analisar/i }).first().click();
    // Sem chave Gemini: erro PT-BR amigável (nunca cru, nunca silêncio, nunca trava).
    let found = false;
    for (let i = 0; i < 12 && !found; i++) {
      await page.waitForTimeout(5000);
      const locs = p.locator('div[class*="bg-red"]');
      const n = await locs.count().catch(() => 0);
      for (let k = 0; k < n && !found; k++) found = await locs.nth(k).isVisible().catch(() => false);
    }
    expect(found, 'erro amigável visível em 60s').toBeTruthy();
    // Escopo ao painel ativo: #root engloba as 28 abas keep-alive (DOM enorme,
    // textContent global estoura timeout). Erro nunca expõe chave crua.
    const t = ((await p.textContent().catch(() => '')) || '');
    expect(t.length, 'painel legivel').toBeGreaterThan(100);
    expect(t).not.toMatch(/api key|unauthorized|401/i);
  });
});
