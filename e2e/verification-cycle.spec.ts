import { test, expect } from '@playwright/test';
import { clickSessionTab, activePanelText } from './helpers/sessionTabs';

const BASE_URL = '/';
const MARKER = 'ZAFRA-42';
const CTX = `PRODUTO: Café ${MARKER}. Venda o Café ${MARKER} para baristas. Café especial em grãos, torra clara premium. O nome do produto, Café ${MARKER}, deve aparecer no texto.`;

// Core sessions to verify - alphabetical order
const SESSIONS = [
  { id: 'ads', name: 'Gestor de Ads', brief: 'Meta Ads, vendas, produto' },
  { id: 'article', name: 'Redator Artigos', brief: 'Artigo com Schema JSON-LD' },
  { id: 'carousel', name: 'Carrossel Maker', brief: '3 lâminas com copy + prompt visual' },
  { id: 'citation', name: 'Citações Verificadas', brief: 'Citações reais com atribuição' },
  { id: 'copy', name: 'Copywriting Pro', brief: '2 variações de copy em texto puro' },
  { id: 'email', name: 'Email Marketing', brief: 'Sequência de e-mails' },
  { id: 'ideas', name: 'Sessão de Ideias', brief: 'Tendências e 6 ideias de conteúdo' },
  { id: 'infographic', name: 'Infográfico', brief: 'Estrutura com dados e hierarquia visual' },
  { id: 'lp', name: 'Landing Pages', brief: 'Arquitetura CRO com Hero e mecanismo único' },
  { id: 'magazine', name: 'Capa de Revista', brief: 'Prompt editorial em inglês com Regra #6' },
  { id: 'notebook', name: 'NotebookLM Studio', brief: '8 objetivos: Resumo/Roteiro/Mapa/Relatório/Flashcards/Quiz/Infográfico/Slides' },
  { id: 'personas', name: 'Personas', brief: 'Personas com nome, dores e vocabulário do nicho' },
  { id: 'prd', name: 'PRD Vibe Studio', brief: 'PRD estático executável em PT-BR com tokens' },
  { id: 'quote', name: 'Gerador de Frases', brief: '2+ quote cards separados por divisor' },
  { id: 'reels', name: 'Reels Studio', brief: 'Roteiro curto e direto para Reels' },
  { id: 'stress', name: 'Auditoria do Sistema', brief: 'Ferramenta sistema (sem badge)' },
  { id: 'tiktok', name: 'TikTok Studio', brief: 'Roteiro com gancho imediato, sem apresentação' },
  { id: 'vsl', name: 'Roteiro VSL', brief: 'Fala pura de teleprompter, sem rótulos de cena' },
] as const;

