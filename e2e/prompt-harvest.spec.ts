import { test, expect } from '@playwright/test';
import * as MF from './helpers/mockFactories';
import fs from 'fs';
import path from 'path';

// HARVEST: captura o payload REAL (prompt) de cada sessão/modo e salva em
// e2e-evidence/prompts/<id>[.modo].json para julgamento de mérito com LLM real.
// Não espera output (fulfill mock instantâneo) — rápido, 0 quota.
const OUT = 'e2e-evidence/prompts';
const BRIEF = 'cafeteria artesanal no centro, ticket medio 18 reais';
const PNG = 'e2e/fixtures/tiny.png';

function norm(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const SESSIONS: Array<{ id: string; label: RegExp; modes?: RegExp[]; mediaTabs?: boolean }> = [
  { id: 'ideas', label: /sessão de ideias/i },
  { id: 'copy', label: /copywriting pro/i },
  { id: 'notebook', label: /notebook/i, modes: [/resumo em áudio/i, /mapa mental/i] },
  { id: 'personas', label: /personas/i },
  { id: 'prd', label: /prd vibe/i },
  { id: 'email', label: /email/i },
  { id: 'vsl', label: /vsl/i },
  { id: 'lp', label: /landing/i, modes: [/wireframe/i, /vibe coding|tech/i] },
  { id: 'ads', label: /ads|tráfego/i },
  { id: 'sexy', label: /sexy/i },
  { id: 'tiktok', label: /tiktok/i, modes: [/roteiro viral/i, /venda direta/i, /# seo/i, /^capa$/i] },
  { id: 'reels', label: /reels/i, modes: [/roteiro viral/i, /^venda$/i, /legenda seo/i, /capa feed/i] },
  { id: 'youtube', label: /youtube|domínio/i, modes: [/roteiro de retenção/i, /rankeamento/i, /thumbnail clickbait/i] },
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
  { id: 'media', label: /media/i, mediaTabs: true },
  { id: 'inspiration', label: /inspira/i },
];

async function fillAll(page: any, s: { id: string }) {
  const panel = page.locator('[role="tabpanel"]:visible').first();
  const selects = panel.locator('select:visible');
  for (let i = 0; i < await selects.count(); i++) {
    const sel = selects.nth(i);
    const aria = (await sel.getAttribute('aria-label').catch(() => '')) || '';
    if (/idioma|language/i.test(aria)) continue;
    const oc = await sel.locator('option').count();
    if (oc >= 2) {
      const v = await sel.locator('option').nth(oc - 1).getAttribute('value');
      if (v) await sel.selectOption(v).catch(() => {});
    }
  }
  const inputs = panel.locator('input[type="text"]:visible, input:not([type]):visible');
  for (let i = 0; i < await inputs.count(); i++) {
    const inp = inputs.nth(i);
    if (await inp.isEditable().catch(() => false)) {
      const cur = await inp.inputValue().catch(() => '');
      if (!cur) await inp.fill(BRIEF).catch(() => {});
    }
  }
  const tas = panel.locator('textarea:visible');
  for (let i = 0; i < await tas.count(); i++) {
    const ta = tas.nth(i);
    if (await ta.isEditable().catch(() => false)) {
      const cur = await ta.inputValue().catch(() => '');
      if (!cur || cur.length < 5) await ta.fill(BRIEF).catch(() => {});
    }
  }
  if (s.id === 'personas') {
    const autoBtn = panel.getByRole('button', { name: /gerar com ia|auto generate|auto/i }).first();
    if (await autoBtn.count() && await autoBtn.isVisible().catch(() => false)) await autoBtn.click().catch(() => {});
    await page.waitForTimeout(400);
    const niche = panel.getByLabel(/nicho/i).first();
    if (await niche.count() && await niche.isVisible().catch(() => false)) await niche.fill('Cafeteria').catch(() => {});
    const prod = panel.getByLabel(/produto/i).first();
    if (await prod.count() && await prod.isVisible().catch(() => false)) await prod.fill('Cafe especial').catch(() => {});
  }
  if (s.id === 'logo') {
    const b = panel.getByPlaceholder(/marca/i).first();
    if (await b.count()) await b.fill('Cafe Centro').catch(() => {});
  }
  if (s.id === 'lettering') {
    const lt = panel.getByPlaceholder(/letra|texto/i).first();
    if (await lt.count()) await lt.fill('Cafe & Pao').catch(() => {});
  }
  // Upload p/ capturar refRule/images no prompt (onde houver input file).
  const fi = panel.locator('input[type="file"]').first();
  if (await fi.count()) {
    try { await fi.setInputFiles(PNG, { timeout: 5000 }); } catch {}
    await page.waitForTimeout(600);
  }
}

async function clickGenerate(page: any): Promise<boolean> {
  const panel = page.locator('[role="tabpanel"]:visible').first();
  const genBtn = panel.getByRole('button', { name: /gerar|executar|criar|escrever|projetar|arquitetar|estruturar|planejar|roteirizar|buscar|desenhar/i }).first();
  if (await genBtn.count() && await genBtn.isVisible().catch(() => false)) {
    if (await genBtn.isDisabled().catch(() => true)) return false;
    await genBtn.click().catch(() => {});
    return true;
  }
  return false;
}

async function waitPayload(payloads: string[], timeout = 20000): Promise<boolean> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (payloads.length > 0) return true;
    await new Promise((r) => setTimeout(r, 300));
  }
  return payloads.length > 0;
}

function save(id: string, payloads: string[]) {
  fs.mkdirSync(OUT, { recursive: true });
  const bodies = payloads.map((b) => {
    try {
      const j = JSON.parse(b);
      const msgs = (j.messages || []).map((m: any) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content).slice(0, 500),
      }));
      return { url: 'openai-compatible', model: j.model, system: typeof j.system === 'string' ? j.system : undefined, messages: msgs };
    } catch {
      return { url: 'unparsed', body: b.slice(0, 2000) };
    }
  });
  fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify(bodies, null, 1));
  console.log(`[HARVEST ${id} payloads=${payloads.length}]`);
}

