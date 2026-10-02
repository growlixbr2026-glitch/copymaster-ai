import { test, expect } from '@playwright/test';
import * as MF from './helpers/mockFactories';
import {
  TTS_PLATFORMS,
  TTS_DURATION_OPTIONS,
  estimateWordsForDuration,
  clampDuration,
  getTTSPlatform,
  getVoicesFor
} from '../data/tts';

// ÁUDIO (Media) — determinístico, 0 quota.
// 1) PUROS: catálogo 9 plataformas só-PT-BR + estimativa palavras×duração + filtro por modelo.
// 2) BROWSER mock: seletor de duração 10-120s sai no payload e o COMANDO completo
//    (config JSON + divisor + roteiro) fica visível na tela.

const BRIEF = 'cafeteria teste sem marcador';
const CHAT = /\/v1\/chat\/completions|openrouter\.ai|localhost:20128/;

test.describe('tts catalog (puro, 0 quota)', () => {
  test('9 plataformas: brief, modelos, vozes[0]=auto, template com duracao alvo', () => {
    expect(TTS_PLATFORMS.length).toBeGreaterThanOrEqual(9);
    for (const p of TTS_PLATFORMS) {
      expect(p.id, p.label).toBeTruthy();
      expect(p.brief.length).toBeGreaterThan(80, p.id);
      expect(p.durationNote.length).toBeGreaterThan(30, p.id);
      expect(p.models.length).toBeGreaterThanOrEqual(1, p.id);
      for (const m of p.models) { expect(m.id, p.id).toBeTruthy(); expect(m.label, p.id).toBeTruthy(); }
      expect(p.voices.length, p.id).toBeGreaterThanOrEqual(4);
      expect(p.voices[0].id, p.id).toBe('auto');
      for (const v of p.voices) { expect(v.id, p.id).toBeTruthy(); expect(v.label, p.id).toBeTruthy(); }
      // O esqueleto de config precisa carregar a escolha do usuário de duração
      expect(p.configTemplate, p.id).toContain('{{duration}}');
      expect(p.configTemplate, p.id).toContain('{{words}}');
      expect(p.configTemplate, p.id).toContain('duration_seconds');
      expect(p.configTemplate, p.id).toContain('target_words');
    }
  });

  test('so vozes PT-BR: nenhum pt-PT / en-US vazando nos bancos', () => {
    const all = JSON.stringify(TTS_PLATFORMS.map(p => p.voices));
    expect(all).not.toContain('pt-PT');
    expect(all).not.toContain('en-US');
    // Bancos com código de idioma obrigatoriamente pt-BR
    for (const p of [getTTSPlatform('google_cloud'), getTTSPlatform('azure'), getTTSPlatform('murf')]) {
      const coded = p.voices.filter(v => v.id !== 'auto' && v.id.includes('-'));
      for (const v of coded) expect(v.id, `${p.id}:${v.id}`).toMatch(/^pt-BR-/i);
    }
  });

  test('estimativa de palavras: 10s=26, 60s=156, 120s=312; opcoes 10..120 step 5', () => {
    expect(estimateWordsForDuration(10)).toBe(26);
    expect(estimateWordsForDuration(60)).toBe(156);
    expect(estimateWordsForDuration(120)).toBe(312);
    expect(clampDuration(3)).toBe(10);
    expect(clampDuration(999)).toBe(120);
    expect(clampDuration('abc')).toBe(30);
    expect(TTS_DURATION_OPTIONS[0]).toBe(10);
    expect(TTS_DURATION_OPTIONS[TTS_DURATION_OPTIONS.length - 1]).toBe(120);
    expect(TTS_DURATION_OPTIONS.length).toBe(23);
    // monotonia
    for (let i = 1; i < TTS_DURATION_OPTIONS.length; i++) {
      expect(estimateWordsForDuration(TTS_DURATION_OPTIONS[i])).toBeGreaterThan(estimateWordsForDuration(TTS_DURATION_OPTIONS[i - 1]));
    }
  });

  test('filtro por modelo: vozes de um modelo nao vazam para outro', () => {
    const g = getTTSPlatform('google_cloud');
    expect(getVoicesFor(g, 'neural2').filter(v => v.id !== 'auto')).toHaveLength(3);
    expect(getVoicesFor(g, 'chirp3-hd').filter(v => v.id !== 'auto')).toHaveLength(30);
    expect(getVoicesFor(g, 'wavenet').filter(v => v.id !== 'auto')).toHaveLength(5);

    const oai = getTTSPlatform('openai');
    expect(getVoicesFor(oai, 'tts-1').filter(v => v.id !== 'auto')).toHaveLength(9);
    expect(getVoicesFor(oai, 'gpt-4o-mini-tts').filter(v => v.id !== 'auto')).toHaveLength(13);

    const polly = getTTSPlatform('amazon_polly');
    const std = getVoicesFor(polly, 'standard').filter(v => v.id !== 'auto').map(v => v.id);
    expect(std.sort()).toEqual(['Camila', 'Ricardo', 'Vitória']);
    const neu = getVoicesFor(polly, 'neural').filter(v => v.id !== 'auto').map(v => v.id);
    expect(neu.sort()).toEqual(['Camila', 'Thiago', 'Vitória']);

    // Automático sempre presente, em qualquer modelo
    for (const p of TTS_PLATFORMS) for (const m of p.models) {
      expect(getVoicesFor(p, m.id)[0].id, `${p.id}/${m.id}`).toBe('auto');
    }
  });
});

