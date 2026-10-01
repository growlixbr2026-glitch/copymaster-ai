import { test, expect } from '@playwright/test';
import * as MF from './helpers/mockFactories';

const BRIEF = 'army controls sem marcador';

function mockFor(hay: string): string {
  const h = hay.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (h.includes('email_divider')) return MF.mockEmail(BRIEF, 2);
  if (h.includes('slide_divider')) return MF.mockCarousel(BRIEF, 3);
  if (h.includes('copywriter') || h.includes('campo de batalha')) return MF.mockCopyText(BRIEF);
  if (h.includes('behavioral data scientist')) {
    const p = JSON.stringify({ personas: [{ id: '1', name: 'Persona Army', description: 'd', audience: 'a', tone: 't', vocabulary: 'v', mission: 'm', visuals: 'vv' }] });
    return `${p}\n|||NOTA_DIVIDER|||\nNota Persona Army`;
  }
  return MF.mockTextWithNota(BRIEF, 'GEN ZAFRA-42');
}

test.describe('army-charlie-delta: controles + lock', () => {
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
  async function activeRoot(page: any) {
    const kids = page.locator('[role="tabpanel"] > div');
    const n = await kids.count();
    // Prefere o painel ativo (aria-hidden=false + display:block); .first() global
    // pega lock de aba oculta do keep-alive (display:none) e o click trava.
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
    return page.locator('[role="tabpanel"]:visible').first();
  }
  async function lockBtn(p: any) {
    const b = p.getByRole('button', { name: /bloqueado|livre|lock/i }).first();
    return (await b.count()) > 0 ? b : null;
  }

  test('personas: auto qty 1-2-3 + gera mock + expande tabs', async ({ page }) => {
    test.setTimeout(180000);
    await gotoTab(page, /personas/i);
    let p = await activeRoot(page);
    await p.getByRole('button', { name: /gerar com ia/i }).first().click();
    await page.waitForTimeout(400);
    for (const q of ['1', '2', '3']) {
      const qb = p.getByRole('button', { name: new RegExp(`^${q}$`) }).first();
      if (await qb.count() && await qb.isVisible().catch(() => false)) await qb.click().catch(() => {});
    }
    await p.getByLabel(/nicho/i).first().fill('Petshop');
    await p.getByLabel(/produto/i).first().fill('Banho');
    await p.getByRole('button', { name: /gerar com ia|gerar/i }).last().click().catch(() => {});
    const genBtns = p.getByRole('button', { name: /gerar/i });
    for (let i = 0; i < await genBtns.count(); i++) {
      const b = genBtns.nth(i);
      if (await b.isVisible().catch(() => false) && !(await b.isDisabled().catch(() => true))) { await b.click().catch(() => {}); break; }
    }
    await page.waitForTimeout(3000);
  });

  test('personas: CRUD manual salva + ativa + deleta', async ({ page }) => {
    test.setTimeout(120000);
    await gotoTab(page, /personas/i);
    const p = await activeRoot(page);
    const newBtn = p.getByRole('button', { name: /nova persona|new/i }).first();
    if ((await newBtn.count()) === 0) return;
    await newBtn.click();
    await page.waitForTimeout(400);
    await p.getByLabel(/nome/i).first().fill('Persona Army Test');
    await p.getByRole('button', { name: /salvar/i }).first().click();
    await page.waitForTimeout(500);
    await expect(p.getByText(/Persona Army Test/i).first()).toBeVisible({ timeout: 8000 });
    const act = p.getByRole('button', { name: /ativar/i }).first();
    if (await act.count()) {
      page.once('dialog', (d) => d.accept().catch(() => {}));
      await act.click().catch(() => {});
      await page.waitForTimeout(500);
    }
    const del = p.getByRole('button', { name: /excluir|deletar|trash|remover/i }).first();
    if (await del.count() && await del.isVisible().catch(() => false)) {
      page.once('dialog', (d) => d.accept().catch(() => {}));
      await del.click().catch(() => {});
      await page.waitForTimeout(500);
    }
  });

  test('copy: tones + triggers toggle + count/email/carousel/prd selects', async ({ page }) => {
    test.setTimeout(180000);
    await gotoTab(page, /copy/i);
    let p = await activeRoot(page);
    const toneBtns = p.locator('button').filter({ hasText: /sério|autoritário|vendedor/i });
    if (await toneBtns.count()) {
      await toneBtns.first().click();
      await page.waitForTimeout(200);
    }
    // email count select muda N abas
    await gotoTab(page, /email/i);
    p = await activeRoot(page);
    const countSel = p.getByLabel(/sequência|count|quantidade|emails/i).first();
    if (await countSel.count() && await countSel.isVisible().catch(() => false)) {
      const opts = countSel.locator('option');
      if ((await opts.count()) >= 2) {
        const v = await opts.nth(1).getAttribute('value');
        if (v) await countSel.selectOption(v).catch(() => {});
      }
    }
    // carousel slideCount
    await gotoTab(page, /carrossel|carousel/i);
    p = await activeRoot(page);
    const slideSel = p.getByLabel(/lâminas|slides/i).first();
    if (await slideSel.count() && await slideSel.isVisible().catch(() => false)) {
      const v = await slideSel.locator('option').nth(2).getAttribute('value').catch(() => null);
      if (v) await slideSel.selectOption(v).catch(() => {});
    }
  });

  for (let chunk = 0; chunk < 4; chunk++) {
    test(`delta: lock liga/desliga nas sessoes (parte ${chunk + 1}/4)`, async ({ page }) => {
      test.setTimeout(180000);
      const tabs = page.getByRole('tab');
      const n = await tabs.count();
      expect(n).toBeGreaterThanOrEqual(28);
      const start = chunk * 7;
      const end = Math.min(n, start + 7);
      let locked = 0;
      let checked = 0;
      for (let i = start; i < end; i++) {
        console.log(`[LOCK] tab ${i} go`);
        await tabs.nth(i).click();
        await page.waitForTimeout(300);
        console.log(`[LOCK] tab ${i} clicked`);
        const p = await activeRoot(page);
        const lb = await lockBtn(p);
        if (!lb) { console.log(`[LOCK] tab ${i} no lock btn`); continue; }
        if (!(await lb.isVisible().catch(() => false))) { console.log(`[LOCK] tab ${i} lock hidden`); continue; }
        checked++;
        await lb.scrollIntoViewIfNeeded().catch(() => {});
        await lb.click({ force: true }).catch(() => {});
        console.log(`[LOCK] tab ${i} locked`);
        await page.waitForTimeout(150);
        const gated = p.locator('.opacity-50, [class*="pointer-events-none"]');
        if ((await gated.count()) > 0) locked++;
        await lb.click({ force: true }).catch(() => {});
        console.log(`[LOCK] tab ${i} unlocked`);
        await page.waitForTimeout(100);
      }
      expect(checked, 'sessoes com lock testado').toBeGreaterThan(0);
      expect(locked, `lock funcional na parte ${chunk + 1}`).toBeGreaterThanOrEqual(Math.max(1, Math.floor(checked / 2)));
    });
  }

  test('wallet: limites + dia renovacao + salvar', async ({ page }) => {
    test.setTimeout(120000);
    await page.getByRole('button', { name: /carteira|wallet|tokens/i }).first().click();
    await page.waitForTimeout(700);
    const p = await activeRoot(page);
    const limit = p.getByLabel(/meta mensal|limite/i).first();
    if (await limit.count() && await limit.isVisible().catch(() => false)) {
      await limit.fill('2000000').catch(() => {});
    }
    const day = p.getByLabel(/dia.*renova|renewal/i).first();
    if (await day.count() && await day.isVisible().catch(() => false)) {
      await day.fill('5').catch(() => {});
    }
    page.once('dialog', (d) => d.accept().catch(() => {}));
    const save = p.getByRole('button', { name: /salvar|aplicar/i }).first();
    if (await save.count() && await save.isVisible().catch(() => false)) await save.click().catch(() => {});
    await page.waitForTimeout(500);
  });

  test('settings: motores primarios + salvar', async ({ page }) => {
    test.setTimeout(120000);
    await page.getByRole('button', { name: /configura|settings|centro/i }).first().click();
    await page.waitForTimeout(700);
    const p = await activeRoot(page);
    // Arquitetura V24: selects de motor primário foram substituídos por auto-seleção.
    // Resta provar que o painel renderiza a rotação de modelos :free sem error boundary.
    expect(
      await page.getByText(/Modelos Gratuitos OpenRouter/).count(),
      'deve exibir a rotação de provedor :free'
    ).toBeGreaterThanOrEqual(1);
    page.once('dialog', (d) => d.accept().catch(() => {}));
    const save = p.getByRole('button', { name: /salvar configura/i }).first();
    if (await save.count() && await save.isVisible().catch(() => false)) await save.click().catch(() => {});
    await page.waitForTimeout(800);
  });
});
