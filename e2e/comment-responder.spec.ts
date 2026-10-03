import { test, expect } from '@playwright/test';
import * as MF from './helpers/mockFactories';
import { clickSessionTab } from './helpers/sessionTabs';

// Sessão 51 — Responder Comentários (contrato de UI/parse, 0 quota):
// 1) fonte vazia => botão gerar bloqueado (Item 18 na camada de UI);
// 2) análise de imagem mockada vira fonte; trocar o tipo de fonte LIMPA a
//    análise antiga (review 2026-10-03: imagem analisada não pode virar "PDF");
// 3) PDF acima do teto => erro amigável em role=alert (nunca falha silenciosa);
// 4) geração mockada COMMENT_DIVIDER×2 + NOTA_DIVIDER => 2 abas de variação,
//    Nota isolada, sem divisor vazado no entregável e fonte no payload.

const CHAT = /\/v1\/chat\/completions|openrouter\.ai|localhost:20128/;
const FONTE = 'Como dobrar o engajamento respondendo comentário no LinkedIn — o autor do post citou o dado de7 satisfação';

// PNG 1×1 válido (buffer p/ setInputFiles) — passa pelo createImageBitmap do resizeImage.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const ANALISE_IMAGEM =
  'FATOS VISUAIS: print de post sobre atendimento com a frase "responda em até 1 hora".\n' +
  '|||NOTA_DIVIDER|||\n' +
  'NOTA DO ESTRATEGISTA: usar como prova social.';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('openrouter_api_key', 'e2e-mock-key-sem-quota');
      localStorage.setItem('primary_text_provider', 'openrouter');
      localStorage.setItem('primary_prompt_provider', 'openrouter');
    } catch {}
  });
  await page.route(/\/api\/research.*/, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [] }) })
  );
  page.on('pageerror', (e) => { throw new Error('PAGEERROR: ' + String(e).slice(0, 200)); });
});

async function openCommentResponder(page: any) {
  await page.goto('/');
  await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
  expect(await clickSessionTab(page, 'commentResponder')).toBe(true);
  await page.waitForTimeout(700);
  const kids = page.locator('[role="tabpanel"] > div');
  const n = await kids.count();
  for (let i = 0; i < n; i++) {
    const kid = kids.nth(i);
    const st = (await kid.getAttribute('style').catch(() => '')) || '';
    const hidden = await kid.getAttribute('aria-hidden').catch(() => null);
    if (st.includes('block') && hidden === 'false') return kid;
  }
  throw new Error('painel keep-alive visível não encontrado');
}

test('fonte vazia: botão gerar bloqueado + dica (Item 18)', async ({ page }) => {
  const p = await openCommentResponder(page);
  const gerar = p.getByRole('button', { name: /gerar respostas/i });
  await expect(gerar).toBeDisabled();
  await expect(p.getByText(/Cole a postagem\/comentário para liberar/i)).toBeVisible();
  // Sem upload (modo texto), a dica de arquivo não aparece
  await expect(p.getByText(/Envie o arquivo para liberar/i)).toHaveCount(0);
});

test('análise de imagem mockada vira fonte; trocar o tipo limpa a análise', async ({ page }) => {
  test.setTimeout(120000);
  await page.route(CHAT, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MF.toOpenAIChoices(ANALISE_IMAGEM)),
    })
  );
  const p = await openCommentResponder(page);
  await p.getByRole('button', { name: /^imagem$/i }).click();
  await p.locator('input[type="file"]').setInputFiles({ name: 'post.png', mimeType: 'image/png', buffer: PNG_1X1 });
  await expect(p.getByText(/post\.png analisado/i)).toBeVisible({ timeout: 30000 });
  // Só a Nota da análise foi cortada — os fatos viraram fonte
  await expect(p.getByRole('button', { name: /gerar respostas/i })).toBeEnabled();

  // Trocar p/ PDF: a análise da imagem não pode sobreviver como "fonte PDF"
  await p.getByRole('button', { name: /^pdf$/i }).click();
  await expect(p.getByText(/post\.png analisado/i)).toHaveCount(0);
  await expect(p.getByRole('button', { name: /gerar respostas/i })).toBeDisabled();
});

test('PDF acima do teto: erro amigável em role=alert (nunca falha silenciosa)', async ({ page }) => {
  const p = await openCommentResponder(page);
  await p.getByRole('button', { name: /^pdf$/i }).click();
  const grande = Buffer.alloc(3 * 1024 * 1024 + 1, 0x20); // > MAX_PDF_BYTES (3 MB)
  await p.locator('input[type="file"]').setInputFiles({
    name: 'post-grande.pdf',
    mimeType: 'application/pdf',
    buffer: grande,
  });
  await expect(p.getByRole('alert')).toContainText(/PDF muito grande/i, { timeout: 15000 });
  await expect(p.getByRole('button', { name: /gerar respostas/i })).toBeDisabled();
});

test('geração mockada: 2 variações + Nota isolada, sem divisor vazado', async ({ page }) => {
  test.setTimeout(120000);
  let payload = '';
  await page.route(CHAT, async (route) => {
    payload = route.request().postData() || '';
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MF.toOpenAIChoices(MF.mockComments(FONTE, 2))),
    });
  });
  const p = await openCommentResponder(page);
  await p.getByLabel(/Postagem \(texto, artigo ou trecho\)/i).first().fill(FONTE);
  await p.getByRole('button', { name: /gerar respostas/i }).click();

  await expect(p.getByRole('button', { name: /^variação 1$/i })).toBeVisible({ timeout: 45000 });
  await expect(p.getByRole('button', { name: /^variação 2$/i })).toBeVisible();
  await expect(p.getByText(/Nota do Estrategista/i).first()).toBeVisible();

  // Entregável sem divisor vazado; Nota fora do corpo da variação
  const txt = (await p.textContent()) || '';
  expect(txt).not.toContain('|||COMMENT_DIVIDER|||');
  expect(txt).not.toContain('|||NOTA_DIVIDER|||');

  // Aba 2 troca o corpo exibido
  await p.getByRole('button', { name: /^variação 2$/i }).click();
  await expect(p.getByText(/resposta 2 contextual/)).toBeVisible();

  // A fonte digitada chegou ao prompt (seletor→payload)
  expect(payload).toContain('Como dobrar o engajamento');
});
