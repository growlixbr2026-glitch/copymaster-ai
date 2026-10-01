import { callAI } from '../../core/aiClient';
import { generateIdeaSessionService } from '../strategy/ideas';
import { generateCopyService } from '../copy/general';
import { generateNotebookLMService } from '../strategy/notebook';
import { generatePersonasService } from '../strategy/personas';
import { generateEmailSequenceService } from '../copy/email';
import { generateVSLService } from '../copy/vsl';
import { generateLandingPageService } from '../copy/landingPage';
import { generateAdsService } from '../copy/ads';
import { generateSexyCanvasService } from '../strategy/sexyCanvas';
import { generateTikTokService } from '../social/tiktok';
import { generateReelsService } from '../social/reels';
import { generateYouTubeService } from '../social/youtube';
import { generateCarouselService } from '../social/carousel';
import { generateLogoBriefService } from '../visual/logo';
import { generateMagazineCoverService } from '../visual/magazine';
import { generateQuoteCardService } from '../social/quote';
import { generateCitationService } from '../social/citation';
import { generateLetteringService } from '../visual/lettering';
import { generateComicService } from '../creative/comic';
import { generateMemeService } from '../social/meme';
import { generateInfographicService, generatePresentationService } from '../creative/presentation';
import { generateArticleService } from '../copy/article';
import { generatePRDService } from '../copy/prd';

export interface AuditCriterion {
    id: string;
    label: string;
    passed: boolean;
    impact: number;
    details: string;
}

export interface StressTestResult {
    module: string;
    moduleLabel: string;
    category: string;
    status: 'passed' | 'failed' | 'warning';
    complianceScore: number;
    criteria: AuditCriterion[];
    rawOutput: string;
    latency: number;
    purposeValidation: {
        intended: string;
        adherenceScore: number;
        reasoning: string;
    };
}

export type AuditMode = 'rapida' | 'completa';

