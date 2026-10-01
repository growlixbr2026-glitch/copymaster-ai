import { callAI } from '../core/aiClient';

export interface ModelDna {
    layout: string;
    typography: string;
    palette: string;
    lightTexture: string;
    composition: string;
    avoid: string;
}

const CACHE_PREFIX = 'copymaster_modeldna:v1:';

export function dnaCacheKey(base64: string): string {
    let h = 0;
    const s = base64.slice(-4000) + '|' + base64.length;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    return `${CACHE_PREFIX}${(h >>> 0).toString(36)}`;
}

function getCached(key: string): ModelDna | null {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as ModelDna;
    } catch { return null; }
}

function setCached(key: string, dna: ModelDna): void {
    try { sessionStorage.setItem(key, JSON.stringify(dna)); } catch {}
}

function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Imagem ilegível.'));
        img.src = src;
    });
}

const hex = (r: number, g: number, b: number) =>
    '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');

// ---------- Extrator puro (testável em node com pixels sintéticos) ----------
export interface PixelGrid { w: number; h: number; data: ArrayLike<number>; ratio: number; }

const lumOf = (r: number, g: number, b: number) => 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
const contrastRatio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const dist3 = (a: number[], b: number[]) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

export interface PalettePick { bg: string; text: string; accents: string[]; ratio: number; }

// Fundo = maior bucket; texto = maior contraste (ratio≥4.5, ≥2% pixels) — nunca iguais.
export function pickPalette(grid: PixelGrid): PalettePick {
    const { w, h, data } = grid;
    const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
    const total = w * h;
    for (let i = 0; i < total; i++) {
        const o = i * 4;
        const k = `${data[o] >> 5},${data[o + 1] >> 5},${data[o + 2] >> 5}`;
        const e = buckets.get(k) || { n: 0, r: 0, g: 0, b: 0 };
        e.n++; e.r += data[o]; e.g += data[o + 1]; e.b += data[o + 2];
        buckets.set(k, e);
    }
    const list = [...buckets.values()].map((e) => ({
        n: e.n, rgb: [e.r / e.n, e.g / e.n, e.b / e.n] as number[],
        lum: lumOf(e.r / e.n, e.g / e.n, e.b / e.n),
    })).sort((a, b) => b.n - a.n);
    const bg = list[0];
    const bgHex = hex(bg.rgb[0], bg.rgb[1], bg.rgb[2]);
    let text = list.find((c, idx) => idx > 0 && c.n / total >= 0.02 && contrastRatio(c.lum, bg.lum) >= 4.5);
    if (!text) {
        // Fallback honesto: preto OU branco, o de maior contraste (nunca igual ao fundo).
        const bw: Array<{ rgb: number[]; lum: number }> = [
            { rgb: [0, 0, 0], lum: 0 },
            { rgb: [255, 255, 255], lum: 1 },
        ];
        const best = bw.sort((a, b) => contrastRatio(b.lum, bg.lum) - contrastRatio(a.lum, bg.lum))[0];
        return { bg: bgHex, text: hex(best.rgb[0], best.rgb[1], best.rgb[2]), accents: list.slice(1, 4).map((c) => hex(c.rgb[0], c.rgb[1], c.rgb[2])), ratio: contrastRatio(best.lum, bg.lum) };
    }
    const accents = list.filter((c) => c !== bg && c !== text && dist3(c.rgb, bg.rgb) > 60 && dist3(c.rgb, (text as { rgb: number[] }).rgb) > 40)
        .slice(0, 3).map((c) => hex(c.rgb[0], c.rgb[1], c.rgb[2]));
    return { bg: bgHex, text: hex(text.rgb[0], text.rgb[1], text.rgb[2]), accents, ratio: contrastRatio(text.lum, bg.lum) };
}

export interface TypeSignals { hand: boolean; textured: boolean; coverage: number; bands: Array<{ top: number; bottom: number }>; align: string; lines: number; density: number }

