import { test, expect } from '@playwright/test';

function rep(tag: string, text: string) {
  const lines = text.split('\n');
  console.log(
    `[MX:${tag}] LEN:${text.length} STAR:${text.includes('*')} ` +
    `DASH:${lines.filter((l) => /^\s*[-—•>+] /.test(l)).length} DIV:${/\|{2,}|DIVIDER|NOTA DO ESTRATEGISTA/i.test(text)} ` +
    `PT:${(text.match(/(\sde\s|\spara\s|\scom\s|\suma?\s|\sque\s)/gi) || []).length} EN:${(text.match(/(\sthe\s|\swith\s|\sand\s)/gi) || []).length}`
  );
}

async function enter(page: any, tabRe: RegExp) {
  await page.goto('/');
  await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
  await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('tab', { name: tabRe }).first().click();
  await page.waitForTimeout(1000);
}
const T = 300000;

test('mx: tiktok cover', async ({ page }) => {
  test.setTimeout(600000);
  await enter(page, /tiktok/i);
  await page.getByLabel(/briefing: dados brutos/i).fill('Café especial para baristas, video curto.');
  await page.getByRole('button', { name: /^gerar$/i }).click();
  await expect(page.getByText(/ativo finalizado/i).first()).toBeVisible({ timeout: T });
  await page.getByRole('button', { name: /^capa$/i }).click();
  await page.waitForTimeout(600);
  await page.getByLabel(/frase impactante na capa/i).fill('CAFE');
  await page.getByRole('button', { name: /^gerar$/i }).click();
  await page.waitForTimeout(2000);
  await expect(page.getByText(/ativo finalizado/i).first()).toBeVisible({ timeout: T });
  await page.waitForTimeout(3000);
  rep('TT-COVER', (await page.locator('pre').first().textContent()) || '');
});

test('mx: reels cover', async ({ page }) => {
  test.setTimeout(420000);
  await enter(page, /reels/i);
  await page.getByRole('button', { name: /capa feed/i }).click();
  await page.waitForTimeout(600);
  await page.getByLabel(/headline da capa do feed/i).fill('CAFE');
  await page.getByLabel(/briefing: dados brutos/i).fill('Barista com café, vapor, premium.');
  await page.getByRole('button', { name: /^gerar$/i }).click();
  await expect(page.getByText(/ativo finalizado/i).first()).toBeVisible({ timeout: T });
  await page.waitForTimeout(3000);
  rep('REELS-COVER', (await page.locator('pre').first().textContent()) || '');
});

test('mx: yt thumb', async ({ page }) => {
  test.setTimeout(420000);
  await enter(page, /youtube/i);
  await page.getByRole('button', { name: /thumbnail clickbait/i }).click();
  await page.waitForTimeout(600);
  await page.getByLabel(/ex: o segredo do/i).fill('CAFE TOP');
  await page.getByLabel(/briefing: dados brutos/i).fill('Video sobre café especial.');
  await page.getByRole('button', { name: /executar comando/i }).click();
  await expect(page.getByText(/ativo finalizado/i).first()).toBeVisible({ timeout: T });
  await page.waitForTimeout(3000);
  console.log('[MX:YT] STRUCTS:' + (await page.getByRole('button', { name: /estrutura \d/i }).count()));
  rep('YT-THUMB', (await page.locator('pre').first().textContent()) || '');
});

test('mx: logo', async ({ page }) => {
  test.setTimeout(420000);
  await enter(page, /identidade|logo/i);
  await page.getByLabel(/nome da marca/i).fill('Café Teste');
  await page.getByPlaceholder(/ex: consultoria para/i).fill('Cafeteria de bairro.');
  await page.getByRole('button', { name: /projetar marca/i }).click();
  await expect(page.getByRole('button', { name: /opção 1|option 1/i }).first()).toBeVisible({ timeout: T });
  await page.waitForTimeout(2000);
  rep('LOGO', (await page.locator('pre').first().textContent()) || '');
});

test('mx: magazine', async ({ page }) => {
  test.setTimeout(420000);
  await enter(page, /autoridade visual|magazine/i);
  await page.getByPlaceholder(/ex: o novo líder/i).fill('MESTRE DO CAFE');
  await page.getByPlaceholder(/ex: como ele dominou/i).fill('Do grão à xícara');
  await page.getByLabel(/insira os dados brutos/i).fill('Barista premiado, fundo dourado.');
  await page.getByRole('button', { name: /criar capa|generate cover/i }).click();
  await expect(page.getByText(/nota do estrategista/i).first()).toBeVisible({ timeout: T }).catch(() => {});
  await page.waitForTimeout(2000);
  const t = (await page.locator('pre').count()) ? (await page.locator('pre').first().textContent()) || '' : '';
  if (t) rep('MAGAZINE', t); else console.log('[MX:MAGAZINE] SEM_PRE');
});