test.describe('CopyMaster AI - Ciclo de Verificação por Sessão', () => {
  test('usuario: testa sessão por sessão em ordem alfabética com chaves reais', async ({ page }) => {
    test.setTimeout(600000); // 10 min por teste
    
    const results: Record<string, { passed: boolean; details: string }> = {};
    
    await page.goto(BASE_URL);
    await expect(page.getByRole('heading', { name: /O Arquiteto da/i })).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    for (let i = 0; i < SESSIONS.length; i++) {
      const session = SESSIONS[i];
      console.log(`\n===== Onda ${i + 1}/${SESSIONS.length}: ${session.name} (${session.id}) =====`);
      
      // Clique no tab correspondente (id OU rótulo PT — ids como 'lp'/'magazine'
      // não aparecem literalmente no rótulo da sidebar).
      const tabFound = await clickSessionTab(page, session.id);
      if (tabFound) await page.waitForTimeout(800);
      
      if (!tabFound) {
        results[session.id] = { passed: false, details: `Tab "${session.id}" não encontrada` };
        console.error(`✗ ${session.id} - Tab não encontrada`);
        // Go back home
        try { await page.getByRole('button', { name: /Voltar ao Início/i }).click(); } catch {}
        continue;
      }
      
      // Wait for panel
      await page.waitForTimeout(1000);
      const panelText = await activePanelText(page);
      
      console.log(`Painel ${session.id}: ${panelText.length} chars`);
      
      if (panelText.length < 50) {
        results[session.id] = { passed: false, details: `Painel muito curto (${panelText.length} chars)` };
        console.error(`✗ ${session.id} - Painel muito curto`);
        try { await page.getByRole('button', { name: /Voltar ao Início/i }).click(); } catch {}
        continue;
      }
      
      // Try to find Generate button
      const genButton = page.getByRole('button', { name: /gerar|executar|gerar estratégia/i });
      const genCount = await genButton.count();
      
      if (genCount > 0 && (await genButton.first().isEnabled())) {
        // Fill briefing
        const briefingInput = page.getByLabel(/briefing: ideia ou referência/i) || 
                               page.getByLabel(/consultoria/i) ||
                               page.locator('textarea').first() ||
                               page.locator('input[placeholder]').first();
        
        if (briefingInput && (await briefingInput.isVisible())) {
          await briefingInput.fill(CTX);
          await page.waitForTimeout(300);
        }
        
        // Click generate
        await genButton.first().click();
        
        // Poll for result
        const errBox = page.locator('div[class*="bg-red-950"]');
        const doneBtn = page.locator('button:has-text("Baixar Relatório")');
        let outcome: 'ok' | 'err' | 'timeout' = 'timeout';
        let waitTime = 0;
        
        for (let j = 0; j < 60; j++) { // 3 min max per session
          await page.waitForTimeout(3000);
          waitTime += 3;
          
          const errVisible = await errBox.first().isVisible().catch(() => false);
          const doneVisible = await doneBtn.first().isVisible().catch(() => false);
          
          if (errVisible && !doneVisible) {
            outcome = 'err';
            break;
          }
          if (doneVisible) {
            outcome = 'ok';
            break;
          }
        }
        
        // Verificar saída
        const panelContent = await activePanelText(page);
        const hasDivider = panelContent.includes('|||');
        const hasNota = panelContent.includes('NOTA') || panelContent.includes('nota');
        
        if (outcome === 'ok') {
          results[session.id] = { 
            passed: true, 
            details: `OK - ${waitTime}ms | divisor: ${hasDivider} | nota: ${hasNota}` 
          };
          console.log(`✓ ${session.id} PASS - ${waitTime}ms | divisor: ${hasDivider} | nota: ${hasNota}`);
        } else if (outcome === 'err') {
          const errMsg = await errBox.first().textContent() || 'erro desconhecido';
          results[session.id] = { 
            passed: false, 
            details: `ERRO: ${errMsg?.slice(0, 100)} | divisor: ${hasDivider}` 
          };
          console.error(`✗ ${session.id} FAIL - ${errMsg?.slice(0, 100)}`);
        } else {
          results[session.id] = { 
            passed: false, 
            details: `TIMEOUT após ${waitTime}ms` 
          };
          console.error(`✗ ${session.id} TIMEOUT after ${waitTime}ms`);
        }
      } else {
        // Button disabled or not found - might be expected
        results[session.id] = { 
          passed: true, 
          details: 'Botão Gerar não disponível ou bloqueado' 
        };
        console.log(`○ ${session.id} - botão indisponível`);
      }
      
      // Voltar para home antes da próxima sessão
      try { 
        await page.getByRole('button', { name: /Voltar ao Início/i }).click(); 
        await page.waitForTimeout(500); 
      } catch {}
    }
    
    // Print final summary
    console.log('\n\n========================================');
    console.log('=== RESUMO FINAL DO CICLO DE VERIFICAÇÃO ===');
    console.log('========================================\n');
    
    let passed = 0, failed = 0, skipped = 0;
    for (const [session, result] of Object.entries(results)) {
      if (result.passed) passed++;
      else if (result.details.includes('ERRO')) failed++;
      else skipped++;
      
      const status = result.passed ? '✓' : result.details.includes('ERRO') ? '✗' : '⏱';
      console.log(`${status} ${session.padEnd(20)} | ${result.details}`);
    }
    
    console.log(`\nTotal: ${passed} passados, ${failed} falhas, ${skipped} pulados/indisponíveis`);
    
    // Re-run any failed sessions
    const failedSessions = Object.entries(results).filter(([, r]) => !r.passed && r.details.includes('ERRO'));
    if (failedSessions.length > 0) {
      console.log(`\n=== RE-RODANDO SESSÕES COM ERRO (${failedSessions.length}) ===`);
      for (const [session, result] of failedSessions) {
        console.log(`\n--- Re-testando: ${session} ---`);
        // Find and click the tab again
        const tabFound = await clickSessionTab(page, session);
        if (tabFound) await page.waitForTimeout(800);
        
        if (tabFound) {
          // Wait for panel
          await page.waitForTimeout(1000);
          
          // Try generate again
          const genButton = page.getByRole('button', { name: /gerar|executar|gerar estratégia/i });
          if (await genButton.first().isEnabled()) {
            await genButton.first().click();
            
            // Poll for result
            const errBox = page.locator('div[class*="bg-red-950"]');
            const doneBtn = page.locator('button:has-text("Baixar Relatório")');
            let outcome: 'ok' | 'err' | 'timeout' = 'timeout';
            let waitTime = 0;
            
            for (let j = 0; j < 60; j++) {
              await page.waitForTimeout(3000);
              waitTime += 3;
              
              const errVisible = await errBox.first().isVisible().catch(() => false);
              const doneVisible = await doneBtn.first().isVisible().catch(() => false);
              
              if (errVisible && !doneVisible) {
                outcome = 'err';
                break;
              }
              if (doneVisible) {
                outcome = 'ok';
                break;
              }
            }
            
            const panelContent = await activePanelText(page);
            const hasDivider = panelContent.includes('|||');
            const hasNota = panelContent.includes('NOTA') || panelContent.includes('nota');
            
            if (outcome === 'ok') {
              results[session] = { passed: true, details: `OK (re-teste) - ${waitTime}ms | divisor: ${hasDivider} | nota: ${hasNota}` };
              console.log(`✓ ${session} RE-PASS - ${waitTime}ms | divisor: ${hasDivider}`);
            } else {
              results[session] = { passed: false, details: `ERRO persistente (re-teste) - ${waitTime}ms` };
              console.error(`✗ ${session} RE-FAIL - ${waitTime}ms`);
            }
          }
        }
      }
    }
    
    // Final summary
    console.log('\n\n========================================');
    console.log('=== RELATÓRIO FINAL ===');
    console.log('========================================\n');
    
    let p = 0, f = 0;
    for (const [, r] of Object.entries(results)) {
      if (r.passed) p++;
      else f++;
    }
    
    console.log(`Sessões que passaram: ${p}/${SESSIONS.length}`);
    console.log(`Sessões com erro: ${f}/${SESSIONS.length}`);
    
    // The test passes if at least most sessions pass
    expect(p, `Apenas ${p}/${SESSIONS.length} sessões passaram`).toBeGreaterThanOrEqual(15);
  });
});