test.describe('tts no browser (mock, 0 quota)', () => {
  const AUDIO_MOCK =
    '{ "engine": "neural", "voice_id": "Camila", "language_code": "pt-BR", "output_format": "mp3" }\n' +
    '|||CONFIG_END|||\n' +
    'Bem-vindo à cafeteria de teste, onde cada xícara carrega história e o roteiro respeita a duração pedida.\n' +
    '|||NOTA_DIVIDER|||\n' +
    'Nota do Estrategista — mock Áudio';

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('openrouter_api_key', 'e2e-mock-key-sem-quota');
        localStorage.setItem('primary_text_provider', 'openrouter');
        localStorage.setItem('primary_prompt_provider', 'openrouter');
      } catch {}
    });
    page.on('pageerror', (e) => { throw new Error('PAGEERROR: ' + String(e).slice(0, 200)); });
  });

  async function openAudio(page: any) {
    await page.goto('/');
    await page.getByRole('button', { name: /ABRIR SALA DE IDEIAS/i }).click();
    await page.getByRole('tab', { name: /media/i }).first().click();
    const panel = page.locator('[role="tabpanel"]:visible').first();
    await panel.getByRole('button', { name: /[aá]udio/i }).first().click();
    await expect(panel.getByLabel('Provedor')).toBeVisible();
    return panel;
  }

  test('seletores: 9 provedores, vozes filtradas por plataforma/modelo, duracao 10-120', async ({ page }) => {
    const p = await openAudio(page);

    expect(await p.getByLabel('Provedor').locator('option').count()).toBeGreaterThanOrEqual(9);

    // Padrão: ElevenLabs + voz Automático primeiro
    await expect(p.getByLabel('Voz')).toHaveValue('auto');
    const elvVoices = await p.getByLabel('Voz').locator('option').allTextContents();
    expect(elvVoices[0]).toContain('Automático');
    expect(elvVoices.join('|')).toContain('Rafael Valente');

    // Trocar provedor: vozes trocam e voz volta para Automático
    await p.getByLabel('Provedor').selectOption('murf');
    await expect(p.getByLabel('Voz')).toHaveValue('auto');
    const murfVoices = await p.getByLabel('Voz').locator('option').allTextContents();
    expect(murfVoices.join('|')).toContain('Benício');
    expect(murfVoices.join('|')).not.toContain('Rafael Valente');
    expect(await p.getByLabel('Voz').locator('option[value="pt-BR-benício"]').count()).toBe(1);

    // Filtro por modelo: gen2 não tem as vozes novas do falcon-2
    await p.getByLabel('Modelo').selectOption('gen2');
    expect(await p.getByLabel('Voz').locator('option[value="pt-BR-yago"]').count()).toBe(0);
    await p.getByLabel('Modelo').selectOption('falcon-2');
    expect(await p.getByLabel('Voz').locator('option[value="pt-BR-yago"]').count()).toBe(1);

    // Duração: 23 opções de 10 a 120 e a estimativa de palavras acompanha
    const opts = await p.getByLabel('Duração').locator('option').evaluateAll((els: any[]) => els.map(e => e.value));
    expect(opts.length).toBe(23);
    expect(opts[0]).toBe('10');
    expect(opts[opts.length - 1]).toBe('120');
    await p.getByLabel('Duração').selectOption('60');
    await expect(p.getByText('60s ≈ 156 palavras')).toBeVisible();
    await p.getByLabel('Duração').selectOption('120');
    await expect(p.getByText('120s ≈ 312 palavras')).toBeVisible();
  });

  test('duracao+plataforma saem no payload; COMANDO completo fica visivel', async ({ page }) => {
    test.setTimeout(120000);
    let payload = '';
    await page.route(CHAT, async (route) => {
      const body = route.request().postData() || '';
      if (/ROTEIRISTA DE ÁUDIO/i.test(body)) payload = body;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MF.toOpenAIChoices(AUDIO_MOCK)) });
    });

    const p = await openAudio(page);
    await p.getByLabel('Provedor').selectOption('amazon_polly');
    await p.getByLabel('Voz').selectOption('Camila');
    await p.getByLabel('Duração').selectOption('60');
    await p.getByLabel('Contexto para geração').fill(BRIEF);
    await p.getByRole('button', { name: /Gerar [aá]udio/i }).click();

    await expect(p.getByText('voice_id')).toBeVisible({ timeout: 30000 });
    await expect(p.getByText(/Bem-vindo à cafeteria de teste/)).toBeVisible();
    await expect(p.getByText(/Nota do Estrategista — mock Áudio/)).toBeVisible();

    // Payload: duração, alvo de palavras e config real da plataforma
    // (o JSON do prompt vai escapado dentro do body — desescapado para as asserções)
    const plain = payload.replace(/\\"/g, '"');
    expect(payload).toContain('ROTEIRISTA DE ÁUDIO');
    expect(payload).toContain(BRIEF);
    expect(payload).toContain('DURAÇÃO OBRIGATÓRIA: 60 segundos');
    expect(payload).toContain('156 palavras');
    expect(plain).toContain('"duration_seconds": 60');
    expect(plain).toContain('"target_words": 156');
    expect(plain).toContain('"engine": "neural"');
    expect(plain).toContain('"voice_id": "Camila"');
    expect(payload).toContain('Amazon Polly');
    expect(payload).toContain('|||CONFIG_END|||');
  });
});