// Traço→tipografia + geometria das regiões de texto (máscara de contraste vs fundo).
// Hand-lettering varia espessura vertical e comprimento dos traços; tipo limpo é uniforme.
export function analyzeType(grid: PixelGrid, bgLum: number): TypeSignals {
    const { w, h, data } = grid;
    const mask = new Uint8Array(w * h);
    let n = 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            if (contrastRatio(lumOf(data[i], data[i + 1], data[i + 2]), bgLum) >= 1.8) { mask[y * w + x] = 1; n++; }
        }
    }
    // Rugosidade: vizinhança divergente na máscara + CV dos run-lengths por linha.
    let diff = 0; let boundary = 0;
    const runLens: number[] = [];
    for (let y = 0; y < h; y++) {
        let run = 0;
        for (let x = 0; x < w; x++) {
            const v = mask[y * w + x];
            if (v) {
                run++;
                let same = 0; let border = false;
                for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                    const xx = x + dx; const yy = y + dy;
                    if (xx >= 0 && yy >= 0 && xx < w && yy < h && mask[yy * w + xx] === v) same++;
                    else if (!(dx === 0 && dy === 0)) border = true;
                }
                if (border) boundary++;
                diff += (9 - same) / 9;
            } else if (run > 0) { runLens.push(run); run = 0; }
        }
        if (run > 0) runLens.push(run);
    }
    const meanRun = runLens.length ? runLens.reduce((a, b) => a + b, 0) / runLens.length : 0;
    const varRun = runLens.length ? runLens.reduce((a, b) => a + (b - meanRun) ** 2, 0) / runLens.length : 0;
    const cv = meanRun ? Math.sqrt(varRun) / meanRun : 0;
    const rough = n ? diff / n : 0;
    // Espessura vertical: pincel varia altura do traço; barra limpa é uniforme.
    const colLens: number[] = [];
    for (let x = 0; x < w; x++) {
        let run = 0;
        for (let y = 0; y < h; y++) {
            if (mask[y * w + x]) run++;
            else if (run > 0) { colLens.push(run); run = 0; }
        }
        if (run > 0) colLens.push(run);
    }
    const meanCol = colLens.length ? colLens.reduce((a, b) => a + b, 0) / colLens.length : 0;
    const varCol = colLens.length ? colLens.reduce((a, b) => a + (b - meanCol) ** 2, 0) / colLens.length : 0;
    const vcv = meanCol ? Math.sqrt(varCol) / meanCol : 0;
    // Textura do preenchimento: std da luminância dentro da máscara.
    let tMean = 0; let tSq = 0; let tn = 0;
    for (let i = 0; i < w * h; i++) {
        if (!mask[i]) continue;
        const l = lumOf(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
        tMean += l; tSq += l * l; tn++;
    }
    const tStd = tn ? Math.sqrt(Math.max(0, tSq / tn - (tMean / tn) ** 2)) : 0;
    // Bandas: linhas com cobertura >8% agrupadas.
    const bands: Array<{ top: number; bottom: number }> = [];
    let start = -1;
    for (let y = 0; y < h; y++) {
        let row = 0;
        for (let x = 0; x < w; x++) if (mask[y * w + x]) row++;
        if (row / w > 0.08) { if (start < 0) start = y; }
        else if (start >= 0) { bands.push({ top: start / h, bottom: y / h }); start = -1; }
    }
    if (start >= 0) bands.push({ top: start / h, bottom: 1 });
    // Alinhamento pelo centroide x da máscara.
    let sx = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) sx += x;
    const cx = n ? sx / n / w : 0.5;
    return {
        hand: vcv > 0.3 || cv > 0.55 || rough > 0.45,
        textured: tStd > 0.16,
        coverage: n / (w * h),
        bands,
        align: cx > 0.38 && cx < 0.62 ? 'centered' : cx <= 0.38 ? 'left-aligned' : 'right-aligned',
        lines: bands.length,
        density: n ? Math.min(1, boundary / n / 0.6) : 0,
    };
}

