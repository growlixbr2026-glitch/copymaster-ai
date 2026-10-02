import { test, expect } from '@playwright/test';
import * as MF from './helpers/mockFactories';

// FORENSE LOCAL PT-BR — determinístico, 0 quota.
// 1) Testes PUROS: importam textForensics direto no Node (sem browser, sem LLM)
//    e provam a calibração da estimativa local + limpeza + regex.
// 2) Testes de browser: fallback honesto (perito morto) e fluxo completo do
//    Humanizar com passo 0 (pré-limpeza) — tudo mockado.

const BRIEF = 'cafeteria teste sem marcador';
const CHAT = /\/v1\/chat\/completions|openrouter\.ai|localhost:20128/;

// Máquina: frases de tamanho uniforme (5-8 palavras) + termos do léxico.
const MAQUINA =
  'Além disso, vale ressaltar que o método funciona. No mundo de hoje, tudo muda rápido. ' +
  'Vale ressaltar que a solução é incrível. Além disso, seguimos firmes no trabalho. ' +
  'Vale ressaltar que o futuro é nosso. Além disso, avançamos com tudo.';

// Humano: ritmo quebrado (2 a 26 palavras), sem termos do léxico, com detalhe concreto.
const HUMANO =
  'Comprei ontem às sete. Foi um caos: o ônibus atrasou vinte minutos, chovia torrencial ' +
  'e o sistema do banco caiu — aquele problema antigo de terça que ninguém conserta há anos. ' +
  'Cheguei atrasado. Ainda assim, contra todas as expectativas, o cliente assinou no mesmo dia ' +
  '— algo que não acontecia aqui há dois anos.';

test.describe('forense local PT-BR (puro, 0 rede)', () => {
  // Import dinâmico dentro do describe: mantém o módulo puro fora do caminho
  // dos testes de browser (e falha claro se o import quebrar).
  let FX: typeof import('../services/modules/tools/textForensics');

  test.beforeAll(async () => {
    FX = await import('../services/modules/tools/textForensics');
  });

  test('maquina pontua pior que humano (gate 70 x faixa humano)', () => {
    const sMaquina = FX.localEstimate(MAQUINA).score;
    const sHumano = FX.localEstimate(HUMANO).score;
    // Calibração PT-BR: máquina densa >= 70 (passaria o gate), humano < 40.
    expect(sMaquina).toBeGreaterThanOrEqual(70);
    expect(sHumano).toBeLessThan(40);
    expect(sMaquina).toBeGreaterThan(sHumano + 40);
    // Ritmo: CV da máquina (frases iguais) menor que o do humano
    expect(FX.burstinessOf(MAQUINA)!.cv).toBeLessThan(FX.burstinessOf(HUMANO)!.cv);
  });

  test('estruturas regex pegam variacao que o literal nao pega', () => {
    const dualidade = FX.quickLocalScan('O aplicativo não é só útil, é uma revolução total na sua rotina.');
    expect(dualidade.some((h) => h.family === 'dualidade')).toBe(true);

    const hashtags = FX.quickLocalScan('Sobre o post: #marketing #ia #viral #dicas #tendencia #negocios');
    expect(hashtags.some((h) => h.family === 'mobilizacao_forcada')).toBe(true);

    const invis = FX.quickLocalScan('Texto colado com\u200B zero-width aqui.');
    expect(invis.some((h) => h.family === 'caracteres_invisiveis')).toBe(true);
  });

  test('dedup: literal do catalogo nao duplica no lexico', () => {
    const hits = FX.quickLocalScan('Vale ressaltar que o plano funciona bem para a equipe.');
    expect(hits.some((h) => h.family === 'conectivos_inchados')).toBe(true);
    expect(hits.some((h) => h.family === 'slop_lexico')).toBe(false);
  });

  test('autoClean: remove invisiveis, troca termo safe, preserva tipografia PT', () => {
    const r = FX.autoCleanText('Vale ressaltar que\u200B o plano funciona — ele é incrível para\u00AD a equipe.');
    expect(r.text).not.toContain('\u200B');
    expect(r.text).not.toContain('\u00AD');
    expect(r.text).toContain('Note que'); // caixa preservada na substituição
    expect(r.text).toContain('marcante'); // incrível → marcante
    expect(r.text).toContain('—'); // régua PT legítima NÃO é tocada
    expect(r.removedChars).toBe(2);
    expect(r.replacedTerms).toBe(2);

    // NBSP (Word) vira espaço normal sem sinal
    const nbsp = FX.stripInvisibleChars('R$\u00A0100');
    expect(nbsp.text).toBe('R$ 100');
    expect(nbsp.count).toBe(1);
  });

  test('estabilidade em loop: 5 execucoes com o mesmo score', () => {
    const scores = new Set(Array.from({ length: 5 }, () => FX.localEstimate(MAQUINA).score));
    expect(scores.size).toBe(1);
  });

  test('entrada vazia/curta nao quebra (sem NaN, faixa valida)', () => {
    for (const bad of ['', 'ok.', 'Uma frase só.']) {
      const est = FX.localEstimate(bad);
      expect(Number.isFinite(est.score)).toBe(true);
      expect(est.score).toBeGreaterThanOrEqual(0);
      expect(est.score).toBeLessThanOrEqual(100);
      expect(FX.quickLocalScan(bad)).toEqual([]);
      expect(FX.autoCleanText(bad).text).toBe(bad);
    }
  });
});

