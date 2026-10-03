export type DividerKind =
  | 'DIVIDER' | 'NOTA_DIVIDER' | 'EMAIL_DIVIDER' | 'ADS_DIVIDER'
  | 'SLIDE_DIVIDER' | 'QUOTE_DIVIDER' | 'CITATION_DIVIDER' | 'LETTERING_DIVIDER'
  | 'MEME_DIVIDER' | 'INSP_DIVIDER' | 'LOGO_OPTION_DIVIDER' | 'YT_OPTION_DIVIDER'
  | 'SCENE_DIVIDER' | 'SCHEMA_DIVIDER' | 'PRD_DIVIDER' | 'CONFIG_END'
  | 'COMMENT_DIVIDER';

const ZAFRA = 'Café ZAFRA-42';
const MARK = 'ZAFRA-42';

const body = (briefing: string, marker: string) =>
  `${briefing} — ${ZAFRA} — ${marker} — conteúdo de teste determinístico para validar seletores, payload e parsing.`;

const note = (extra = '') =>
  `Nota do Estrategista — ${ZAFRA} ${extra}`.trim();

const wrap = (content: string, n: string) => `${content}\n|||${n}|||\n`;

export const mockCopyText = (briefing: string) => {
  const v1 = body(briefing, 'Variação 1 ZAFRA-42');
  const v2 = body(briefing, 'Variação 2 ZAFRA-42');
  return `${v1}\n|||DIVIDER|||\n${v2}\n|||NOTA_DIVIDER|||\n${note('Copy Pro Harness')}`;
};

export const mockTextWithNota = (briefing: string, kind: string) =>
  `${body(briefing, kind)} — ${MARK}\n|||NOTA_DIVIDER|||\n${note(kind)}`;