export function describeTypography(t: TypeSignals): string {
    const parts = [
        t.hand
            ? 'irregular hand-brushed letterforms, varying stroke weight and baseline, marker/brush feel'
            : 'clean constructed letterforms, uniform stroke, graphic sans feel',
        t.textured ? 'textured/grunge fill' : 'solid flat fill',
        `text block ${t.align}, ~${t.lines} line band(s), ${(t.coverage * 100).toFixed(0)}% ink coverage`,
    ];
    return parts.join('; ');
}

// NÍVEL LOCAL — análise 100% no browser via canvas: paleta por contraste,
// tipografia inferida do traço, geometria das regiões de texto. Sem rede,
// sem chave, qualquer provedor. Não faz OCR — descreve o traço observável.
export async function analyzeModelLocal(imageBase64: string): Promise<{ dna?: ModelDna; error?: string }> {
    try {
        if (typeof document === 'undefined' || typeof Image === 'undefined') {
            return { error: 'Análise local indisponível neste ambiente.' };
        }
        const img = await loadImage(imageBase64);
        const W = 64;
        const H = Math.max(1, Math.min(64, Math.round((64 * img.height) / Math.max(1, img.width))));
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return { error: 'Canvas indisponível.' };
        ctx.drawImage(img, 0, 0, W, H);
        const d = ctx.getImageData(0, 0, W, H).data;
        const grid: PixelGrid = { w: W, h: H, data: d, ratio: img.width / Math.max(1, img.height) };
        const pal = pickPalette(grid);
        const bgL = lumOf(parseInt(pal.bg.slice(1, 3), 16), parseInt(pal.bg.slice(3, 5), 16), parseInt(pal.bg.slice(5, 7), 16));
        const t = analyzeType(grid, bgL);
        const ratio = grid.ratio;
        const ratioLabel = ratio > 1.7 ? 'wide 16:9 horizontal' : ratio > 1.2 ? 'landscape' : ratio > 0.8 ? 'square 1:1' : ratio > 0.6 ? 'vertical 4:5 portrait' : 'tall 9:16 vertical';
        const zone = (b: { top: number; bottom: number }) => `${Math.round(b.top * 100)}–${Math.round(b.bottom * 100)}%`;
        const bandsTxt = t.bands.length ? t.bands.map(zone).join(', ') : 'full-bleed';
        const dna: ModelDna = {
            layout: `quote-text ${ratioLabel}, ${t.align} text bands at ${bandsTxt} (quote upper, author lower), local analysis`,
            typography: describeTypography(t),
            palette: `background ${pal.bg} with text ${pal.text} at contrast ${pal.ratio.toFixed(1)}:1 (WCAG); accents ${pal.accents.join(', ') || 'none detected'}`,
            lightTexture: `${t.textured ? 'textured print feel' : 'clean flat render'}, ink coverage ${(t.coverage * 100).toFixed(0)}%`,
            composition: `proporcao ${ratioLabel}, densidade visual ${Math.round(t.density * 100)}% (${t.density > 0.55 ? 'cena densa' : 'fundo limpo com negative space'}), hierarquia frase > autor > rodape`,
            avoid: 'watermarks, creator signatures, decorative stock text',
        };
        try { setCached(dnaCacheKey(imageBase64) + ':local', dna); } catch {}
        return { dna };
    } catch (e: any) {
        return { error: String(e?.message || e).slice(0, 160) };
    }
}

const ANALYZER_PROMPT = `
You are a vision analyst for typographic quote images. Look at the attached MODEL image
and extract its MODEL DNA as JSON ONLY: {"layout":"...","typography":"...","palette":"...",
"lightTexture":"...","composition":"...","avoid":"..."}.
Rules: describe observable facts (positions, type style, colors, light, texture, aspect, hierarchy
quote > author > footer). NEVER transcribe watermarks or creator signatures into typography/palette.
Technical ENGLISH, short phrases. JSON only, no markdown.
`.trim();