test.describe('humanizer no browser (mock, 0 quota)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('openrouter_api_key', 'e2e-mock-key-sem-quota');
        localStorage.setItem('primary_text_provider', 'openrouter');
        localStorage.setItem('primary_prompt_provider', 'openrouter');
      } catch {}
    });
    await page.route(/\/api\/research.*/, async (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [] }) }));
    page.on('pageerror', (e) => { throw new Error('PAGEERROR: ' + String(e).slice(0, 200)); });
  });

  async function activeRoot(page: any) {
    const kids = page.locator('[role="tabpanel"] > div');
    const n = await kids.count();
    for (let i = 0; i < n; i++) {
      const kid = kids.nth(i);
      const st = (await kid.getAttribute('style').catch(() => '')) || '';
      const hidden = await kid.getAttribute('aria-hidden').catch(() => null);
      if (st.includes('block') && hidden === 'false') return kid;
    }
    return page.locator('[role="tabpanel"]:visible').first();
  }

  async function openCopy(page: any) {
    await page.goto('/');
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    await page.getByRole('tab', { name: /copy/i }).first().click();
    const p = await activeRoot(page);
    await p.getByLabel(/briefing: ideia ou referência/i).first().fill(BRIEF);
    await p.getByRole('button', { name: /executar comando/i }).first().click();
    await expect(p.getByRole('button', { name: /verificar ia/i })).toBeVisible({ timeout: 45000 });
    return p;
  }

  test('fallback: perito morto -> estimativa local avisa, nunca bloqueia', async ({ page }) => {
    test.setTimeout(120000);
    await page.route(CHAT, async (route) => {
      const body = route.request().postData() || '';
      if (/PERITO FORENSE DE TEXTO/i.test(body)) return route.abort('failed');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices(MF.mockCopyText(BRIEF))) });
    });
    const p = await openCopy(page);
    await p.getByRole('button', { name: /verificar ia/i }).first().click();
    // Badge com score LOCAL visível (não erro) + aviso honesto de heurística
    await expect(p.getByRole('button', { name: /IA: \d+%/ })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Heurística local determinística/)).toBeVisible({ timeout: 15000 });
  });

  test('humanizar: pre-limpeza 1 termo, delta 85 -> 40, saida sem invisivel', async ({ page }) => {
    test.setTimeout(120000);
    const GEN =
      'cafeteria teste sem marcador — Vale ressaltar que o plano de atendimento funciona bem.\n' +
      '|||DIVIDER|||\nSegunda variação do texto de teste.\n' +
      '|||NOTA_DIVIDER|||\nNota do Estrategista — mock';
    let perito = 0;
    await page.route(CHAT, async (route) => {
      const body = route.request().postData() || '';
      if (/PERITO FORENSE DE TEXTO/i.test(body)) {
        perito += 1;
        const score = perito === 1 ? 85 : 40;
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MF.toOpenAIChoices(JSON.stringify({
            score,
            reason: 'Perito mock (CTE)',
            signals: [{ family: 'conectivos_inchados', evidence: ['Vale ressaltar que o plano funciona.'], count: 2 }],
            caveat: '',
          }))),
        });
      }
      if (/GHOSTWRITER CIRÚRGICO/i.test(body)) {
        // O LLM devolve lixo invisível de volta — a régua pós-LLM deve derrubar
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices('Reescrita final sem lixo invisível.\u200B Fim do texto.')) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices(GEN)) });
    });

    const p = await openCopy(page);
    await p.getByRole('button', { name: /verificar ia/i }).first().click();
    await expect(p.getByRole('button', { name: /IA: 85%/ })).toBeVisible({ timeout: 30000 });

    await p.getByRole('button', { name: /humanizar/i }).first().click();
    // Delta com passo 0: termo do léxico contado na pré-limpeza
    await expect(page.getByText(/IA 85% → 40%/)).toBeVisible({ timeout: 30000 });
    await expect(page.getByText(/Pré-limpeza: 1 termo/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/Reescrita final sem lixo invisível\./)).toBeVisible({ timeout: 10000 });

    const root = (await page.locator('#root').textContent()) || '';
    expect(root).not.toContain('\u200B'); // régua pós-LLM funcionou
    expect(root).not.toContain('Vale ressaltar'); // pré-limpeza funcionou
  });
});
