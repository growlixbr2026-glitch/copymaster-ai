// Catálogo de perfis de engenharia de prompt por plataforma geradora de imagem.
// Cada sessão visual escolhe o perfil pelo motor que o usuário selecionou
// (params.engine / aiModel / ai) e injeta o bloco no prompt da sessão.
// Fontes (docs oficiais, 2026): docs.midjourney.com (Prompt Basics + Parameter
// List + Text Generation), OpenAI Cookbook (DALL-E 3 + GPT-image prompting),
// Stability AI toolkit + stable-diffusion-art.com, helpx.adobe.com (Firefly),
// ai.google.dev (Imagen prompt guide), deepmind.google + blog.google (Nano
// Banana), docs.ideogram.ai (Prompting Guide + JSON 4.0), docs.bfl.ai + skills
// (FLUX.2, sem negative prompts), recraft.ai/docs (V3: 1000 chars, text_layout),
// leonardo.ai (prompting guides), help.aliyun.com (Wanx: negative_prompt +
// prompt_extend), ByteDance Seedream (fórmula + layout mensurável),
// Tencent HunyuanImage-3.0 (prompt handbook), Baidu ERNIE-Image (fórmula +
// negative_prompt), docs.x.ai (Imagine), ai.meta.com (Imagine/Muse).
// Whisk/Mixboard/Stitch/Kling/Luma: sem doc pública de prompting — heurística
// marcada como tal; revisar quando houver fonte oficial.

export interface PlatformProfile {
  id: string;
  match: string[];
  label: string;
  // Bloco de sintaxe injetado no prompt da sessão (sem crases, sem Markdown).
  syntax: string;
  // Como expressar a proporção dentro do prompt gerado.
  aspect: (ratio: string) => string;
  // Como pedir texto overlay dentro da imagem.
  textOverlay: (text: string) => string;
  // Tetos do motor (o bloco avisa o gerador para respeitá-los).
  caps?: { words?: number; chars?: number };
  // true = motor SEM negative prompt (usar positive framing).
  noNegative?: boolean;
}

const MJ_ASPECT = (ratio: string) => {
  const m = (ratio || '').match(/(\d+\s*:\s*\d+)/);
  return m ? '--ar ' + m[1].replace(/\s/g, '') : '--ar 1:1';
};

const DESCRIBE_ASPECT = (ratio: string) => {
  const m = (ratio || '').match(/(\d+\s*:\s*\d+)/);
  const r = m ? m[1].replace(/\s/g, '') : '1:1';
  if (r === '9:16') return 'tall vertical 9:16 composition, optimized for phones and stories';
  if (r === '16:9') return 'wide horizontal 16:9 composition, cinematic framing';
  if (r === '4:5') return 'vertical 4:5 portrait composition for feeds';
  if (r === '1:1') return 'square 1:1 composition';
  return 'composition in ' + r + ' aspect ratio';
};

const SD_RES = (ratio: string) => {
  const m = (ratio || '').match(/(\d+\s*:\s*\d+)/);
  const r = m ? m[1].replace(/\s/g, '') : '1:1';
  if (r === '9:16') return '768x1344';
  if (r === '16:9') return '1344x768';
  if (r === '4:5') return '896x1152';
  if (r === '3:4') return '896x1152';
  return '1024x1024';
};

const DALLE_SIZE = (ratio: string) => {
  const m = (ratio || '').match(/(\d+\s*:\s*\d+)/);
  const r = m ? m[1].replace(/\s/g, '') : '1:1';
  if (r === '9:16' || r === '3:4' || r === '4:5' || r === '2:3') return '1024x1792 portrait';
  if (r === '16:9' || r === '3:2' || r === '21:9') return '1792x1024 landscape';
  return '1024x1024 square';
};

