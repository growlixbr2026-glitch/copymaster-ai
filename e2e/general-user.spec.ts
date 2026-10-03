import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { clickSessionTab } from './helpers/sessionTabs';

// Camada 1 (navegação sem quota, todas as 51) +
// camada 2 (lote crítico de 8 sessões com geração real, timeout curto).
// Quota :free é flaky: timeout/quota viram `skip` com motivo, nunca falha muda.
// Geração :free pode ser lenta: retries cobrem flake de rede, não bug de app.
test.describe.configure({ retries: 1, mode: 'serial' });

const REPORT_JSON = path.join('test-results', 'general-report.json');
const REPORT_MD = path.join('test-results', 'general-report.md');

interface Row {
  sessao: string;
  camada: string;
  tempoMs: number;
  status: 'ok' | 'err' | 'skip';
  detalhe: string;
  outputChars: number;
}
const rows: Row[] = [];
function push(r: Row) {
  rows.push(r);
  // Persiste incremental (cada teste roda em worker próprio).
  try {
    fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
    let all: Row[] = [];
    try {
      all = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf-8'));
      if (!Array.isArray(all)) all = [];
    } catch { /* primeira escrita */ }
    all.push(r);
    fs.writeFileSync(REPORT_JSON, JSON.stringify(all, null, 2));
  } catch { /* relatório é acessório, nunca falha teste */ }
  // eslint-disable-next-line no-console
  console.log(`[GENERAL] ${r.sessao} | ${r.camada} | ${r.tempoMs}ms | ${r.status} | ${r.detalhe} | out=${r.outputChars}`);
}

const MARKER = 'ZAFRA-42 auditoria geral';

async function openSala(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
  await expect(page.locator('input[placeholder*="consultoria"]').first()).toBeVisible({ timeout: 10000 });
}

// Ids das 51 sessões da sidebar (wallet/settings são botões, não tabs).
// Localização por id OU rótulo PT via helpers/sessionTabs — índice numérico
// quebrava a cada sessão nova (PRD em 2026-09-27 deslocou tudo em +1).
const TABS: string[] = [
  'ideas',
  'copy',
  'notebook',
  'personas',
  'prd',
  'email',
  'vsl',
  'lp',
  'ads',
  'sexy',
  'tiktok',
  'reels',
  'youtube',
  'logo',
  'carousel',
  'magazine',
  'quote',
  'citation',
  'lettering',
  'comic',
  'adultAnimation',
  'meme',
  'infographic',
  'article',
  'ppt',
  'media',
  'inspiration',
  'seoAudit',
  'keywords',
  'contentBrief',
  'competitor',
  'outreach',
  'commentResponder',
  'leadMagnet',
  'launch',
  'churn',
  'pmf',
  'flywheel',
  'partnerships',
  'channelEconomics',
  'revops',
  'pricing',
  'coldEmail',
  'battleCard',
  'enablement',
  'dealDesk',
  'aePrep',
  'salesEngineer',
  'customerSuccess',
  'salesOps',
  'stress',
];

test('camada 1: navegar 51 sessoes sem quota, medir resposta UI', async ({ page }) => {
  test.setTimeout(180000);
  try {
    fs.mkdirSync(path.dirname(REPORT_JSON), { recursive: true });
    fs.writeFileSync(REPORT_JSON, '[]');
  } catch { /* segue sem relatório incremental */ }
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
  await openSala(page);
  const tabs = page.getByRole('tab');
  const n = await tabs.count();
  expect(n, 'sidebar tabs').toBeGreaterThanOrEqual(50);
  for (const id of TABS) {
    const t0 = Date.now();
    const found = await clickSessionTab(page, id);
    expect(found, `tab da sessão "${id}" não encontrada na sidebar (drift de rótulo?)`).toBeTruthy();
    await page.waitForTimeout(700);
    const dt = Date.now() - t0;
    const len = (((await page.locator('#root').textContent()) || '').trim().length);
    const crash = await page.locator('text=Algo deu errado').count();
    if (crash > 0 || len <= 150) {
      push({ sessao: id, camada: 'navegacao', tempoMs: dt, status: 'err', detalhe: crash > 0 ? 'error boundary' : `em branco (${len}c)`, outputChars: len });
    } else {
      push({ sessao: id, camada: 'navegacao', tempoMs: dt, status: 'ok', detalhe: 'render', outputChars: len });
    }
  }
  expect(errors, JSON.stringify(errors.slice(0, 4))).toEqual([]);
});

// Lote crítico: botão de gerar por sessão (PT) + verificador de sucesso.
const BATCH: { id: string; btn: RegExp; fillInputs: boolean; success: RegExp[] }[] = [
  { id: 'ideas', btn: /gerar estratégia/i, fillInputs: true, success: [/pesquisa instantânea/i] },
  { id: 'copy', btn: /executar comando/i, fillInputs: true, success: [/variação 1/i] },
  { id: 'email', btn: /escrever sequência/i, fillInputs: true, success: [/email 1/i] },
  { id: 'vsl', btn: /criar vsl/i, fillInputs: true, success: [/nota do estrategista/i] },
  { id: 'ads', btn: /criar anúncios/i, fillInputs: true, success: [/variação|opção 1|nota do estrategista/i] },
  { id: 'youtube', btn: /executar comando/i, fillInputs: true, success: [/roteiro|título|nota do estrategista/i] },
  { id: 'carousel', btn: /criar narrativa visual/i, fillInputs: true, success: [/slide|lâmina|nota do estrategista/i] },
  { id: 'article', btn: /escrever artigo/i, fillInputs: true, success: [/nota do estrategista|introdução|conclusão/i] },
];