export const mockEmail = (briefing: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${body(briefing, `Email ${i + 1}`)} — ${MARK}`).join('\n|||EMAIL_DIVIDER|||\n') + `\n|||NOTA_DIVIDER|||\n${note('Email Harness')}`;

/** Responder Comentários (sessão 51): N variações em PT + Nota isolada. */
export const mockComments = (briefing: string, count = 2) =>
  Array.from({ length: count }, (_, i) => `${body(briefing, `Variação ${i + 1}`)} — resposta ${i + 1} contextual — ${MARK}`).join('\n|||COMMENT_DIVIDER|||\n') + `\n|||NOTA_DIVIDER|||\n${note('CommentResponder Harness — janela de resposta da rede')}`;

export const mockAds = (briefing: string) =>
  Array.from({ length: 3 }, (_, i) => `${body(briefing, `ADS ${i + 1}`)} — ${MARK}`).join('\n|||ADS_DIVIDER|||\n') + `\n|||NOTA_DIVIDER|||\n${note('Ads Harness')}`;

export const mockQuote = (briefing: string) =>
  Array.from({ length: 3 }, (_, i) => `${body(briefing, `QUOTE ${i + 1}`)} — ${MARK}\nPROMPT EN: cinematic quote poster, elegant typography, ${MARK}`).join('\n|||QUOTE_DIVIDER|||\n') + `\n|||NOTA_DIVIDER|||\n${note('Quote')}`;

export const mockLogo = (briefing: string) =>
  `${body(briefing, 'LOGO 1')} — PROMPT EN minimalist vector logo — ${MARK}\n|||LOGO_OPTION_DIVIDER|||\n${body(briefing, 'LOGO 2')} — PROMPT EN flat emblem — ${MARK}\n|||NOTA_DIVIDER|||\n${note('Logo')}`;

export const mockMeme = (briefing: string) =>
  `${body(briefing, 'MEME 1')} — PROMPT EN meme template — ${MARK}\n|||MEME_DIVIDER|||\n${body(briefing, 'MEME 2')} — PROMPT EN meme variant — ${MARK}\n|||NOTA_DIVIDER|||\n${note('Meme')}`;

export const mockInsp = (briefing: string) =>
  Array.from({ length: 3 }, (_, i) => `${body(briefing, `INSP ${i + 1}`)} — INSPIRATION ${MARK}\nPROMPT EN: inspiration mood board — ${MARK}`).join('\n|||INSP_DIVIDER|||\n') + `\n|||NOTA_DIVIDER|||\n${note('Inspiration')}`;

export const mockLettering = (briefing: string) =>
  `${body(briefing, 'LETTERING 1')} — PROMPT EN elegant lettering — ${MARK}\n|||LETTERING_DIVIDER|||\n${body(briefing, 'LETTERING 2')} — PROMPT EN bold composition — ${MARK}\n|||NOTA_DIVIDER|||\n${note('Lettering')}`;

export const mockYouTubeThumb = (briefing: string) =>
  Array.from({ length: 3 }, (_, i) => `${body(briefing, `YT ${i + 1}`)} — THUMBNAIL PROMPT EN — ${MARK}`).join('\n|||YT_OPTION_DIVIDER|||\n') + `\n|||NOTA_DIVIDER|||\n${note('YouTube Thumb')}`;

export const mockCitation = (briefing: string) =>
  Array.from({ length: 3 }, (_, i) => `Citação ${i + 1}: ${body(briefing, 'CITAÇÃO')} — ${MARK} — Author ${i + 1}`).join('\n|||CITATION_DIVIDER|||\n') + `\n|||NOTA_DIVIDER|||\n${note('Citation ficha técnica')}`;

export const mockArticle = (briefing: string) =>
  `${body(briefing, 'ARTIGO')} — SEO article body — ${MARK}\n|||SCHEMA_DIVIDER|||\n{"@type":"Article","headline":"${ZAFRA}"}\n|||NOTA_DIVIDER|||\n${note('Article')}`;

export const mockPPT = (briefing: string, slides = 5) =>
  Array.from({ length: slides }, (_, i) => `[SLIDE ${String(i + 1).padStart(2, '0')}: ${briefing} — ${MARK} Slide ${i + 1}]`).join('\n') + `\n|||NOTA_DIVIDER|||\n${note('PPT')}`;

export const mockCarousel = (briefing: string, slides = 3) =>
  Array.from({ length: slides }, (_, i) => `SLIDE ${i + 1}: ${body(briefing, `Carousel ${i + 1}`)} — COPY PT + VISUAL PROMPT EN — ${MARK}`).join('\n|||SLIDE_DIVIDER|||\n') + `\n|||NOTA_DIVIDER|||\n${note('Carousel')}`;

export const mockVideoPrompts = (briefing: string, scenes = 2) =>
  Array.from({ length: scenes }, (_, i) => `SCENE ${i + 1}: ${body(briefing, `Video ${i + 1}`)} — VISUAL PROMPT EN — ${MARK}`).join('\n|||SCENE_DIVIDER|||\n') + `\n|||NOTA_DIVIDER|||\n${note('Video')}`;

export const mockImagePrompt = (briefing: string) =>
  `${body(briefing, 'IMAGE')} — PROMPT EN matrix 10-steps detailed visual prompt — ${MARK}\n|||NOTA_DIVIDER|||\n${note('Image')}`;

export const mockPRD = (briefing: string) =>
  `# PRD — ${briefing} — LP Conversão ZAFRA-42\n## 1. Objetivo Único\nCTA primário "Agendar no WhatsApp" → #contato — ${MARK}\n## 4. Mapa IA\nNav → Hero → Prova Social → CTA Final — ${MARK}\n## 5. Tokens\nPaleta extraída do DNA — ${MARK}\n|||PRD_DIVIDER|||\n{ "colors": { "primary": "#0A0A0A", "accent": "#CCFF00" }, "mark": "${MARK}" }\n|||NOTA_DIVIDER|||\n${note('PRD [ASSUNÇÃO Q2/Q5]')} — DNA sobrescreve Automático`;

export const toOpenAIChoices = (text: string, model = 'cohere/north-mini-code:free') => ({
  id: 'chatcmpl-mock',
  object: 'chat.completion',
  choices: [{ message: { role: 'assistant', content: text } }],
  model,
});

export const mockIdeasJson = (niche: string) => toOpenAIChoices(JSON.stringify({
  trends: [{ title: `${niche} — ${MARK} Tendência 1`, description: `${niche} — ${MARK} descrição`, analysis: `${MARK} análise` }],
  hashtags: { instagram: [`#${MARK}`], tiktok: [`#${MARK}`], linkedin: [`#${MARK}`], twitter: [`#${MARK}`], seoKeywords: [MARK.toLowerCase()] },
  contentIdeas: Array.from({ length: 12 }, (_, i) => ({ stage: ['Topo de Funil', 'Meio de Funil', 'Fundo de Funil'][Math.floor(i / 4)], option: (i % 4) + 1, title: `${niche} — ${MARK} Ideia ${i + 1}`, hook: `${MARK} hook ${i + 1}`, headline: `${MARK} headline`, body: `${MARK} body`, cta: `${MARK} cta` })),
  contentFormats: { infographic: [{ title: `${MARK} info`, outline: `${MARK} outline` }], video_script: [{ title: `${MARK} video`, outline: `${MARK} outline` }], article: [{ title: `${MARK} article`, outline: `${MARK} outline` }] },
  commonEnemies: [{ label: `${MARK} medo`, kind: 'medo', angle: `${MARK} angle`, exampleHook: `${MARK} hook` }],
  sources: [{ title: `${MARK}`, url: 'https://example.com', source: 'mock', type: 'web' }],
}), 'cohere/north-mini-code:free');