test('mx: lettering', async ({ page }) => {
  test.setTimeout(420000);
  await enter(page, /tipografia|lettering/i);
  await page.getByPlaceholder(/frase principal da arte/i).fill('Café Forte');
  await page.getByPlaceholder(/sobre o que é a arte/i).fill('Parede de cafeteria.');
  await page.getByRole('button', { name: /projetar arte|design lettering/i }).click();
  await expect(page.getByRole('tab', { name: /opção \d|option \d/i }).first()).toBeVisible({ timeout: T });
  await page.waitForTimeout(2000);
  rep('LETTERING', (await page.locator('pre').first().textContent()) || '');
});

test('mx: meme', async ({ page }) => {
  test.setTimeout(420000);
  await enter(page, /memes|meme/i);
  await page.getByPlaceholder(/descreva a situação/i).fill('Cliente que pede café frio sem gelo.');
  await page.getByRole('button', { name: /gerar memes|create memes/i }).click();
  await expect(page.getByRole('tab', { name: /opção \d|option \d/i }).first()).toBeVisible({ timeout: T });
  await page.waitForTimeout(2000);
  rep('MEME', (await page.locator('pre').first().textContent()) || '');
});

test('mx: comic', async ({ page }) => {
  test.setTimeout(420000);
  await enter(page, /quadrinhos|comic/i);
  await page.getByLabel(/insira os dados brutos/i).fill('Barista herói, 4 quadros.');
  await page.getByRole('button', { name: /roteirizar hq|draw script/i }).click();
  await expect(page.getByText(/nota do estrategista/i).first()).toBeVisible({ timeout: T }).catch(() => {});
  await page.waitForTimeout(2000);
  const t = (await page.locator('pre').count()) ? (await page.locator('pre').first().textContent()) || '' : '';
  if (t) rep('COMIC', t); else console.log('[MX:COMIC] SEM_PRE');
});

test('mx: carousel', async ({ page }) => {
  test.setTimeout(420000);
  await enter(page, /carrossel|carousel/i);
  await page.getByPlaceholder(/ex: 5 dicas para/i).fill('3 erros no café coado');
  await page.getByLabel(/insira os dados brutos/i).fill('Moagem, água, tempo.');
  await page.getByRole('button', { name: /criar narrativa visual|create carousel/i }).click();
  await expect(page.getByRole('tab', { name: /lâmina \d|slide \d/i }).first()).toBeVisible({ timeout: T });
  await page.waitForTimeout(2000);
  console.log('[MX:CAROUSEL] SLIDES:' + (await page.getByRole('tab', { name: /lâmina \d|slide \d/i }).count()));
  rep('CAROUSEL', (await page.locator('div.whitespace-pre-wrap').first().textContent()) || '');
});

test('mx: quote', async ({ page }) => {
  test.setTimeout(420000);
  await enter(page, /gerador de frases|quote/i);
  await page.getByLabel(/insira os dados brutos/i).first().fill('Café e foco.');
  await page.getByRole('button', { name: /gerar/i }).click();
  await page.waitForTimeout(2000);
  const t = (await page.locator('pre').count()) ? (await page.locator('pre').first().textContent()) || '' : '';
  const note = await page.getByText(/nota do estrategista/i).count();
  console.log('[MX:QUOTE] PRE:' + (t.length > 0) + ' NOTE:' + note);
  if (t) rep('QUOTE', t);
});

test('mx: media imagem', async ({ page }) => {
  test.setTimeout(420000);
  await enter(page, /media/i);
  await page.getByPlaceholder(/descreva a cena/i).fill('Barista com café, vapor dourado.');
  await page.getByRole('button', { name: /gerar image/i }).click();
  await expect(page.getByText(/nota do estrategista/i).first()).toBeVisible({ timeout: T }).catch(() => {});
  await page.waitForTimeout(2000);
  const t = (await page.locator('pre').count()) ? (await page.locator('pre').first().textContent()) || '' : '';
  if (t) rep('MEDIA', t); else console.log('[MX:MEDIA] SEM_PRE');
});

test('mx: email+vsl', async ({ page }) => {
  test.setTimeout(600000);
  await enter(page, /email marketing/i);
  await page.getByLabel(/insira os dados brutos|contexto/i).first().fill('Café especial para baristas.');
  const btn = page.getByRole('button', { name: /gerar|executar|criar/i }).first();
  await btn.click();
  await page.waitForTimeout(2000);
  const t = (await page.locator('pre').count()) ? (await page.locator('pre').first().textContent()) || '' : '';
  console.log('[MX:EMAIL] LEN:' + t.length);
});