for (const s of BATCH) {
  test(`camada 2 real: ${s.id} gera com contrato`, async ({ page }) => {
    // 150s por sessão: passou disso = skip (throttle), não falha.
    test.setTimeout(180000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
    await openSala(page);
    const found = await clickSessionTab(page, s.id);
    expect(found, `${s.id}: tab não encontrada na sidebar (drift de rótulo?)`).toBeTruthy();
    await page.waitForTimeout(800);
    // Preenche briefing: todos os textareas + inputs de texto visíveis.
    const areas = page.locator('textarea:visible');
    for (let i = 0; i < (await areas.count()); i++) {
      await areas.nth(i).fill(`${MARKER} ${s.id} para teste geral`);
    }
    const inputs = page.locator('input:visible');
    for (let i = 0; i < (await inputs.count()); i++) {
      const t = ((await inputs.nth(i).getAttribute('type')) || 'text').toLowerCase();
      if (['hidden', 'submit', 'button', 'checkbox', 'radio', 'file', 'number', 'range'].includes(t)) continue;
      const v = (await inputs.nth(i).inputValue()).trim();
      if (!v) await inputs.nth(i).fill(`${MARKER} ${s.id}`);
    }
    const btn = page.getByRole('button', { name: s.btn }).first();
    await expect(btn, `${s.id}: botão gerar`).toBeVisible({ timeout: 10000 });
    if (await btn.isDisabled()) {
      push({ sessao: s.id, camada: 'geracao', tempoMs: 0, status: 'skip', detalhe: 'botão segue desabilitado (campo obrigatório específico)', outputChars: 0 });
      return;
    }
    const before = (((await page.locator('#root').textContent()) || '').length);
    const t0 = Date.now();
    await btn.click();
    // Poll 120s: erro friendly OU algum marcador de sucesso.
    // Nota: YouTube renderiza a Nota em bg-red-950/10 — erro real é
    // bg-red-950/40 ou role=alert (ToolLayout). Seletor exclui a nota.
    const errBox = page.locator('div[class*="bg-red-950/40"], div[role="alert"]');
    let outcome: 'ok' | 'err' | 'timeout' = 'timeout';
    let detalhe = '';
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(3000);
      if (await errBox.first().isVisible().catch(() => false)) {
        outcome = 'err';
        detalhe = ((await errBox.first().textContent()) || '').slice(0, 120);
        break;
      }
      // Marcador só vale com crescimento real do output (evita falso-positivo
      // com texto estático da UI, ex.: "título" em label).
      const grown = (((await page.locator('#root').textContent()) || '').length - before) > 150;
      if (!grown) continue;
      for (const rx of s.success) {
        if (await page.getByText(rx).first().isVisible().catch(() => false)) {
          outcome = 'ok';
          detalhe = `marcador ${rx}`;
          break;
        }
      }
      if (outcome === 'ok') break;
    }
    const dt = Date.now() - t0;
    const after = (((await page.locator('#root').textContent()) || '').length);
    const body = ((await page.locator('#root').textContent()) || '');
    if (outcome === 'timeout') {
      push({ sessao: s.id, camada: 'geracao', tempoMs: dt, status: 'skip', detalhe: 'timeout 120s (throttle :free)', outputChars: Math.max(0, after - before) });
      return;
    }
    if (outcome === 'err') {
      const quota = /quota|429|402|tier|rate limit|esgotada/i.test(detalhe);
      // Erro cru (JSON vazado) = bug de app = falha real.
      expect(detalhe, `${s.id}: erro cru vazado`).not.toMatch(/\{"object"|"choices"|reasoning_content/i);
      push({ sessao: s.id, camada: 'geracao', tempoMs: dt, status: quota ? 'skip' : 'err', detalhe: quota ? `quota/erro friendly: ${detalhe.slice(0, 80)}` : `erro app: ${detalhe.slice(0, 80)}`, outputChars: 0 });
      if (!quota) expect(`APP ERROR ${s.id}: ${detalhe}`).toBe('');
      return;
    }
    // outcome ok: contrato do entregável.
    expect(body, `${s.id}: JSON cru vazado`).not.toMatch(/\{"object"|"choices"|reasoning_content/i);
    expect(errors, JSON.stringify(errors.slice(0, 3))).toEqual([]);
    push({ sessao: s.id, camada: 'geracao', tempoMs: dt, status: 'ok', detalhe, outputChars: Math.max(0, after - before) });
  });
}

test('relatório geral: tabela sessão × tempo × status', async () => {
  // Lê do arquivo (acumulado por todos os workers), não da memória local.
  let fileRows: Row[] = [];
  try {
    fileRows = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf-8'));
    if (!Array.isArray(fileRows)) fileRows = [];
  } catch { fileRows = []; }
  const byId: Record<string, Row[]> = {};
  for (const r of fileRows) (byId[r.sessao] = byId[r.sessao] || []).push(r);
  const lines = ['# Relatório geral como usuário', '', `Gerado em ${new Date().toISOString()}`, '', '| Sessão | Camada | Tempo | Status | Detalhe | Output |', '|---|---|---|---|---|---|'];
  for (const id of TABS) {
    for (const r of byId[id] || []) {
      lines.push(`| ${r.sessao} | ${r.camada} | ${r.tempoMs}ms | ${r.status} | ${r.detalhe} | ${r.outputChars}c |`);
    }
  }
  const fails = fileRows.filter((r) => r.status === 'err');
  lines.push('', `Total: ${fileRows.length} medições, ${fails.length} falhas de app.`);
  fs.mkdirSync(path.dirname(REPORT_MD), { recursive: true });
  fs.writeFileSync(REPORT_MD, lines.join('\n'));
  // eslint-disable-next-line no-console
  console.log('\n' + lines.join('\n'));
  expect(fails, `falhas de app: ${JSON.stringify(fails)}`).toEqual([]);
});