export const PLATFORM_PROFILES: PlatformProfile[] = [
  {
    id: 'midjourney',
    match: ['midjourney'],
    label: 'Midjourney',
    syntax: 'SYNTAX FOR MIDJOURNEY (docs.midjourney.com): SHORT keyword prompts win over long lists. Order: subject, medium, environment, lighting, color, mood. Use double colon :: for distinct concepts. Parameters go at the VERY END after a space, no punctuation inside them: --ar for aspect (always include), --no for exclusions (never prose negatives), --sref for style reference, --oref for subject reference, --sw for style weight. Visible words go in "double quotes" (official Text Generation).',
    aspect: MJ_ASPECT,
    textOverlay: (t) => 'the exact words "' + t + '" in bold readable typography',
  },
  {
    id: 'dalle3',
    match: ['dall-e', 'dalle'],
    label: 'DALL-E 3',
    syntax: 'SYNTAX FOR DALL-E 3 (OpenAI Cookbook): one flowing narrative paragraph with complete sentences and literal spatial relations (on the left, in the background, foreground). Rich contextual storytelling beats keyword lists; detailed prompts survive GPT rewriting better. NO negative parameter exists: write exclusions as plain sentences. Styles: vivid (dramatic) or natural; quality hd for detail. Photographic detail helps photorealism.',
    aspect: (ratio) => 'render at size ' + DALLE_SIZE(ratio),
    textOverlay: (t) => 'short readable text saying "' + t + '" rendered verbatim, no extra characters',
  },
  {
    id: 'sd35',
    match: ['stable diffusion', 'stable-diffusion'],
    label: 'Stable Diffusion 3.5',
    syntax: 'SYNTAX FOR STABLE DIFFUSION (Stability AI + stable-diffusion-art.com): two sections. Positive prompt with dense comma-separated visual descriptors (subject first, then scene, style, lighting; SD3.5 also reads natural language). Then a Negative prompt section listing defects to avoid: blurry, deformed hands, extra fingers, watermark, text artifacts, oversaturated, bad anatomy. Keep anatomy terms precise. Universal negative boilerplate helps or never hurts.',
    aspect: (ratio) => 'resolution ' + SD_RES(ratio),
    textOverlay: (t) => 'legible text "' + t + '" in bold typography, correct spelling',
  },
  {
    id: 'firefly',
    match: ['firefly'],
    label: 'Adobe Firefly',
    syntax: 'SYNTAX FOR ADOBE FIREFLY (helpx.adobe.com): concise structured prompt of Subject plus descriptors plus keywords (minimum 3 words, avoid the words generate/create). Formula: subject, descriptors, style keywords, lighting/mood. Commercial-safe content only. State composition, depth, lighting and mood explicitly.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'clean editable text reading "' + t + '"',
  },
  {
    id: 'imagen',
    match: ['imagen'],
    label: 'Google Imagen',
    syntax: 'SYNTAX FOR GOOGLE IMAGEN (ai.google.dev prompt guide): natural-language description ordered subject, context/background, style. Concrete observable details with adjectives and adverbs; iterate adding detail. Text in images: guide placement explicitly and inspire a general font style (no exact font replication). Supported aspects: 1:1, 3:4, 4:3, 9:16, 16:9.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'the text "' + t + '" rendered clearly with guided placement and a matching general font style',
  },
  {
    id: 'nanobanana',
    match: ['nano banana', 'nanobanana'],
    label: 'Nano Banana Pro',
    syntax: 'SYNTAX FOR NANO BANANA (Google DeepMind prompt guide): official 5-field order Subject, Composition, Action, Location, Style. Editing instructions are direct and specific: state what must be preserved versus created ("preserve layout, swap text"). Text renders in quotes with typography style; multilingual text works when quoted exactly. Ask for aspect ratio in words (1:1, 4:3, 9:16). Iterate conversationally.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'exact text "' + t + '" spelled exactly like this, preserving layout',
  },
  {
    id: 'ideogram',
    match: ['ideogram'],
    label: 'Ideogram',
    syntax: 'SYNTAX FOR IDEOGRAM (docs.ideogram.ai): natural sentence-style prompting, LEAD with what matters most. HARD CAP ~150-160 words: every word must count. Typography-first: every visible word in double quotes with typeface, weight, placement and contrast. Write text in ENGLISH for accuracy (other Latin scripts ok, non-Latin often fails). Magic Prompt expands plain prompts; JSON prompting (4.0) for pixel-precise layout. Negative prompts supported.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => '"' + t + '" in large bold lettering in ENGLISH, perfect spelling, high contrast, specified placement',
    caps: { words: 150 },
  },
  {
    id: 'flux',
    match: ['flux'],
    label: 'Flux.1 Pro',
    syntax: 'SYNTAX FOR FLUX (docs.bfl.ai official guide): natural language, FRONT-LOAD the subject (word order = priority: subject, action, style, context). Sweet spot 30-80 words. NO NEGATIVE PROMPTS EXIST: use positive framing only ("empty beach" never "no people", "sharp focus throughout" never "no blur"). Hex codes for exact colors (associated to objects). Readable text: quote it exactly with placement and font.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'readable text "' + t + '" quoted exactly with placement and font specified',
    noNegative: true,
  },
  {
    id: 'recraft',
    match: ['recraft'],
    label: 'Recraft V3',
    syntax: 'SYNTAX FOR RECRAFT V3 (recraft.ai/docs): natural language, HARD CAP 1000 characters. Flat vector-first language: specify vector style, clean paths, solid background for logos/icons. Text in "quotes" with precise placement (V3 text_layout bbox). artistic_level: lower for adherence, higher for creativity.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'crisp vector text "' + t + '" with precise placement',
    caps: { chars: 1000 },
  },
  {
    id: 'leonardo',
    match: ['leonardo'],
    label: 'Leonardo.ai',
    syntax: 'SYNTAX FOR LEONARDO (leonardo.ai guides): comma-separated lists work well: style FIRST, then subject/appearance/action, then scene/background, then composition/lighting/framing. Name the art style explicitly. Negative prompts supported for artifacts. Character Reference tokens keep identical descriptors across scenes for consistency.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'stylized text "' + t + '" matching the art style',
  },
  {
    id: 'whisk',
    match: ['whisk'],
    label: 'Google Whisk',
    syntax: 'SYNTAX FOR WHISK (sem doc oficial publica, heuristica): describe three remixable parts separately. Subject: who or what. Scene: where and doing what. Style: visual treatment. Fusion-friendly wording so parts can be recombined.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'overlay text "' + t + '" in matching style',
  },
  {
    id: 'mixboard',
    match: ['mixboard'],
    label: 'Google Mixboard',
    syntax: 'SYNTAX FOR MIXBOARD (sem doc oficial publica, heuristica): ideation-board language. Describe the core idea plus two visual variations of mood and style. Exploratory tone, multiple directions in one brief.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'sample headline text "' + t + '"',
  },
  {
    id: 'stitch',
    match: ['stitch'],
    label: 'Google Stitch',
    syntax: 'SYNTAX FOR STITCH (sem doc oficial publica, heuristica): interface-layout description. Name screens, components, hierarchy, spacing and color system. Clean UI vocabulary, no photographic metaphors.',
    aspect: (ratio) => 'layout frame ' + DESCRIBE_ASPECT(ratio),
    textOverlay: (t) => 'interface label text "' + t + '"',
  },
  {
    id: 'kling',
    match: ['kling'],
    label: 'Kling AI',
    syntax: 'SYNTAX FOR KLING (heuristica video-first): cinematic keyframe description. Camera move implied, dramatic lighting, film-still quality, strong first-frame composition for image-to-video use.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'on-screen title text "' + t + '"',
  },
  {
    id: 'luma',
    match: ['luma'],
    label: 'Luma Dream Machine',
    syntax: 'SYNTAX FOR LUMA (heuristica video-first): dreamlike cinematic frame with coherent geometry. Describe depth, motion-ready composition and consistent lighting for image-to-video use.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'title text "' + t + '" blended into the scene',
  },
  {
    id: 'grok',
    match: ['grok'],
    label: 'Grok 2',
    syntax: 'SYNTAX FOR GROK (docs.x.ai Imagine): direct natural-language scene description with photorealistic intent. Complete sentences, concrete subjects, clear light and mood. NO parameter syntax exists: request aspect in prose ("9:16 vertical"). Exclusions as plain sentences. Strong on real entities, text and logos.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'visible text "' + t + '" rendered precisely',
  },
  {
    id: 'meta-imagine',
    match: ['meta'],
    label: 'Meta AI Imagine',
    syntax: 'SYNTAX FOR META IMAGINE (ai.meta.com): conversational prompting, open with "imagine" energy and concrete scene detail — vague prompts fail. Formula: subject plus scene plus style plus mood, with cultural references welcome. Iterate conversationally. Avoid technical parameters and negative prompts; keep it vivid and specific.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'simple on-image text "' + t + '"',
  },
  {
    id: 'qwen-wanx',
    match: ['qwen', 'wanx', 'wan 2', 'tongyi'],
    label: 'Qwen Wanx',
    syntax: 'SYNTAX FOR QWEN WANX (help.aliyun.com official guide): structured detailed prompt with subject, scene, quality and style; supports negative_prompt separately and prompt_extend LLM rewriting (default on, best for short prompts). Official formula: shot type, camera angle, lens, style, lighting. Strong bilingual (Chinese/English) text rendering: quote overlay text exactly. Complete positive description first, exclusions in negative_prompt.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'the exact text "' + t + '" rendered precisely, bilingual-safe',
  },
  {
    id: 'doubao-seedream',
    match: ['doubao', 'seedream', 'jimeng', 'dreamina'],
    label: 'Doubao Seedream',
    syntax: 'SYNTAX FOR DOUBAO SEEDREAM (ByteDance Seedream reports + 5.0 prompt formula): order asset type, main subject, environment, composition (MEASURABLE layout: "text area left 40% of frame", never vague "futuristic"), camera/lighting, materials/textures, on-image text, constraints. Native bilingual prompt, precise instruction adherence. Editing: name the target, define the change AND the protected details, never restate the whole scene.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'accurate text "' + t + '" with correct spelling and measured placement',
  },
  {
    id: 'hunyuan',
    match: ['hunyuan'],
    label: 'Tencent Hunyuan',
    syntax: 'SYNTAX FOR HUNYUAN (Tencent HunyuanImage prompt handbook): PRIORITY ORDER — main subject and scene first, then quality/style, composition/perspective, lighting/atmosphere, technical parameters LAST. Long detailed prompts welcome and rewarded; automatic prompt rewriting assists short ones. Precise on details, concrete everyday language with cultural grounding when relevant.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'clear text "' + t + '" integrated in the layout',
  },
  {
    id: 'ernie-vilg',
    match: ['ernie', 'vilg', 'wenxin', 'yige'],
    label: 'ERNIE-ViLG',
    syntax: 'SYNTAX FOR ERNIE-ViLG (Baidu ERNIE-Image guides): reusable formula subject/action, scene/atmosphere, style direction, camera/composition, text constraints, color script, aspect ratio. Visible words in "quotes" with placement (top banner, center label) and typography style. negative_prompt supported. Bilingual EN/ZH; Prompt Enhancer expands short prompts (disable for exact text placement).',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'text "' + t + '" quoted exactly with placement and typography style',
  },
  {
    id: 'kolors',
    match: ['kwai kolors', 'kolors'],
    label: 'Kwai Kolors',
    syntax: 'SYNTAX FOR KWAI KOLORS (SiliconFlow docs): photorealistic bilingual (CN/EN) prompt, FREE tier unlimited. Concise subject-first, style keywords, quality tags (masterpiece, 8k). No negative parameter. Aspect via resolution param.',
    aspect: (ratio) => 'resolution ' + SD_RES(ratio),
    textOverlay: (t) => 'text "' + t + '" in clear typography',
  },
  {
    id: 'hf-flux',
    match: ['flux.1 hf', 'hf flux', 'hugging face flux'],
    label: 'FLUX.1 HF',
    syntax: 'SYNTAX FOR FLUX.1 HF (Hugging Face Inference): open FLUX.1-dev/schnell via hf-inference provider, $0.10/mo free. Natural language front-loaded subject, 30-80 words, no negative prompts, hex colors. Use standard FLUX syntax.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'readable text "' + t + '" quoted exactly',
    noNegative: true,
  },
  {
    id: 'universal',
    match: [],
    label: 'Universal',
    syntax: 'UNIVERSAL VISUAL SYNTAX: hierarchical order of subject, action, environment, style, lighting, palette, composition. Concrete observable details instead of abstract adjectives. Exclusions written as plain sentences. No proprietary parameters.',
    aspect: DESCRIBE_ASPECT,
    textOverlay: (t) => 'the text "' + t + '" in bold readable typography',
  },
];