const DNA_SCHEMA = {
    type: 'object',
    properties: {
        layout: { type: 'string' },
        typography: { type: 'string' },
        palette: { type: 'string' },
        lightTexture: { type: 'string' },
        composition: { type: 'string' },
        avoid: { type: 'string' },
    },
};

// PASS A — analisa 1× por modelo (cache sessionStorage por hash da imagem).
export async function analyzeModelImage(imageBase64: string): Promise<{ dna?: ModelDna; cached: boolean; error?: string }> {
    if (!imageBase64) return { cached: false, error: 'Sem imagem do modelo.' };
    const key = dnaCacheKey(imageBase64);
    const hit = getCached(key);
    if (hit && hit.layout) return { dna: hit, cached: true };
    try {
        const r = await callAI(ANALYZER_PROMPT, 'You are a vision analyst. Reply with the requested JSON only.', 'gemini-3-flash-preview', undefined, {
            images: [imageBase64],
            taskType: 'text',
            responseMimeType: 'application/json',
            responseSchema: DNA_SCHEMA,
            provider: 'gemini',
        });
        if ((r as any).error) return { cached: false, error: (r as any).error };
        const parsed = JSON.parse((r.text || '{}').replace(/```json|```/g, '').trim());
        const dna: ModelDna = {
            layout: String(parsed.layout || '').slice(0, 300),
            typography: String(parsed.typography || '').slice(0, 300),
            palette: String(parsed.palette || '').slice(0, 300),
            lightTexture: String(parsed.lightTexture || '').slice(0, 300),
            composition: String(parsed.composition || '').slice(0, 300),
            avoid: String(parsed.avoid || 'watermarks, creator signatures, decorative stock text').slice(0, 300),
        };
        if (!dna.layout) return { cached: false, error: 'Análise vazia.' };
        setCached(key, dna);
        return { dna, cached: false };
    } catch (e: any) {
        return { cached: false, error: String(e?.message || e).slice(0, 160) };
    }
}

// Traduz o DNA para a gramática do motor de destino (o quê → como cada motor entende).
export function buildModelDnaBlock(dna: ModelDna, engineName?: string): string {
    const e = (engineName || '').toLowerCase();
    const core = `MODEL DNA (seen by vision, apply to every VISUAL PROMPT):
Layout: ${dna.layout}. Typography: ${dna.typography}. Palette: ${dna.palette}.
Light/Texture: ${dna.lightTexture}. Composition: ${dna.composition}.
FORBIDDEN: copy ${dna.avoid}; the ONLY text allowed is this task quote + author + footer.`;
    if (e.includes('midjourney')) {
        return `${core}\nExpress the DNA above as short comma-separated visual keywords; parameters at the very END (--ar from aspect, --no ${dna.avoid}).`;
    }
    if (e.includes('dall-e') || e.includes('dalle')) {
        return `${core}\nRewrite the DNA above as one flowing narrative paragraph with literal spatial relations; exclusions as plain sentences; render at the engine size for the chosen aspect.`;
    }
    if (e.includes('stable diffusion') || e.includes('stable-diffusion')) {
        return `${core}\nSplit the DNA above into Positive prompt (dense descriptors) and Negative prompt (${dna.avoid}, blurry, deformed hands, text artifacts) with the engine resolution for the chosen aspect.`;
    }
    if (e.includes('nano banana') || e.includes('nanobanana')) {
        return `${core}\nFidelity constraints: PRESERVE the DNA layout/palette/composition exactly; SWAP all text with this task quote + author spelled exactly.`;
    }
    return `${core}\nApply the DNA above using the TARGET ENGINE syntax block.`;
}
