// Referência visual de modelo (Pinterest / Quotefancy / anexo).
// Resolve link via proxy /api/pin, aplica preset quote-text no ramo sem-pixels
// e monta a regra de referência conforme o motor (Gemini vê pixels, outros não).

export interface PinRef {
    pinId: string;
    pageUrl: string;
    thumbUrl: string;
    title: string;
    imageBase64?: string;
    seenPixels: boolean;
}

export const PINTEREST_QUOTETEXT_PRESET = `
QUOTE-TEXT MODEL STYLE (Pinterest reference, preset fallback):
Bold condensed typography centered with generous letter-spacing, short quote in large size,
author line smaller below separated by a thin rule, deep textured duotone background,
soft vignette, film grain, high contrast between text and background, elegant negative space.
`.trim();

export async function resolvePinterestRef(link: string, wantBytes = false): Promise<{ ref?: PinRef; error?: string; hint?: string }> {
    const url = (link || '').trim();
    if (!url) return { error: 'Cole o link do Pin.' };
    try {
        const qs = `?url=${encodeURIComponent(url)}${wantBytes ? '&bytes=1' : ''}`;
        const r = await fetch(`/api/pin${qs}`, { method: 'GET' });
        const j: any = await r.json().catch(() => ({}));
        if (!j || j.ok !== true) return { error: String(j?.reason || 'Falha ao resolver o Pin.'), hint: j?.hint };
        return {
            ref: {
                pinId: String(j.pinId || ''),
                pageUrl: String(j.pageUrl || url),
                thumbUrl: String(j.thumbUrl || ''),
                title: String(j.title || '').slice(0, 140),
                imageBase64: j.base64 ? `data:${j.mime || 'image/jpeg'};base64,${j.base64}` : undefined,
                seenPixels: !!j.base64,
            },
        };
    } catch (e: any) {
        return { error: String(e?.message || e).slice(0, 160) };
    }
}

// Ramo por motor: Gemini recebe pixels + regra de fidelidade; demais, preset + link.
export function buildReferenceRule(opts: { ref?: PinRef; attachedBase64?: string; provider?: string }): { rule: string; images: string[]; seenPixels: boolean } {
    const isGemini = (opts.provider || '').toLowerCase() === 'gemini';
    const pixels = opts.attachedBase64 || opts.ref?.imageBase64;
    if (isGemini && pixels) {
        return {
            images: [pixels],
            seenPixels: true,
            rule: `MODELO DE REFERENCIA (imagem anexada, pixels visiveis): use-a como MODELO de estilo, layout e composicao. TROQUE todo o texto pela citacao + autor desta tarefa. NUNCA copie marca d'agua, assinatura ou texto decorativo do modelo.`,
        };
    }
    const link = opts.ref?.pageUrl ? ` Referencia de estilo: ${opts.ref.pageUrl}.` : '';
    return {
        images: [],
        seenPixels: false,
        rule: `MODELO DE REFERENCIA (preset, pixels NAO visualizados — seja honesto na Nota): siga o estilo quote-text abaixo.${link}\n${PINTEREST_QUOTETEXT_PRESET}`,
    };
}