export function getPlatformProfile(engineName?: string): PlatformProfile {
  const name = (engineName || '').toLowerCase();
  if (!name) return PLATFORM_PROFILES[PLATFORM_PROFILES.length - 1];
  if (name.includes('automatico') || name.includes('automático') || name.includes('escolhe')) {
    return PLATFORM_PROFILES[PLATFORM_PROFILES.length - 1];
  }
  for (const p of PLATFORM_PROFILES) {
    if (p.id === 'universal') continue;
    if (p.match.some((m) => name.includes(m))) return p;
  }
  return PLATFORM_PROFILES[PLATFORM_PROFILES.length - 1];
}

// Monta o bloco de plataforma com proporção e texto overlay resolvidos.
export function buildPlatformBlock(
  engineName?: string,
  opts?: { aspectRatio?: string; customText?: string; negative?: string }
): string {
  const profile = getPlatformProfile(engineName);
  const ratio = opts?.aspectRatio || '1:1';
  const lines = [
    'TARGET ENGINE: ' + profile.label + '.',
    profile.syntax,
    'ASPECT: ' + profile.aspect(ratio) + '.',
  ];
  if (profile.caps?.words) lines.push('LENGTH CAP: keep the visual prompt under ' + profile.caps.words + ' words.');
  if (profile.caps?.chars) lines.push('LENGTH CAP: keep the visual prompt under ' + profile.caps.chars + ' characters.');
  if (opts?.customText) lines.push('TEXT OVERLAY: ' + profile.textOverlay(opts.customText) + '.');
  const UNIVERSAL_NEGATIVE = 'blurry, deformed hands, extra fingers, watermark, signature, text artifacts, oversaturated, bad anatomy';
  const neg = opts?.negative || ((profile.id === 'sd35' || profile.id === 'leonardo') ? UNIVERSAL_NEGATIVE : '');
  if (neg) {
    if (profile.noNegative) lines.push('Exclusions by POSITIVE FRAMING ONLY (this engine has no negative prompt): describe what fills the space instead (e.g. "empty scene", "sharp focus throughout", "clean unmarked surfaces").');
    else if (profile.id === 'midjourney') lines.push('Append at the very end: --no ' + neg + '.');
    else if (profile.id === 'sd35' || profile.id === 'leonardo') lines.push('Negative prompt: ' + neg + '.');
    else lines.push('Exclusions (plain sentence, no parameter syntax): images without ' + neg + '.');
  }
  lines.push('Write the ENTIRE visual prompt in technical ENGLISH without exception, even when the user context is in another language.');
  return lines.join('\n');
}

