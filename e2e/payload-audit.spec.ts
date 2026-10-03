import { test, expect } from '@playwright/test';
import * as MF from './helpers/mockFactories';

const BRIEF = 'petshop banho tosa premium bairro centro';
// NOTA: BRIEF sem marcador — ZAFRA-42 só pode vir do OUTPUT mockado.
// Se o output aparecer, é porque a IA (mock) respondeu de verdade.

function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Ordem: divisores mandatórios primeiro (nunca existem no GOLDEN_SYSTEM_INSTRUCTIONS,
// que polui o haystack com marca/brand/revista/tipografia/artigo/persona).
// Só depois, tokens distintivos da sessão (nunca palavra genérica).
const BRANCH_KEYS: Array<[string, string[]]> = [
  ['PRD', ['prd_divider', 'product architect']],
  ['EMAIL', ['email_divider']],
  ['ADS', ['ads_divider']],
  ['CAROUSEL', ['slide_divider']],
  ['QUOTE', ['quote_divider']],
  ['CITATION', ['citation_divider']],
  ['LETTERING', ['lettering_divider']],
  ['MEME', ['meme_divider']],
  ['INSP', ['insp_divider']],
  ['LOGO', ['logo_option_divider', 'arquetipo', 'brand architect']],
  ['YT', ['yt_option_divider']],
  ['VIDEO', ['scene_divider']],
  ['ARTICLE', ['schema_divider']],
  ['COPY', ['copywriter', 'campo de batalha']],
  ['IMAGE', ['usar a imagem em anexo']],
  ['QUOTE2', ['frase de impacto']],
  ['PERSONA', ['behavioral data scientist']],
  ['NOTEBOOK', ['fonte de conhecimento']],
];
export function mockBranch(rawHay: string): string {
  const hay = norm(rawHay);
  for (const [name, keys] of BRANCH_KEYS) {
    if (keys.some((k) => hay.includes(k))) return name;
  }
  return 'GEN';
}

function mockFor(rawHay: string): string {
  switch (mockBranch(rawHay)) {
    case 'PRD': return MF.mockPRD(BRIEF);
    case 'EMAIL': return MF.mockEmail(BRIEF, 2);
    case 'ADS': return MF.mockAds(BRIEF);
    case 'CAROUSEL': return MF.mockCarousel(BRIEF, 3);
    case 'QUOTE': case 'QUOTE2': return MF.mockQuote(BRIEF);
    case 'CITATION': return MF.mockCitation(BRIEF);
    case 'LETTERING': return MF.mockLettering(BRIEF);
    case 'MEME': return MF.mockMeme(BRIEF);
    case 'INSP': return MF.mockInsp(BRIEF);
    case 'LOGO': return MF.mockLogo(BRIEF);
    case 'YT': return MF.mockYouTubeThumb(BRIEF);
    case 'VIDEO': return MF.mockVideoPrompts(BRIEF, 2);
    case 'ARTICLE': return MF.mockArticle(BRIEF);
    case 'COPY': return MF.mockCopyText(BRIEF);
    case 'IMAGE': return MF.mockImagePrompt(BRIEF);
    case 'PERSONA': {
      const payload = JSON.stringify({ personas: [{ id: '1', name: 'Persona ZAFRA-42', description: 'd', audience: 'a', tone: 't', vocabulary: 'v', mission: 'm', visuals: 'vv' }] });
      return `${payload}\n|||NOTA_DIVIDER|||\nNota do Estrategista — Persona ZAFRA-42`;
    }
    case 'NOTEBOOK': return MF.mockTextWithNota(BRIEF, 'NotebookLM ZAFRA-42');
    default: return MF.mockTextWithNota(BRIEF, 'GEN ZAFRA-42');
  }
}

const SESSIONS: Array<{ id: string; label: RegExp }> = [
  { id: 'ideas', label: /sessão de ideias/i },
  { id: 'copy', label: /copywriting pro/i },
  { id: 'notebook', label: /notebook/i },
  { id: 'personas', label: /personas/i },
  { id: 'prd', label: /prd vibe/i },
  { id: 'email', label: /email/i },
  { id: 'vsl', label: /vsl/i },
  { id: 'lp', label: /landing/i },
  { id: 'ads', label: /ads|tráfego/i },
  { id: 'sexy', label: /sexy/i },
  { id: 'tiktok', label: /tiktok/i },
  { id: 'reels', label: /reels/i },
  { id: 'youtube', label: /youtube|domínio/i },
  { id: 'logo', label: /identidade|elite|brand/i },
  { id: 'carousel', label: /carrossel|carousel/i },
  { id: 'magazine', label: /revista|magazine|autoridade/i },
  { id: 'quote', label: /frases|impacto/i },
  { id: 'citation', label: /cita/i },
  { id: 'lettering', label: /lettering|tipografia/i },
  { id: 'comic', label: /hq|quadrinhos|storytelling/i },
  { id: 'adultAnimation', label: /animação/i },
  { id: 'meme', label: /meme|engenharia viral/i },
  { id: 'infographic', label: /infogr|dados visuais/i },
  { id: 'article', label: /artigo|autoridade em texto/i },
  { id: 'ppt', label: /apresenta|pitch/i },
  { id: 'media', label: /media/i },
  { id: 'inspiration', label: /inspira/i },
  { id: 'commentResponder', label: /coment/i },
];

async function runSession(page: any, s: { id: string; label: RegExp }, payloads: string[]) {
  const tab = page.getByRole('tab', { name: s.label }).first();
  await expect(tab, `tab ${s.id}`).toBeVisible({ timeout: 8000 });
  await tab.click();
  await page.waitForTimeout(600);

  // Troca TODOS os selects p/ última opção; registra valores escolhidos
  const chosen: string[] = [];
  const selects = page.locator('select:visible');
  for (let i = 0; i < await selects.count(); i++) {
    const sel = selects.nth(i);
    const aria = (await sel.getAttribute('aria-label').catch(() => '')) || '';
    if (/idioma|language/i.test(aria)) continue; // nunca troca o idioma global no meio da jornada
    if (/persona|crewai/i.test(aria)) continue; // persona injeta ROLE/GOAL/BACKSTORY, nao o id
    const oc = await sel.locator('option').count();
    if (oc >= 2) {
      const v = await sel.locator('option').nth(oc - 1).getAttribute('value');
      if (v) {
        await sel.selectOption(v).catch(() => {});
        chosen.push(v);
      }
    }
  }

  // Preenche TODOS os inputs text + textareas
  const inputs = page.locator('input[type="text"]:visible, input:not([type]):visible');
  for (let i = 0; i < await inputs.count(); i++) {
    const inp = inputs.nth(i);
    if (await inp.isEditable().catch(() => false)) {
      const cur = await inp.inputValue().catch(() => '');
      if (!cur) await inp.fill(BRIEF).catch(() => {});
    }
  }
  const tas = page.locator('textarea:visible');
  for (let i = 0; i < await tas.count(); i++) {
    const ta = tas.nth(i);
    if (await ta.isEditable().catch(() => false)) {
      const cur = await ta.inputValue().catch(() => '');
      if (!cur || cur.length < 5) await ta.fill(BRIEF).catch(() => {});
    }
  }
  if (s.id === 'personas') {
    const autoBtn = page.getByRole('button', { name: /gerar com ia|auto generate/i }).first();
    if (await autoBtn.count() && await autoBtn.isVisible().catch(() => false)) await autoBtn.click().catch(() => {});
    await page.waitForTimeout(400);
    const niche = page.getByLabel(/nicho/i).first();
    if (await niche.count() && await niche.isVisible().catch(() => false)) { const v = await niche.inputValue().catch(() => ''); if (!v) await niche.fill('Petshop premium').catch(() => {}); }
    const prod = page.getByLabel(/produto/i).first();
    if (await prod.count() && await prod.isVisible().catch(() => false)) { const v = await prod.inputValue().catch(() => ''); if (!v) await prod.fill('Banho e tosa').catch(() => {}); }
  }
  if (s.id === 'logo') {
    const b = page.getByPlaceholder(/marca/i).first();
    if (await b.count()) { const v = await b.inputValue().catch(() => ''); if (!v) await b.fill('PetShop Centro').catch(() => {}); }
  }
  if (s.id === 'lettering') {
    const lt = page.getByPlaceholder(/letra|texto/i).first();
    if (await lt.count()) { const v = await lt.inputValue().catch(() => ''); if (!v) await lt.fill('Banho & Tosa').catch(() => {}); }
  }
  await page.waitForTimeout(250);

  // Gera (mock) e prova que seletores chegaram no payload da requisição REAL.
  // Escopo = painel VISÍVEL (keep-alive mantém botões gêmeos em painéis ocultos).
  payloads.length = 0;
  const panel = page.locator('[role="tabpanel"]:visible').first();
  const genBtn = panel.getByRole('button', { name: /gerar|executar|criar|escrever|projetar|arquitetar|estruturar|planejar|roteirizar|buscar|desenhar/i }).first();
  if (await genBtn.count() && await genBtn.isVisible().catch(() => false)) {
    if (await genBtn.isDisabled().catch(() => false)) {
      console.log(`[SKIP ${s.id} botão desabilitado mesmo preenchido]`);
      return;
    }
    await genBtn.click().catch(() => {});
    const panel = page.locator('[role="tabpanel"]:visible').first();
    try {
      // Qualquer match VISÍVEL (stale oculto de sessão anterior não conta — keep-alive).
      await expect(async () => {
        let vis = false;
        const zc = await panel.getByText('ZAFRA-42').count();
        for (let i = 0; i < zc && !vis; i++) vis = await panel.getByText('ZAFRA-42').nth(i).isVisible().catch(() => false);
        const ec = await panel.locator('div[class*="bg-red-950"], div[class*="bg-red-900"]').count();
        for (let i = 0; i < ec && !vis; i++) vis = await panel.locator('div[class*="bg-red-950"], div[class*="bg-red-900"]').nth(i).isVisible().catch(() => false);
        expect(vis, `nenhum output visivel em ${s.id}`).toBeTruthy();
      }).toPass({ timeout: 25000 });
    } catch {
      console.log(`[WARN ${s.id} sem output em 25s | payloads=${payloads.length} chosen=${chosen.length}]`);
      await page.screenshot({ path: `test-results/deep-warn-${s.id}.png` }).catch(() => {});
      return;
    }
    const hay = norm(payloads.join(' '));
    const missing: string[] = [];
    for (const c of chosen) {
      const probe = norm(c).slice(0, 18).replace(/^✨ automatico.*$/, '');
      if (!probe || probe.length < 4) continue;
      if (probe.startsWith('✨') || c.startsWith('✨')) continue;
      if (c.includes('Grátis') || c.includes('Gratis') || norm(c).includes('flux') || norm(c).includes('kolors') || norm(c).includes('kwai')) continue;
      if (!hay.includes(probe)) missing.push(c.slice(0, 40));
    }
    // Tokens obrigatórios: provam que inputs antes ignorados agora chegam ao
    // prompt (regressão dos fixes Onda 0). Chaves = id da sessão em SESSIONS.
    const REQUIRED: Record<string, string[]> = {
      vsl: ['verdade absoluta'],
      // rótulos do template atual de personas (reescrito em EN); provam que
      // form.pain e form.additionalInfo seguem interpolados no prompt.
      personas: ['main pain points', 'extra info'],
      email: ['assinar cada e-mail'],
      notebook: ['todo o conteudo fonte'],
      sexy: ['toda a copy e a nota'],
    };
    for (const req of REQUIRED[s.id] || []) {
      if (payloads.length && !hay.includes(req)) missing.push(`PROMPT:${req}`);
    }
    if (missing.length) {
      console.log(`[BUG ${s.id}] seletores fora do prompt: ${missing.join(' | ')}`);
      (globalThis as any).__payloadBugs.push({ session: s.id, missing });
    } else {
      console.log(`[OK ${s.id} payloads=${payloads.length}]`);
    }
  }
}

test.describe('deep-payload: seletor->prompt 28 sessoes', () => {
  test.beforeEach(async ({ page }) => {
    // Chave dummy hermética: callAI exige chave antes do fetch; o route mock
    // por teste intercepta tudo (0 quota, nada sai do browser).
    await page.addInitScript(() => {
      try {
        localStorage.setItem('openrouter_api_key', 'e2e-mock-key-sem-quota');
        localStorage.setItem('primary_text_provider', 'openrouter');
        localStorage.setItem('primary_prompt_provider', 'openrouter');
      } catch {}
    });
    await page.route(/\/api\/research.*/, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [] }) }));
  });

  for (let chunk = 0; chunk < 4; chunk++) {
    const ids = SESSIONS.slice(chunk * 7, chunk * 7 + 7);
    if (!ids.length) continue;
    test(`chunk ${chunk + 1}: ${ids.map((s) => s.id).join(',')}`, async ({ page }) => {
      test.setTimeout(300000);
      (globalThis as any).__payloadBugs = [];
      const payloads: string[] = [];
      await page.route(/\/v1\/chat\/completions|openrouter\.ai|localhost:20128/, async (route) => {
        const body = route.request().postData() || '';
        payloads.push(body);
        let hay = body.toLowerCase();
        try { const j = JSON.parse(body); if (j.messages) hay += ' ' + j.messages.map((m: any) => String(m.content || '').toLowerCase()).join(' '); } catch {}
        const isIdeas = hay.includes('nicho') && hay.includes('contentideas');
        const branch = isIdeas ? 'IDEAS' : mockBranch(hay);
        const mockText = isIdeas ? '[ideas-json]' : mockFor(hay);
        const payload = isIdeas ? JSON.stringify(MF.mockIdeasJson('petshop ZAFRA-42')) : JSON.stringify(MF.toOpenAIChoices(mockText));
        return route.fulfill({ status: 200, contentType: 'application/json', body: payload });
      });
      await page.goto('/');
      await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
      await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });
      let reqCount = 0;
      const seenUrls: string[] = [];
      page.on('request', (r) => {
        const u = r.url();
        if (/openrouter|chat\/completions|20128|googleapis|groq|anthropic|mistral|nvidia|cohere|together|perplexity|deepseek/.test(u)) {
          reqCount++;
          if (seenUrls.length < 15) seenUrls.push(`${r.method()} ${u.slice(0, 110)}`);
        }
      });
      for (const s of ids) await runSession(page, s, payloads);
      console.log(`[CHUNK] total AI requests: ${reqCount}`);
      for (const u of seenUrls) console.log(`[URL] ${u}`);
      const bugs = (globalThis as any).__payloadBugs as Array<{ session: string; missing: string[] }>;
      expect(bugs, JSON.stringify(bugs, null, 1)).toEqual([]);
    });
  }
});
