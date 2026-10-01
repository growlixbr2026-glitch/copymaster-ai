import { callAI } from '../core/aiClient';
import { dnaCacheKey } from './modelDna';

export interface SiteDna {
    layout: string;
    grid: string;
    typography: string;
    palette: string;
    components: string;
    spacing: string;
    motion: string;
    avoid: string;
}

const CACHE_PREFIX = 'copymaster_sitedna:v1:';

function getCached(key: string): SiteDna | null {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as SiteDna;
    } catch { return null; }
}

function setCached(key: string, dna: SiteDna): void {
    try { sessionStorage.setItem(key, JSON.stringify(dna)); } catch {}
}

const SITE_ANALYZER_PROMPT = `
You are a vision analyst for marketing websites and landing pages. Look at the attached SITE screenshot
and extract its SITE DNA as JSON ONLY: {"layout":"...","grid":"...","typography":"...",
"palette":"...","components":"...","spacing":"...","motion":"...","avoid":"..."}.
Rules: describe observable facts (hero structure left/right/centered, section rhythm, nav style,
headline font style + hierarchy, button shapes, palette as hex when readable else color names,
card style, whitespace density, imagery type, visible motion cues).
NEVER transcribe body copy, logos, watermarks or personal data — structure and style only.
Technical ENGLISH, short phrases. JSON only, no markdown.
`.trim();

const SITE_DNA_SCHEMA = {
    type: 'object',
    properties: {
        layout: { type: 'string' },
        grid: { type: 'string' },
        typography: { type: 'string' },
        palette: { type: 'string' },
        components: { type: 'string' },
        spacing: { type: 'string' },
        motion: { type: 'string' },
        avoid: { type: 'string' },
    },
};

// PASS A — analisa 1× por screenshot (cache sessionStorage por hash + sufixo :site).
// Visão pixel-a-pixel SÓ existe no ramo Gemini (único que envia `images`);
// forçar outro provider geraria DNA alucinado sem pixels. Sem chave Gemini,
// o callAI falha rápido com erro honesto ("Chave GEMINI não configurada"),
// e a UI orienta a usar o scrape da URL ou cadastrar a chave.
export async function analyzeSiteImage(imageBase64: string): Promise<{ dna?: SiteDna; cached: boolean; error?: string }> {
    if (!imageBase64) return { cached: false, error: 'Sem screenshot do site.' };
    const key = `${dnaCacheKey(imageBase64)}:site`;
    const hit = getCached(key);
    if (hit && hit.layout) return { dna: hit, cached: true };
    try {
        const r = await callAI(SITE_ANALYZER_PROMPT, 'You are a vision analyst. Reply with the requested JSON only.', 'gemini-3-flash-preview', undefined, {
            images: [imageBase64],
            taskType: 'text',
            responseMimeType: 'application/json',
            responseSchema: SITE_DNA_SCHEMA,
            provider: 'gemini',
        });
        if ((r as any).error) return { cached: false, error: (r as any).error };
        const parsed = JSON.parse((r.text || '{}').replace(/```json|```/g, '').trim());
        const dna: SiteDna = {
            layout: String(parsed.layout || '').slice(0, 300),
            grid: String(parsed.grid || '').slice(0, 300),
            typography: String(parsed.typography || '').slice(0, 300),
            palette: String(parsed.palette || '').slice(0, 300),
            components: String(parsed.components || '').slice(0, 300),
            spacing: String(parsed.spacing || '').slice(0, 300),
            motion: String(parsed.motion || '').slice(0, 300),
            avoid: String(parsed.avoid || 'purple gradients, generic stock smiles, lorem ipsum').slice(0, 300),
        };
        if (!dna.layout) return { cached: false, error: 'Análise vazia.' };
        setCached(key, dna);
        return { dna, cached: false };
    } catch (e: any) {
        return { cached: false, error: String(e?.message || e).slice(0, 160) };
    }
}

export interface SiteScrape {
    url: string;
    title: string;
    description: string;
    headings: string[];
    text: string;
}

// Bloco SITE_DNA injetado no prompt do PRD (PT-BR p/ o dono, tokens EN p/ a plataforma).
// Precedência: DNA extraído > overrides manuais > Automático (decidida no componente).
export function buildSiteDnaBlock(dna: SiteDna | null, scrape: SiteScrape | null, overrides: { visualStyle?: string; bgColor?: string; fontColor?: string; texture?: string }): string {
    const lines: string[] = ['SITE_DNA (fonte de verdade visual — aplicar em TODO o PRD):'];
    if (dna) {
        lines.push(`Layout: ${dna.layout}. Grid: ${dna.grid}. Tipografia: ${dna.typography}. Paleta: ${dna.palette}.`);
        lines.push(`Componentes: ${dna.components}. Espaçamento: ${dna.spacing}. Motion: ${dna.motion}.`);
        lines.push(`EVITAR (negative prompt): ${dna.avoid}.`);
    }
    if (scrape) {
        if (scrape.title) lines.push(`Site ref título: ${scrape.title}.`);
        if (scrape.description) lines.push(`Site ref descrição: ${scrape.description}.`);
        if (scrape.headings?.length) lines.push(`Hierarquia do ref: ${scrape.headings.slice(0, 8).join(' | ')}.`);
    }
    const ov: string[] = [];
    if (overrides.visualStyle) ov.push(`estilo ${overrides.visualStyle}`);
    if (overrides.bgColor) ov.push(`fundo ${overrides.bgColor}`);
    if (overrides.fontColor) ov.push(`texto ${overrides.fontColor}`);
    if (overrides.texture) ov.push(`textura ${overrides.texture}`);
    if (ov.length) lines.push(`Overrides manuais (só valem onde o DNA não definiu): ${ov.join(', ')}.`);
    if (!dna && !scrape && !ov.length) lines.push('(sem referência — usar Automático de alta conversão).');
    lines.push('```json\n{ "colors": { "primary": "<extrair do DNA>", "accent": "<extrair do DNA>", "bg": "<extrair do DNA>", "text": "<extrair do DNA>", "border": "<extrair do DNA>" }, "typography": { "head": "<extrair do DNA>", "body": "Inter 400" } }\n```');
    return lines.join('\n');
}