// Hierarquia obrigatória: função da sessão vence perfil, que vence protocolo.
export const SESSION_HIERARCHY_RULE =
  'PRIORITY ORDER: 1. this session function and every selector the user chose, 2. the target engine syntax above, 3. the general visual protocol, 4. mandatory technical English output.';

// Link oficial de cada plataforma (exibido abaixo do seletor Modelo IA).
export const PLATFORM_LINKS: Record<string, { url: string; hint: string }> = {
  universal: { url: 'https://docs.midjourney.com/docs/prompt-basics', hint: 'Guia de prompts' },
  midjourney: { url: 'https://www.midjourney.com', hint: 'Abrir Midjourney' },
  dalle3: { url: 'https://chat.openai.com', hint: 'Abrir DALL-E 3' },
  sd35: { url: 'https://stability.ai', hint: 'Abrir Stable Diffusion' },
  firefly: { url: 'https://firefly.adobe.com', hint: 'Abrir Firefly' },
  imagen: { url: 'https://labs.google/fx', hint: 'Abrir Imagen' },
  nanobanana: { url: 'https://gemini.google.com', hint: 'Abrir Nano Banana' },
  ideogram: { url: 'https://ideogram.ai', hint: 'Abrir Ideogram' },
  flux: { url: 'https://bfl.ai', hint: 'Abrir Flux' },
  recraft: { url: 'https://www.recraft.ai', hint: 'Abrir Recraft' },
  leonardo: { url: 'https://leonardo.ai', hint: 'Abrir Leonardo' },
  grok: { url: 'https://grok.com', hint: 'Abrir Grok' },
  'meta-imagine': { url: 'https://www.meta.ai', hint: 'Abrir Meta AI' },
  'qwen-wanx': { url: 'https://tongyi.aliyun.com/wanxiang', hint: 'Abrir Qwen Wanx' },
  'doubao-seedream': { url: 'https://www.doubao.com/chat/create-image', hint: 'Abrir Doubao' },
  hunyuan: { url: 'https://hunyuan.tencent.com', hint: 'Abrir Hunyuan' },
  'ernie-vilg': { url: 'https://yige.baidu.com', hint: 'Abrir ERNIE-ViLG' },
  whisk: { url: 'https://labs.google/fx', hint: 'Abrir Whisk' },
  mixboard: { url: 'https://labs.google/fx', hint: 'Abrir Mixboard' },
  stitch: { url: 'https://labs.google/stitch', hint: 'Abrir Stitch' },
  kling: { url: 'https://klingai.com', hint: 'Abrir Kling' },
  luma: { url: 'https://lumalabs.ai/dream-machine', hint: 'Abrir Luma' },
  kolors: { url: 'https://www.siliconflow.cn', hint: 'Abrir Kolors (SiliconFlow)' },
  'hf-flux': { url: 'https://huggingface.co/black-forest-labs/FLUX.1-dev', hint: 'Abrir FLUX HF' },
};

export function getPlatformLink(engineName?: string): { url: string; hint: string } {
  const profile = getPlatformProfile(engineName);
  return PLATFORM_LINKS[profile.id] || PLATFORM_LINKS.universal;
}