test.describe('harvest: captura prompts reais 28 sessoes', () => {
  test.beforeEach(async ({ page }) => {
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
      const payloads: string[] = [];
      let lastAi = 0;
      await page.route(/\/v1\/chat\/completions|openrouter\.ai|localhost:20128/, async (route) => {
        lastAi = Date.now();
        payloads.push(route.request().postData() || '');
        const body = (route.request().postData() || '').toLowerCase();
        let hay = body;
        try { const j = JSON.parse(body); if (j.messages) hay += ' ' + j.messages.map((m: any) => String(m.content || '').toLowerCase()).join(' '); } catch {}
        const isIdeas = hay.includes('nicho') && hay.includes('contentideas');
        // Mock com o BRIEF embutido: herança roteiro→seo/cover fica coerente
        // (nunca o placeholder "harvest ok" como fonte).
        const payload = isIdeas
          ? JSON.stringify(MF.mockIdeasJson('harvest'))
          : JSON.stringify(MF.toOpenAIChoices(`${BRIEF} roteiro base coerente ZAFRA-42\n|||NOTA_DIVIDER|||\nNota harvest`));
        return route.fulfill({ status: 200, contentType: 'application/json', body: payload });
      });
      await page.goto('/');
      await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
      await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });

      for (const s of ids) {
        const tab = page.getByRole('tab', { name: s.label }).first();
        await expect(tab, `tab ${s.id}`).toBeVisible({ timeout: 8000 });
        // Quiescência: 2ªs chamadas tardias (nota rica, verify, sections) da
        // sessão anterior não podem vazar para a captura desta.
        const qt0 = Date.now();
        while (Date.now() - lastAi < 3000 && Date.now() - qt0 < 30000) await new Promise((r) => setTimeout(r, 500));
        await tab.click();
        await page.waitForTimeout(600);
        await fillAll(page, s);
        await page.waitForTimeout(250);

        const modePasses: Array<{ suffix: string; click?: RegExp; mediaIdx?: number }> = [{ suffix: '' }];
        if (s.modes) s.modes.forEach((m, i) => { if (i > 0) modePasses.push({ suffix: `.m${i}`, click: m }); });
        if (s.mediaTabs) {
          modePasses.length = 0;
          for (let i = 0; i < 4; i++) modePasses.push({ suffix: i === 0 ? '' : `.m${i}`, mediaIdx: i });
        }
        // Primeiro passo usa o modo default (ou card 0); demais clicam o modo.
        if (s.modes) {
          // garante passo do modo 0 também com sufixo
          modePasses.unshift({ suffix: '.m0', click: s.modes[0] });
          // remove o passo default duplicado
          modePasses.splice(1, 1);
        }

        for (const mp of modePasses) {
          const panel = page.locator('[role="tabpanel"]:visible').first();
          if (mp.mediaIdx !== undefined && mp.mediaIdx > 0) {
            const btn = panel.locator('div.lg\\:col-span-3 > button').nth(mp.mediaIdx);
            if (await btn.count() && await btn.isVisible().catch(() => false)) await btn.click().catch(() => {});
            await page.waitForTimeout(500);
            await fillAll(page, s);
          } else if (mp.click) {
            const mb = panel.getByRole('button', { name: mp.click }).first();
            if (await mb.count() && await mb.isVisible().catch(() => false)) await mb.click().catch(() => {});
            await page.waitForTimeout(500);
            await fillAll(page, s);
          }
          payloads.length = 0;
          const ok = await clickGenerate(page);
          if (!ok) { console.log(`[SKIP ${s.id}${mp.suffix} sem botao gerar]`); continue; }
          const got = await waitPayload(payloads, 25000);
          if (!got) { console.log(`[WARN ${s.id}${mp.suffix} sem payload]`); continue; }
          if (s.id === 'ideas') {
            // 4 seções em paralelo, serializadas no throttle 2,5s/chave — espera todas.
            const t0 = Date.now();
            while (payloads.length < 4 && Date.now() - t0 < 25000) await new Promise((r) => setTimeout(r, 500));
            console.log(`[HARVEST ideas secoes=${payloads.length}]`);
          }
          // Quiescência pós-captura: 2ªs chamadas (nota rica/verify) resolvem
          // aqui, não na próxima sessão.
          const pt0 = Date.now();
          while (Date.now() - lastAi < 3000 && Date.now() - pt0 < 30000) await new Promise((r) => setTimeout(r, 500));
          await page.waitForTimeout(400);
          save(`${s.id}${mp.suffix}`, [...payloads]);
        }
      }
    });
  }
});
