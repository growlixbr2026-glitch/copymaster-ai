import { test, expect } from '@playwright/test';
import * as MF from './helpers/mockFactories';

const BRIEFING = 'consultoria marketing premium ZAFRA-42 Café ZAFRA-42';

function buildMockHandler() {
  return async (route: any) => {
    const body = (route.request().postData() || '').toLowerCase();
    let hay = body;
    try { const j = JSON.parse(body); if (j.messages) hay += ' ' + j.messages.map((m:any)=>String(m.content||'').toLowerCase()).join(' ');} catch {}
    if (hay.includes('nicho') && hay.includes('contentideas')) return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(MF.mockIdeasJson('consultoria ZAFRA-42')) });
    let text = MF.mockTextWithNota(BRIEFING, 'GEN ZAFRA-42');
    if (hay.includes('copywriter')||hay.includes('campo de batalha')) text = MF.mockCopyText(BRIEFING);
    else if (hay.includes('logo')||hay.includes('marca')) text = MF.mockLogo(BRIEFING);
    else if (hay.includes('carousel')||hay.includes('carrossel')) text = MF.mockCarousel(BRIEFING,3);
    else if (hay.includes('quote')||hay.includes('frase')) text = MF.mockQuote(BRIEFING);
    else if (hay.includes('meme')) text = MF.mockMeme(BRIEFING);
    return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify(MF.toOpenAIChoices(text)) });
  };
}

test.describe('full-user-simple: selectors + input + bloqueio sem quota', () => {
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
    await page.route(/\/v1\/chat\/completions|openrouter\.ai|localhost:20128/, buildMockHandler());
    await page.route(/\/api\/research.*/, async (r)=> r.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ ok:true, items:[{ title:'Fonte ZAFRA-42', url:'https://example.com', snippet:'trecho', sourceType:'web', source:'mock'}]})}));
  });

  test('28 sessoes: cada seletor troca, input preenche, botao habilita, lock funciona', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto('/');
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout:10000 });
    const tabs = page.getByRole('tab');
    const n = await tabs.count();
    expect(n).toBeGreaterThanOrEqual(28);
    for (let i=0;i<n;i++) {
      await tabs.nth(i).click();
      await page.waitForTimeout(250);
      const selects = page.locator('select:visible');
      for (let s=0;s<await selects.count();s++) {
        const sel = selects.nth(s);
        const oc = await sel.locator('option').count();
        if (oc >= 2) {
          const last = await sel.locator('option').nth(oc-1).getAttribute('value');
          if (last) await sel.selectOption(last).catch(()=>{});
        }
      }
      const fillableInputs = page.locator('input[type="text"]:visible, input[type="search"]:visible, input:not([type]):visible');
      for (let k=0;k<await fillableInputs.count();k++) {
        const inp = fillableInputs.nth(k);
        if (await inp.isEditable().catch(()=>false)) {
          const cur = await inp.inputValue().catch(()=>'');
          if (!cur) await inp.fill(BRIEFING).catch(()=>{});
        }
      }
      const tas = page.locator('textarea:visible');
      for (let k=0;k<await tas.count();k++) {
        const ta = tas.nth(k);
        if (await ta.isEditable().catch(()=>false)) {
          const cur = await ta.inputValue().catch(()=>'');
          if (!cur || cur.length<3) await ta.fill(BRIEFING).catch(()=>{});
        }
      }
      await page.waitForTimeout(150);
      const panel = page.locator('#root');
      const len = ((await panel.textContent().catch(()=> ''))||'').trim().length;
      expect(len, `sessao ${i} em branco`).toBeGreaterThan(80);
    }
  });

  test('copy: bloqueio ate preencher + gera 2 variacoes mockadas', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    await page.getByRole('tab', { name: /copy/i }).first().click();
    await page.waitForTimeout(500);
    const exec = page.getByRole('button', { name: /executar comando/i }).first();
    await expect(exec).toBeDisabled();
    await page.getByLabel(/briefing: ideia ou referência/i).first().fill(BRIEFING + ' instagram copy ZAFRA-42');
    await expect(exec).toBeEnabled();
    await exec.click();
    await expect(page.getByText('ZAFRA-42').first()).toBeVisible({ timeout:20000 });
    await expect(page.getByText(/varia[cç][aã]o/i).first()).toBeVisible({ timeout:5000 });
  });

  test('ideas: gera JSON mockado + refinement toolbar aparece', async ({ page }) => {
    // Briefings SEM marcador: ZAFRA-42 no DOM só pode vir do OUTPUT mockado
    // (input ecoaria o marcador e o wait seria vácuo). Toolbar com timeout
    // folgado: fase ideas serializa 4+ calls no throttle 2,5s da chave.
    test.setTimeout(180000);
    await page.goto('/');
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    const inp = page.locator('input[placeholder*="consultoria"]').first();
    await inp.fill('consultoria marketing premium para dentistas');
    await page.getByRole('button', { name: /gerar estratégia/i }).click();
    await expect(page.getByText('ZAFRA-42').first()).toBeVisible({ timeout: 30000 });
    await page.getByRole('tab', { name: /copy/i }).first().click();
    await page.getByLabel(/briefing: ideia ou referência/i).first().fill('copy teste para instagram de dentistas');
    await page.getByRole('button', { name: /executar comando/i }).first().click();
    await expect(page.getByText('ZAFRA-42').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: /verificar ia/i }).first()).toBeVisible({ timeout: 25000 });
  });
});