// Normaliza para comparação insensível a acentos/caixa ("não" == "NAO" == "não").
const normalizeText = (s: string): string =>
    (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

interface AuditContext {
    raw: string;
    content: string;
    note: string;
    normalized: string;
}

type CheckFn = (ctx: AuditContext) => { passed: boolean; details: string };
interface CheckDef { id: string; label: string; impact: number; run: CheckFn; }

// Checagens compartilhadas (mesma régua para todas as sessões).
const sharedNoGreeting = (impact = 15): CheckDef => ({
    id: 'no_greeting',
    label: 'SEM SAUDAÇÃO (PRAGMATISMO)',
    impact,
    run: ({ normalized }) => {
        const head = normalized.trim().slice(0, 40);
        const bad = ['olá', 'ola', 'claro', 'aqui está', 'aqui esta', 'entendido', 'pois não', 'pois nao'].some((w) => head.includes(normalizeText(w)));
        return { passed: !bad, details: bad ? 'Saudação nos primeiros 40 caracteres.' : 'Vai direto ao conteúdo.' };
    },
});

const sharedHasContent = (min = 50, impact = 10): CheckDef => ({
    id: 'has_content',
    label: 'CONTEÚDO ENTREGUE',
    impact,
    run: ({ content }) => ({
        passed: content.trim().length >= min,
        details: content.trim().length >= min ? `${content.trim().length} caracteres úteis.` : 'Resposta vazia ou curta demais.',
    }),
});

const sharedNoNoteLeak = (impact = 15): CheckDef => ({
    id: 'note_isolated',
    label: 'NOTA ISOLADA DO ENTREGÁVEL',
    impact,
    run: ({ content }) => {
        // Divisores bem-formados |||X_DIVIDER||| são legítimos; o bug real é
        // nota ou fragmentos vazados no entregável (o que o usuário copia).
        const stripped = content
            .replace(/\|\|\|[A-Z_]*DIVIDER\|\|\|/gi, '')
            .replace(/\|\|\|[A-Z_]+\|\|\|/g, '');
        const leak = /NOTA DO ESTRATEGISTA/i.test(stripped) || /\|/.test(stripped) || /DIVIDER/i.test(stripped);
        return { passed: !leak, details: leak ? 'Nota ou fragmentos ||| vazados no entregável.' : 'Entregável limpo, nota separada.' };
    },
});

const sharedMarker = (marker: string, impact = 25, what = 'seletor', alts: string[] = []): CheckDef => ({
    id: 'selector_marker',
    label: `SELETOR RESPEITADO (${marker})`,
    impact,
    run: ({ raw }) => {
        const norm = normalizeText(raw);
        const candidates = [marker, ...alts];
        const found = candidates.some((m) => norm.includes(normalizeText(m)));
        return { passed: found, details: found ? `Marcador do ${what} presente na saída.` : `Nenhum de [${candidates.join(' | ')}] na saída — seletor ignorado.` };
    },
});

const sharedDivider = (names: string[], impact = 15): CheckDef => ({
    id: 'divider',
    label: 'DIVISOR TÉCNICO EXATO',
    impact,
    run: ({ raw }) => {
        const found = names.some((n) => raw.includes(n));
        return { passed: found, details: found ? 'Divisor técnico presente e exato.' : `Nenhum destes divisores: ${names.join(', ')}.` };
    },
});

interface ModuleDef {
    label: string;
    category: string;
    expectedPurpose: string;
    run: (language: string) => Promise<{ raw: string; error?: string }>;
    checks: CheckDef[];
}

const checkLen = (min: number, impact: number, label: string): CheckDef => ({
    id: 'purpose_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    label,
    impact,
    run: ({ content }) => ({ passed: content.trim().length >= min, details: `${content.trim().length} caracteres (mínimo ${min}).` }),
});

const containsAll = (needles: string[], impact: number, label: string): CheckDef => ({
    id: 'purpose_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
    label,
    impact,
    run: ({ normalized }) => {
        const missing = needles.filter((n) => !normalized.includes(normalizeText(n)));
        return { passed: missing.length === 0, details: missing.length === 0 ? 'Todos os elementos estruturais presentes.' : 'Ausente: ' + missing.join(', ') };
    },
});

const MARK = 'ZAFRA-42';
const LG = (language: string) => language;
const CTX = `PRODUTO: Café ${MARK}. Venda o Café ${MARK} para baristas. Café especial em grãos, torra clara premium. O nome do produto, Café ${MARK}, deve aparecer no texto.`;

const MODULES: Record<string, ModuleDef> = {
    ideas: {
        label: 'Sessão de Ideias', category: 'Estratégia',
        expectedPurpose: 'Plano de conteúdo em JSON válido: tendências, hashtags e 6 ideias (2 por estágio de funil).',
        run: async (language) => {
            const r = await generateIdeaSessionService(`café especial ${MARK}`, language);
            const d = (r as any).data;
            // Orquestradora paralela pode trazer erro parcial com dados úteis.
            if ((r as any).error && !(d?.contentIdeas?.length || d?.trends?.length)) return { raw: '', error: (r as any).error };
            return { raw: JSON.stringify(d || {}) };
        },
        checks: [
            { id: 'json_valid', label: 'JSON VÁLIDO', impact: 20, run: ({ raw }) => { try { JSON.parse(raw); return { passed: true, details: 'JSON parseável.' }; } catch { return { passed: false, details: 'JSON inválido ou vazio.' }; } } },
            { id: 'has_trends', label: 'TENDÊNCIAS + IDEIAS', impact: 25, run: ({ raw }) => { try { const d = JSON.parse(raw); const ok = Array.isArray(d.trends) && d.trends.length >= 1 && Array.isArray(d.contentIdeas) && d.contentIdeas.length >= 1; return { passed: ok, details: ok ? `${d.trends.length} trends, ${d.contentIdeas.length} ideias.` : 'Faltam trends ou contentIdeas.' }; } catch { return { passed: false, details: 'Sem JSON para avaliar.' }; } } },
            sharedMarker('café', 20, 'nicho'),
            sharedHasContent(100, 15),
            { id: 'stages', label: 'ESTÁGIOS DE FUNIL', impact: 20, run: ({ normalized }) => { const ok = normalized.includes('topo') && normalized.includes('fundo'); return { passed: ok, details: ok ? 'Topo e fundo presentes.' : 'Estágios de funil ausentes.' }; } },
        ],
    },
    copy: {
        label: 'Copywriting Pro', category: 'Estratégia',
        expectedPurpose: '2 variações de copy em texto puro, sem saudações, com o briefing refletido.',
        run: async (language) => {
            const r = await generateCopyService({ platform: 'Instagram', type: 'Imagem Estática', objective: 'vender', funnelStage: 'Fundo de Funil (Conversão)', briefingType: 'ideia', briefingContent: CTX, tones: ['Direto'], methodology: 'AIDA', mentalTriggers: [], language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [sharedNoGreeting(15), sharedDivider(['|||DIVIDER|||'], 15), sharedMarker(MARK, 25, 'briefing'), sharedHasContent(50, 15), sharedNoNoteLeak(15), checkLen(100, 15, 'CORPO MÍNIMO')],
    },
    notebook: {
        label: 'NotebookLM Studio', category: 'Estratégia',
        expectedPurpose: 'Conteúdo fonte estruturado com divisor técnico.',
        run: async (language) => {
            const r = await generateNotebookLMService({ mode: 'resumo', objective: `estudar fotossíntese ${MARK}`, context: `Fotossíntese em plantas ${MARK}.`, language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [sharedNoGreeting(15), sharedDivider(['|||NOTA_DIVIDER|||'], 15), sharedMarker(MARK, 25, 'contexto'), sharedHasContent(50, 15), sharedNoNoteLeak(15), checkLen(120, 15, 'DENSIDADE')],
    },
    personas: {
        label: 'Personas', category: 'Estratégia',
        expectedPurpose: 'Personas em JSON com nome, dores e vocabulário do nicho.',
        run: async (language) => {
            const r = await generatePersonasService({ form: { niche: `cafeterias ${MARK}`, product: 'café especial' }, quantity: 1, language });
            const list = (r as any).personas || [];
            return { raw: JSON.stringify(list) };
        },
        checks: [
            { id: 'has_persona', label: 'PERSONA GERADA', impact: 30, run: ({ raw }) => { try { const l = JSON.parse(raw); const ok = Array.isArray(l) && l.length > 0 && !!l[0].name; return { passed: ok, details: ok ? `Persona "${l[0].name}".` : 'Nenhuma persona com nome.' }; } catch { return { passed: false, details: 'JSON inválido.' }; } } },
            sharedMarker('cafeteria', 25, 'nicho'),
            { id: 'fields', label: 'CAMPOS PSICOGRÁFICOS', impact: 25, run: ({ normalized }) => { const ok = normalized.includes('audience') && normalized.includes('tone'); return { passed: ok, details: ok ? 'Audience + tone presentes.' : 'Campos ausentes.' }; } },
            sharedHasContent(100, 20),
        ],
    },
    email: {
        label: 'Email Marketing', category: 'Vendas',
        expectedPurpose: 'Sequência com Assunto/Corpo e divisor entre e-mails.',
        run: async (language) => {
            const r = await generateEmailSequenceService({ count: 2, type: 'abandono', tone: 'Direto', targetAudience: 'baristas', context: CTX, language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [sharedNoGreeting(15), sharedDivider(['|||EMAIL_DIVIDER|||'], 15), sharedMarker(MARK, 20, 'contexto'), containsAll(['assunto'], 20, 'ESTRUTURA ASSUNTO/CORPO'), sharedHasContent(80, 15), sharedNoNoteLeak(15)],
    },
    vsl: {
        label: 'Roteiro VSL', category: 'Vendas',
        expectedPurpose: 'Fala pura de teleprompter, sem rótulos de cena.',
        run: async (language) => {
            const r = await generateVSLService({ framework: 'AIDA', productName: `Café ${MARK}`, uniqueMechanism: 'torra clara premium', mainPain: 'clientes sumindo', offer: 'clube de assinatura', guarantee: '7 dias', context: CTX, language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [
            sharedMarker(MARK, 25, 'produto'),
            { id: 'pure_speech', label: 'FALA PURA', impact: 30, run: ({ content }) => { const bad = /\[?cena\s*\d/i.test(content) || /corta para/i.test(content); return { passed: !bad, details: bad ? 'Rótulos de cena presentes.' : 'Sem rótulos de cena.' }; } },
            sharedHasContent(80, 15), sharedNoNoteLeak(15), checkLen(150, 15, 'CORPO MÍNIMO'),
        ],
    },
    lp: {
        label: 'Landing Pages', category: 'Vendas',
        expectedPurpose: 'Arquitetura CRO com Hero e mecanismo único.',
        run: async (language) => {
            const r = await generateLandingPageService({ productName: `Café ${MARK}`, targetAudience: 'baristas', promise: 'café premiado', offer: 'kit degustação', context: CTX, style: 'Moderno', framework: 'AIDA', language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [sharedMarker(MARK, 25, 'produto'), containsAll(['hero'], 25, 'SEÇÃO HERO'), sharedHasContent(100, 15), sharedNoNoteLeak(15), checkLen(200, 20, 'ARQUITETURA COMPLETA')],
    },
    ads: {
        label: 'Gestor de Ads', category: 'Vendas',
        expectedPurpose: 'Variações A/B separadas por divisor.',
        run: async (language) => {
            const r = await generateAdsService({ platform: 'Meta Ads', goal: 'vendas', productName: `Café ${MARK}`, context: CTX, language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [sharedMarker(MARK, 25, 'produto'), sharedDivider(['|||ADS_DIVIDER|||'], 20), sharedHasContent(80, 15), sharedNoNoteLeak(15), checkLen(150, 25, 'VARIAÇÕES')],
    },
    sexy: {
        label: 'Sexy Canvas', category: 'Vendas',
        expectedPurpose: 'Copy visceral focada exclusivamente no pecado Gula.',
        run: async (language) => {
            const r = await generateSexyCanvasService('Gula', CTX, language);
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [sharedMarker('gula', 25, 'pecado'), sharedDivider(['|||NOTA_DIVIDER|||'], 15), sharedHasContent(50, 15), sharedNoNoteLeak(15), checkLen(100, 30, 'VISCERALIDADE')],
    },
    tiktok: {
        label: 'TikTok Studio', category: 'Social',
        expectedPurpose: 'Roteiro com gancho imediato, sem apresentação.',
        run: async (language) => {
            const r = await generateTikTokService({ mode: 'viral_script', duration: 30, context: CTX, language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [sharedMarker('café', 25, 'contexto'), sharedHasContent(80, 20), sharedNoNoteLeak(15), checkLen(150, 25, 'ROTEIRO'), sharedNoGreeting(15)],
    },
    reels: {
        label: 'Reels Studio', category: 'Social',
        expectedPurpose: 'Roteiro curto e direto para Reels.',
        run: async (language) => {
            const r = await generateReelsService({ mode: 'viral_script', duration: 30, context: CTX, language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [sharedMarker('café', 25, 'contexto'), sharedHasContent(80, 20), sharedNoNoteLeak(15), checkLen(150, 25, 'ROTEIRO'), sharedNoGreeting(15)],
    },
    youtube: {
        label: 'YouTube Studio', category: 'Social',
        expectedPurpose: 'Roteiro: gancho nos primeiros 30 segundos.',
        run: async (language) => {
            const r = await generateYouTubeService({ type: 'script', duration: 60, context: CTX, language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [sharedMarker('café', 25, 'contexto'), sharedHasContent(80, 20), sharedNoNoteLeak(15), checkLen(150, 25, 'ROTEIRO'), sharedNoGreeting(15)],
    },
    carousel: {
        label: 'Carrossel Maker', category: 'Design',
        expectedPurpose: '3 lâminas com copy + prompt visual cada.',
        run: async (language) => {
            const r = await generateCarouselService({ slideCount: 3, style: 'Premium', platform: 'Instagram', context: CTX, hook: `Erros do café ${MARK}`, footer: '@auditprobe', aiModel: 'Midjourney v6', language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [
            sharedMarker(MARK, 20, 'gancho'),
            { id: 'slides', label: '3 LÂMINAS', impact: 30, run: ({ raw }) => { const n = raw.split('|||SLIDE_DIVIDER|||').length; return { passed: n >= 3, details: `${n} bloco(s) por divisor.` }; } },
            sharedHasContent(100, 15), checkLen(300, 20, 'NARRATIVA'), sharedNoGreeting(15),
        ],
    },
    logo: {
        label: 'Logo & Brand', category: 'Design',
        expectedPurpose: '2 conceitos vetoriais com a marca e o nicho.',
        run: async (language) => {
            const r = await generateLogoBriefService({ brandName: `Padaria ${MARK}`, niche: 'padaria artesanal', archetype: 'Criador', style: 'Minimalista', artistInfluence: 'Paul Rand', designerStyle: 'Paul Rand', context: 'padaria artesanal', aiModel: 'Midjourney v6', language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [sharedMarker(MARK, 25, 'marca'), sharedDivider(['|||LOGO_OPTION_DIVIDER|||'], 20), sharedHasContent(80, 15), checkLen(150, 25, 'CONCEITOS'), sharedNoGreeting(15)],
    },
    magazine: {
        label: 'Autoridade Visual', category: 'Design',
        expectedPurpose: 'Prompt editorial em inglês com Regra #6 e headline.',
        run: async (language) => {
            // PNG 1x1: prova o caminho COM referência (Regra #6 condicional).
            const tinyRef = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
            const r = await generateMagazineCoverService({ magazine: 'Forbes', headline: `O MESTRE ${MARK}`, subheadline: 'Como venceu', footerText: 'ED 2026', mood: 'Poderoso', context: 'Retrato de barista, avental escuro.', aiModel: 'Midjourney v6', referenceImages: [tinyRef], referenceMode: 'high_fidelity', language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [
            sharedMarker(MARK, 25, 'manchete'),
            { id: 'rule6', label: 'REGRA #6 + INGLÊS', impact: 30, run: ({ raw }) => { const ok = raw.includes('Usar a imagem em anexo para compor a imagem gerada'); return { passed: ok, details: ok ? 'Frase Regra #6 exata.' : 'Frase Regra #6 ausente.' }; } },
            sharedHasContent(80, 15), checkLen(150, 20, 'PROMPT'), sharedNoGreeting(10),
        ],
    },
    quote: {
        label: 'Gerador de Frases', category: 'Design',
        expectedPurpose: '2+ quote cards separados por divisor.',
        run: async (language) => {
            const r = await generateQuoteCardService({ count: 2, style: 'Minimalista', context: `café e foco ${MARK}`, language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [
            { id: 'options', label: '2+ OPÇÕES', impact: 35, run: ({ raw }) => { const n = raw.split('|||QUOTE_DIVIDER|||').length; const blocks = raw.split(/\n\s*\n/).filter((s) => s.trim().length > 20).length; return { passed: n >= 2 || blocks >= 2, details: `${n} por divisor, ${blocks} blocos.` }; } },
            sharedHasContent(50, 20), sharedMarker('café', 20, 'tema', ['coffee']), sharedNoNoteLeak(10), sharedNoGreeting(15),
        ],
    },
    citation: {
        label: 'Citações Verificadas', category: 'Design',
        expectedPurpose: 'Citações reais com atribuição autor — obra, separadas por divisor próprio.',
        run: async (language) => {
            const r = await generateCitationService({ count: 2, style: 'Minimalista', area: 'Filosofia', author: 'Sêneca', tone: 'Sábio / Estoico', source: 'Fala do autor', showAuthor: true, context: `disciplina ${MARK}`, language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [
            sharedDivider(['|||CITATION_DIVIDER|||'], 20),
            sharedMarker(MARK, 20, 'contexto'),
            { id: 'author_kept', label: 'AUTOR RESPEITADO', impact: 20, run: ({ normalized }) => { const ok = normalized.includes('seneca'); return { passed: ok, details: ok ? 'Sêneca presente na saída.' : 'Autor Sêneca ausente — seletor ignorado.' }; } },
            sharedHasContent(80, 20), sharedNoNoteLeak(15), sharedNoGreeting(15),
            containsAll(['—'], 15, 'ATRIBUIÇÃO AUTOR — OBRA'),
        ],
    },
    lettering: {
        label: 'Lettering', category: 'Design',
        expectedPurpose: 'Prompt tipográfico com a frase exata e divisor.',
        run: async (language) => {
            const r = await generateLetteringService({ text: `Café ${MARK}`, technique: 'Neon', surface: 'Parede', style: 'Neon', composition: 'Centralizado', footer: '@auditprobe', aiModel: 'Midjourney v6', aspectRatio: '1:1', context: 'arte de cafeteria', language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [sharedMarker(MARK, 30, 'frase exata'), sharedDivider(['|||LETTERING_DIVIDER|||'], 20), sharedHasContent(80, 15), checkLen(150, 20, 'PROMPT'), sharedNoGreeting(15)],
    },
    comic: {
        label: 'HQ & Quadrinhos', category: 'Design',
        expectedPurpose: 'Roteiro com PAINEL/AÇÃO/DIÁLOGO/PROMPT IA.',
        run: async (language) => {
            const r = await generateComicService({ style: 'Mangá', layout: '4 quadros', context: `Barista herói ${MARK} salva a cafeteria.`, aiModel: 'Midjourney v6', language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [sharedMarker(MARK, 20, 'enredo'), containsAll(['painel'], 30, 'ESTRUTURA PAINEL'), sharedHasContent(100, 15), checkLen(200, 20, 'ROTEIRO'), sharedNoGreeting(15)],
    },
    meme: {
        label: 'Fábrica de Memes', category: 'Design',
        expectedPurpose: 'Legenda PT aderente à dor + prompt visual + watermark.',
        run: async (language) => {
            const r = await generateMemeService({ context: `vendedor sem prospecção ${MARK}`, style: 'Fotográfico', format: 'Comparativo (Drake)', footer: '@auditprobe42', platform: 'Instagram (Feed)', aspectRatio: '1:1', aiModel: 'Midjourney v6', language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [
            sharedMarker('@auditprobe42', 25, 'rodapé/watermark'),
            sharedMarker('prospecção', 20, 'dor'),
            sharedDivider(['|||MEME_DIVIDER|||'], 15),
            sharedHasContent(80, 15), sharedNoNoteLeak(15), checkLen(120, 10, 'OPÇÕES'),
        ],
    },
    infographic: {
        label: 'Infográfico', category: 'Design',
        expectedPurpose: 'Estrutura com dados e hierarquia visual.',
        run: async (language) => {
            const r = await generateInfographicService({ context: `Café especial ${MARK}: produção e consumo.`, language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [sharedMarker(MARK, 25, 'tema'), sharedHasContent(80, 20), sharedNoNoteLeak(15), checkLen(150, 25, 'ESTRUTURA'), sharedNoGreeting(15)],
    },
    article: {
        label: 'Redator Artigos', category: 'Geral',
        expectedPurpose: 'Artigo com Schema JSON-LD.',
        run: async (language) => {
            const r = await generateArticleService({ context: `Café especial ${MARK}`, language, writerStyle: 'Jornalístico' });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [sharedMarker(MARK, 20, 'tema'), sharedDivider(['|||SCHEMA_DIVIDER|||'], 25), sharedHasContent(100, 15), checkLen(200, 25, 'ARTIGO'), sharedNoGreeting(15)],
    },
    ppt: {
        label: 'Apresentação', category: 'Geral',
        expectedPurpose: 'Slides numerados com conteúdo e visual.',
        run: async (language) => {
            const r = await generatePresentationService({ platform: 'Investidores', slideCount: 3, audience: 'investidores', style: 'Moderno', context: `Café especial ${MARK}`, language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [
            sharedMarker(MARK, 20, 'tema'),
            { id: 'slides', label: 'SLIDES NUMERADOS', impact: 30, run: ({ raw }) => { const n = (raw.match(/SLIDE\s*0?\d/gi) || []).length; return { passed: n >= 2, details: `${n} marcadores de slide.` }; } },
            sharedHasContent(100, 15), checkLen(200, 20, 'ROTEIRO'), sharedNoGreeting(15),
        ],
    },
    prd: {
        label: 'PRD Vibe Studio', category: 'Estratégia',
        expectedPurpose: 'PRD estático executável em PT-BR com tokens e critérios de aceite.',
        run: async (language) => {
            const r = await generatePRDService({ businessName: `Studio ${MARK}`, niche: 'estética premium', promise: 'pele de vidro em 30 dias', audience: 'mulheres 28-45', prdType: 'LP Conversão', sections: ['Hero', 'Prova Social', 'CTA Final'], context: CTX, language });
            return { raw: (r as any).text || '', error: (r as any).error };
        },
        checks: [sharedMarker(MARK, 25, 'negócio'), sharedDivider(['|||PRD_DIVIDER|||'], 20), containsAll(['tokens'], 15, 'TOKENS JSON'), sharedHasContent(100, 15), sharedNoNoteLeak(15), checkLen(200, 20, 'PRD COMPLETO'), sharedNoGreeting(15)],
    },
};

async function runJudge(output: string, expectedPurpose: string): Promise<{ adherenceScore: number; reasoning: string }> {
    const validationResponse = await callAI(
        `META-AUDITOR: avalie se a SAÍDA cumpre o PROPÓSITO (0-100 + justificativa curta). PROPÓSITO: ${expectedPurpose}. SAÍDA: ${output.slice(0, 3000)}. Responda APENAS JSON: {"adherenceScore": N, "reasoning": "..."}`,
        'Você é um meta-auditor de IA. Responda apenas com o JSON solicitado.',
        'gemini-3-flash-preview',
        undefined,
        { responseMimeType: 'application/json' }
    );
    try {
        if (validationResponse.text) {
            const p = JSON.parse(validationResponse.text);
            const s = Math.max(0, Math.min(100, Number(p.adherenceScore) || 0));
            return { adherenceScore: s, reasoning: String(p.reasoning || '').slice(0, 200) };
        }
    } catch {}
    return { adherenceScore: 0, reasoning: 'Falha na meta-auditoria (JSON inválido).' };
}

export const AUDIT_MODULE_IDS = Object.keys(MODULES);

export const runStressTestService = async (moduleId: string, language: string, mode: AuditMode = 'rapida'): Promise<StressTestResult> => {
    const def = MODULES[moduleId] || MODULES['copy'];
    const start = Date.now();
    let raw = '';
    let serviceError: string | undefined;

    try {
        const r = await def.run(language);
        raw = r.raw || '';
        serviceError = r.error;
    } catch (e: any) {
        serviceError = e?.message || 'Erro desconhecido na auditoria.';
    }

    const failAll = (details: string): StressTestResult => ({
        module: moduleId,
        moduleLabel: def.label,
        category: def.category,
        status: 'failed',
        complianceScore: 0,
        criteria: def.checks.map((c) => ({ id: c.id, label: c.label, passed: false, impact: c.impact, details })),
        rawOutput: serviceError || '(vazio)',
        latency: Date.now() - start,
        purposeValidation: { intended: def.expectedPurpose, adherenceScore: 0, reasoning: details },
    });

    if (serviceError || raw.trim().length === 0) {
        return failAll(serviceError ? `Falha no serviço: ${serviceError.slice(0, 150)}` : 'Serviço retornou vazio.');
    }

    const content = raw.split(/\|\|\|NOTE?_DIVIDER\|\|\|/i)[0].trim() || raw.trim();
    const note = (raw.split(/\|\|\|NOTE?_DIVIDER\|\|\|/i)[1] || '').trim();
    const ctx: AuditContext = { raw, content, note, normalized: normalizeText(content) };

    const criteria: AuditCriterion[] = def.checks.map((c) => {
        try {
            const r = c.run(ctx);
            return { id: c.id, label: c.label, passed: r.passed, impact: c.impact, details: r.details };
        } catch (e: any) {
            return { id: c.id, label: c.label, passed: false, impact: c.impact, details: 'Erro no assert: ' + String(e?.message || e).slice(0, 80) };
        }
    });

    let adherence = Math.round(criteria.reduce((a, c) => a + (c.passed ? c.impact : 0), 0));
    let reasoning = 'Avaliação determinística sobre o serviço real (sem juiz LLM).';
    if (mode === 'completa') {
        const j = await runJudge(content, def.expectedPurpose);
        adherence = Math.round(adherence * 0.7 + j.adherenceScore * 0.3);
        reasoning = `Determinística + juiz LLM (${j.adherenceScore}): ${j.reasoning}`;
    }

    const complianceScore = criteria.reduce((a, c) => a + (c.passed ? c.impact : 0), 0);

    return {
        module: moduleId,
        moduleLabel: def.label,
        category: def.category,
        status: complianceScore >= 90 ? 'passed' : complianceScore >= 60 ? 'warning' : 'failed',
        complianceScore,
        criteria,
        rawOutput: raw,
        latency: Date.now() - start,
        purposeValidation: { intended: def.expectedPurpose, adherenceScore: adherence, reasoning },
    };
};
