// data/tts.ts — Plataformas TTS da sessão Áudio (Media Prompts).
// Pesquisa 2026-10-01 (fontes oficiais citadas por plataforma):
// - ElevenLabs: catálogo voices-by-language (json2video, catálogo oficial ElevenLabs) + docs de voice_settings
// - Google Cloud TTS: docs list-voices-and-types (43 vozes pt-BR oficiais com gênero)
// - Gemini TTS: ai.google.dev models (gemini-3.8-flash-tts / 2.5-flash-preview-tts)
// - Amazon Polly: docs.aws.amazon.com neural-voices + standard-voices
// - Microsoft Azure: catálogo de vozes pt-BR (18 códigos oficiais)
// - OpenAI TTS: developers.openai.com text-to-speech (13 vozes, subset em tts-1/hd)
// - Murf: murf.ai API docs (modelos falcon-2/gen2, 7 vozes pt-BR com locale)
// - PlayHT: playht Voices.md (11 vozes Portuguese (BR))
// - Fish Audio: fish.audio (modelos S2.1 Pro, vozes oficiais + comunidade PT-BR)
// Regra: SÓ vozes compatíveis com PT-BR (nenhum pt-PT, nenhum en-US).

export interface TTSChoice {
  id: string;    // valor usável na config (voice_id/código real da plataforma; 'auto' = IA escolhe)
  label: string; // exibição no select
  models?: string[]; // restrição de modelo (ausente = todos os modelos)
}

export interface TTSPlatform {
  id: string;
  label: string;
  link: string;
  brief: string;         // como a plataforma trabalha (injetado no prompt)
  durationNote: string;  // como controlar a duração nessa plataforma
  models: TTSChoice[];
  voices: TTSChoice[];   // [0] = Automático
  configTemplate: string; // JSON com placeholders {{model}} {{voice}} {{duration}} {{words}}
}

export const TTS_DURATION_MIN = 10;
export const TTS_DURATION_MAX = 120;
export const TTS_DURATION_STEP = 5;
// Fala natural PT-BR ≈ 156 palavras por minuto (2,6 palavras/s).
export const TTS_WORDS_PER_SECOND = 2.6;

export const TTS_DURATION_OPTIONS: number[] = Array.from(
  { length: (TTS_DURATION_MAX - TTS_DURATION_MIN) / TTS_DURATION_STEP + 1 },
  (_, i) => TTS_DURATION_MIN + i * TTS_DURATION_STEP
);

export const estimateWordsForDuration = (seconds: number): number =>
  Math.round(clampDuration(seconds) * TTS_WORDS_PER_SECOND);

export const clampDuration = (seconds: number): number => {
  const n = Math.round(Number(seconds));
  if (!Number.isFinite(n)) return 30;
  return Math.min(TTS_DURATION_MAX, Math.max(TTS_DURATION_MIN, n));
};

export const getTTSPlatform = (id: string): TTSPlatform =>
  TTS_PLATFORMS.find((p) => p.id === id) || TTS_PLATFORMS[0];

export const getVoicesFor = (platform: TTSPlatform, modelId: string): TTSChoice[] =>
  platform.voices.filter((v) => !v.models || v.models.includes(modelId));

const AUTO: TTSChoice = { id: 'auto', label: '✨ Automático (IA Escolhe)' };

export const TTS_PLATFORMS: TTSPlatform[] = [
  {
    id: 'elevenlabs',
    label: 'ElevenLabs',
    link: 'https://elevenlabs.io',
    brief:
      'ElevenLabs é síntese neural com a maior biblioteca de vozes; os modelos Multilingual/Flash detectam o idioma e renderizam PT-BR nativamente. voice_settings controla o resultado: stability alta (0.7-0.9) = estável e institucional, baixa (0.3-0.5) = expressiva e criativa; similarity_boost (padrão 0.75) mantém a identidade da voz; style (0-1, só em v2+) adiciona teatralidade (use <0.3 para narração); speed (0.25-4) controla o ritmo; use_speaker_boost melhora presença. V3/v4 aceitam áudio-tags entre colchetes como [pausa], [suspiro], [animado].',
    durationNote:
      'Não existe parâmetro de segundos: a duração vem do número de palavras × speed. Mantenha speed=1.0 e entregue exato no alvo de palavras; micro-ajuste com speed 0.9-1.1.',
    models: [
      { id: 'eleven_multilingual_v2', label: 'Eleven Multilingual v2 — melhor PT-BR' },
      { id: 'eleven_v4', label: 'Eleven v4 — mais expressivo (85+ idiomas)' },
      { id: 'eleven_flash_v2_5', label: 'Eleven Flash v2.5 — latência 75ms' },
      { id: 'eleven_turbo_v2_5', label: 'Eleven Turbo v2.5 — rápido' },
      { id: 'eleven_v3', label: 'Eleven v3 — expressivo (áudio-tags)' }
    ],
    voices: [
      AUTO,
      { id: 'dX7gRq1dIvLTgUaWpEFn', label: 'Rafael Valente — Narrador profissional BR (M)' },
      { id: 'xNGAXaCH8MaasNuo7Hr7', label: 'Beto — PT-BR neutro São Paulo, grave (M)' },
      { id: 'ZxhW0J5Q17DnNxZM6VDC', label: 'Gabriel Neutro — Claro, explainer (M)' },
      { id: 'hwnuNyWkl9DjdTFykrN6', label: 'Adriano — Narrador grave, storytelling (M)' },
      { id: 'HOfBIVLhom4mc9WvXfyH', label: 'Andrea Lot — Autoridade, long-form sério (M)' },
      { id: '9pDzHy2OpOgeXM8SeL0t', label: 'Borges — Calmo, livros e jornalismo (M)' },
      { id: 'qPfM2laM0pRL4rrZtBGl', label: 'Sandro Dutra — Articulado e natural (M)' },
      { id: 'bJrNspxJVFovUxNBQ0wh', label: 'Marcelo Costa — Meia-idade, narração (M)' },
      { id: 'TY3h8ANhQUsJaa0Bga5F', label: 'Cassio Cruz — Grave, documentais (M)' },
      { id: 'Qrdut83w0Cr152Yb4Xn3', label: 'Paulo — Grave, informativo (M)' },
      { id: 'x6uRgOliu4lpcrqMH3s1', label: 'Flavio Francisco — Narração profunda (M)' },
      { id: 'PzTMbh7ilIswxFbjDqwL', label: 'Rocha — Podcast maduro (M)' },
      { id: 'rnJZLKxtlBZt77uIED10', label: 'Sergio — Senior, grave e decisivo (M)' },
      { id: 'RGymW84CSmfVugnA5tvA', label: 'Roberta — Conversacional (F)' },
      { id: 'GDzHdQOi6jjf8zaXhCYD', label: 'Raquel — Expressiva e amigável (F)' },
      { id: '33B4UnXyTNbgLmdEDh5P', label: 'Keren — Jovem, vibrante (F)' },
      { id: 'oi8rgjIfLgJRsQ6rbZh3', label: 'Amanda Kelly — Doce, neutro (F)' },
      { id: 'mPDAoQyGzxBSkE0OAOKw', label: 'Carla — Autoridade VSL, vendas séria (F)' },
      { id: 'm151rjrbWXbBqyq56tly', label: 'Carla — Institucional, corporativa (F)' },
      { id: 'cyD08lEy76q03ER1jZ7y', label: 'Scheila — Formal, bem articulada (F)' },
      { id: 'iScHbNW8K33gNo3lGgbo', label: 'Marianne — Calma, nicho médico (F)' },
      { id: 'Eyspt3SYhZzXd1Jd3J8O', label: 'Bia — Direta e assertiva (F)' },
      { id: 'OB6x7EbXYlhG4DDTB1XU', label: 'Michelle — Jovem, doce (F)' },
      { id: 'MZxV5lN3cv7hi1376O0m', label: 'Ana Dias — Engajadora, multiuso (F)' },
      { id: 'lWq4KDY8znfkV0DrK8Vb', label: 'Yasmin Alves — Tom leve e suave (F)' },
      { id: 'UZ8QqWVrz7tMdxiglcLh', label: 'Livia — Quente e expressiva (F)' },
      { id: '5EtawPduB139avoMLQgH', label: 'Thais — Jovem, macia e acolhedora (F)' },
      { id: 'CstacWqMhJQlnfLPxRG4', label: 'Will (Deep) — Infantil BR, caloroso (M)' },
      { id: 'iTvRNZPNPS0EiSgOCQG0', label: 'Graziella — Infantil, conta-histórias (F)' },
      { id: 'YGgtUkdLOCAVgzsgM2S7', label: 'DiMo — Storytelling e humor (M)' },
      { id: 'RGbeQtiShYRDVCrd9b9w', label: 'Sergio (Funny) — Humor, personagem (M)' },
      { id: 'aU2vcrnwi348Gnc2Y1si', label: 'José — Característica rural SP (M)' },
      { id: 'Zxr2vdABom9UBVX8c10U', label: 'Nando — Sotaque Minas Gerais (M)' },
      { id: 'AttCiqz11X75SoMhVXvQ', label: 'Fabio Filho — Sotaque Rio, versátil (M)' },
      { id: '83Nae6GFQiNslSbuzmE7', label: 'Eduardo Monteiro — Nordeste/AL (M)' },
      { id: 'SAA76GSoxwYgqvFLpT5j', label: 'Anderson Carlos — Nordeste, agradável (M)' },
      { id: 'UPTmB6OygMADpd4LOwE5', label: 'Vinicius Bergamo — Jovem, conversa (M)' },
      { id: '6wXH0w0U0wXqIauOLRUP', label: 'Pedro — Calmo, suporte (M)' },
      { id: 'JNI7HKGyqNaHqfihNoCi', label: 'Rener — Casual, sotaque SP (M)' },
      { id: 'GnDrTQvdzZ7wqAKfLzVQ', label: 'Guilherme — Direto e jovial (M)' },
      { id: 'xWdpADtEio43ew1zGxUQ', label: 'Matheus Santos — Jovem adulto (M)' },
      { id: 'AxlLG2JDutB1IP37raHd', label: 'Ametista — Calma, e-learning (F)' },
      { id: 'oqUwsXKac3MSo4E51ySV', label: 'Taciana — Vibrante e calorosa (F)' },
      { id: 'e06XicPETIbfUaeHM9zH', label: 'Fabi — Emotiva, reflexiva (F)' },
      { id: 'FIEA0c5UHH9JnvWaQrXS', label: 'Michele — Calma, audiobooks (F)' },
      { id: 'nHNZWlqUWtEKPr3hhFQP', label: 'Daiane Candido — Macia, entretenimento (F)' },
      { id: 'sXSV9RZ095VZyL64w3ap', label: 'Alexa — Jovem, natural (F)' },
      { id: 'vibfi5nlk3hs8Mtvf9Oy', label: 'Ana — Relaxada, narração (F)' },
      { id: 'ORgG8rwdAiMYRug8RJwR', label: 'Ana Alice — Clara e amigável (F)' },
      { id: 'ETf5cmpNIbpSiXmBaR2m', label: 'Samuel — Jovem empreendedor (M)' }
    ],
    configTemplate: `{
  "model": "{{model}}",
  "voice_id": "{{voice}}",
  "text": "<COLE AQUI O ROTEIRO>",
  "voice_settings": { "stability": 0.5, "similarity_boost": 0.75, "style": 0.1, "speed": 1.0, "use_speaker_boost": true },
  "duration_seconds": {{duration}},
  "target_words": {{words}}
}`
  },
  {
    id: 'google_cloud',
    label: 'Google Cloud Text-to-Speech',
    link: 'https://cloud.google.com/text-to-speech/docs',
    brief:
      'Google Cloud TTS tem 4 famílias com qualidade/custo distintos: Chirp 3 HD (premium, vozes estelares; NÃO aceita SSML nem speaking_rate/pitch — o ritmo vem só do texto); Neural2 (neural, SSML, equilíbrio); WaveNet (neural de alta qualidade, SSML, speaking_rate 0.25-4 e pitch -96 a 96); Standard (mais barato, SSML). A voz é escolhida pelo código exato (ex.: pt-BR-Neural2-A) junto do language_code "pt-BR".',
    durationNote:
      'Calibre com speaking_rate (1.0 ≈ 156 palavras/min): se o texto passar do alvo, reduza para 0.9-0.95 em vez de cortar conteúdo. Em Chirp 3 HD só o número de palavras controla o tempo.',
    models: [
      { id: 'chirp3-hd', label: 'Chirp 3 HD — premium' },
      { id: 'neural2', label: 'Neural2 — neural, equilíbrio' },
      { id: 'wavenet', label: 'WaveNet — alta qualidade' },
      { id: 'standard', label: 'Standard — econômico' }
    ],
    voices: [
      AUTO,
      { id: 'pt-BR-Chirp3-HD-Achernar', label: 'Achernar (Feminina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Achird', label: 'Achird (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Algenib', label: 'Algenib (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Algieba', label: 'Algieba (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Alnilam', label: 'Alnilam (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Aoede', label: 'Aoede (Feminina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Autonoe', label: 'Autonoe (Feminina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Callirrhoe', label: 'Callirrhoe (Feminina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Charon', label: 'Charon (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Despina', label: 'Despina (Feminina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Enceladus', label: 'Enceladus (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Erinome', label: 'Erinome (Feminina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Fenrir', label: 'Fenrir (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Gacrux', label: 'Gacrux (Feminina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Iapetus', label: 'Iapetus (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Kore', label: 'Kore (Feminina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Laomedeia', label: 'Laomedeia (Feminina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Leda', label: 'Leda (Feminina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Orus', label: 'Orus (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Puck', label: 'Puck (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Pulcherrima', label: 'Pulcherrima (Feminina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Rasalgethi', label: 'Rasalgethi (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Sadachbia', label: 'Sadachbia (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Sadaltager', label: 'Sadaltager (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Schedar', label: 'Schedar (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Sulafat', label: 'Sulafat (Feminina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Umbriel', label: 'Umbriel (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Vindemiatrix', label: 'Vindemiatrix (Feminina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Zephyr', label: 'Zephyr (Feminina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Chirp3-HD-Zubenelgenubi', label: 'Zubenelgenubi (Masculina)', models: ['chirp3-hd'] },
      { id: 'pt-BR-Neural2-A', label: 'Neural2 A (Feminina)', models: ['neural2'] },
      { id: 'pt-BR-Neural2-B', label: 'Neural2 B (Masculina)', models: ['neural2'] },
      { id: 'pt-BR-Neural2-C', label: 'Neural2 C (Feminina)', models: ['neural2'] },
      { id: 'pt-BR-Wavenet-A', label: 'WaveNet A (Feminina)', models: ['wavenet'] },
      { id: 'pt-BR-Wavenet-B', label: 'WaveNet B (Masculina)', models: ['wavenet'] },
      { id: 'pt-BR-Wavenet-C', label: 'WaveNet C (Feminina)', models: ['wavenet'] },
      { id: 'pt-BR-Wavenet-D', label: 'WaveNet D (Feminina)', models: ['wavenet'] },
      { id: 'pt-BR-Wavenet-E', label: 'WaveNet E (Masculina)', models: ['wavenet'] },
      { id: 'pt-BR-Standard-A', label: 'Standard A (Feminina)', models: ['standard'] },
      { id: 'pt-BR-Standard-B', label: 'Standard B (Masculina)', models: ['standard'] },
      { id: 'pt-BR-Standard-C', label: 'Standard C (Feminina)', models: ['standard'] },
      { id: 'pt-BR-Standard-D', label: 'Standard D (Feminina)', models: ['standard'] },
      { id: 'pt-BR-Standard-E', label: 'Standard E (Masculina)', models: ['standard'] }
    ],
    configTemplate: `{
  "voice": "{{voice}}",
  "language_code": "pt-BR",
  "audio_encoding": "MP3",
  "speaking_rate": 1.0,
  "pitch": 0,
  "duration_seconds": {{duration}},
  "target_words": {{words}}
}`
  },
  {
    id: 'gemini_tts',
    label: 'Google Gemini TTS (AI Studio)',
    link: 'https://aistudio.google.com',
    brief:
      'Gemini TTS gera áudio direto no modelo (Gemini 3.8 Flash TTS / 2.5 Flash TTS). O estilo é controlado por "instructions" em linguagem natural (tom, ritmo, emoção, sotaque) e por áudio-tags como [pausa] e [suspiro]; a voz é fixada pelo nome (ex.: Kore, Puck). Não há parâmetros numéricos de voz — todo o direcionamento entra no instructions, e o modelo detecta o idioma do texto.',
    durationNote:
      'Sem campo de segundos: o tempo é o texto no alvo de palavras (156 ppm). Peça no instructions "ritmo natural de 156 palavras por minuto em português do Brasil".',
    models: [
      { id: 'gemini-3.8-flash-tts', label: 'Gemini 3.8 Flash TTS — recomendado' },
      { id: 'gemini-2.5-flash-preview-tts', label: 'Gemini 2.5 Flash TTS — rápido' },
      { id: 'gemini-3.8-flash-lite-tts', label: 'Gemini 3.8 Flash-Lite TTS — econômico' }
    ],
    voices: [
      AUTO,
      { id: 'Aoede', label: 'Aoede (Feminina)' },
      { id: 'Callirrhoe', label: 'Callirrhoe (Feminina)' },
      { id: 'Charon', label: 'Charon (Masculina)' },
      { id: 'Enceladus', label: 'Enceladus (Masculina)' },
      { id: 'Fenrir', label: 'Fenrir (Masculina)' },
      { id: 'Iapetus', label: 'Iapetus (Masculina)' },
      { id: 'Kore', label: 'Kore (Feminina)' },
      { id: 'Leda', label: 'Leda (Feminina)' },
      { id: 'Orus', label: 'Orus (Masculina)' },
      { id: 'Puck', label: 'Puck (Masculina)' },
      { id: 'Zephyr', label: 'Zephyr (Feminina)' },
      { id: 'Achernar', label: 'Achernar (Feminina)' },
      { id: 'Achird', label: 'Achird (Masculina)' },
      { id: 'Algenib', label: 'Algenib (Masculina)' },
      { id: 'Algieba', label: 'Algieba (Masculina)' },
      { id: 'Alnilam', label: 'Alnilam (Masculina)' },
      { id: 'Autonoe', label: 'Autonoe (Feminina)' },
      { id: 'Despina', label: 'Despina (Feminina)' },
      { id: 'Erinome', label: 'Erinome (Feminina)' },
      { id: 'Gacrux', label: 'Gacrux (Feminina)' },
      { id: 'Laomedeia', label: 'Laomedeia (Feminina)' },
      { id: 'Pulcherrima', label: 'Pulcherrima (Feminina)' },
      { id: 'Rasalgethi', label: 'Rasalgethi (Masculina)' },
      { id: 'Sadachbia', label: 'Sadachbia (Masculina)' },
      { id: 'Sadaltager', label: 'Sadaltager (Masculina)' },
      { id: 'Schedar', label: 'Schedar (Masculina)' },
      { id: 'Sulafat', label: 'Sulafat (Feminina)' },
      { id: 'Umbriel', label: 'Umbriel (Masculina)' },
      { id: 'Vindemiatrix', label: 'Vindemiatrix (Feminina)' },
      { id: 'Zubenelgenubi', label: 'Zubenelgenubi (Masculina)' }
    ],
    configTemplate: `{
  "model": "{{model}}",
  "voice": "{{voice}}",
  "language": "pt-BR",
  "response_modalities": ["AUDIO"],
  "instructions": "<tom, ritmo e emoção em português do Brasil>",
  "duration_seconds": {{duration}},
  "target_words": {{words}}
}`
  },
  {
    id: 'amazon_polly',
    label: 'Amazon Polly',
    link: 'https://docs.aws.amazon.com/polly/latest/dg/',
    brief:
      'Polly tem 2 motores para pt-BR: neural (Camila, Vitória, Thiago — natural, saída até 24kHz) e standard (Camila, Vitória, Ricardo — concatenativo, mais robótico e barato). O texto pode entrar como text puro ou SSML (text_type): com SSML o ritmo/volume/altura são controlados por <prosody rate="..." pitch="..." volume="..."> e pausas por <break time="500ms"/>. Há ainda engines long-form/generative em contas elegíveis.',
    durationNote:
      'Com text_type=ssml use <prosody rate>: 100% ≈ 156 palavras/min; calibre entre 90% e 110% para bater os segundos sem cortar o roteiro. Pausas <break> contam na duração.',
    models: [
      { id: 'neural', label: 'Neural — natural, 24kHz' },
      { id: 'standard', label: 'Standard — clássico, barato' }
    ],
    voices: [
      AUTO,
      { id: 'Camila', label: 'Camila — Feminina (Neural + Standard)', models: ['neural', 'standard'] },
      { id: 'Vitória', label: 'Vitória — Feminina (Neural + Standard)', models: ['neural', 'standard'] },
      { id: 'Thiago', label: 'Thiago — Masculino (só Neural)', models: ['neural'] },
      { id: 'Ricardo', label: 'Ricardo — Masculino (só Standard)', models: ['standard'] }
    ],
    configTemplate: `{
  "engine": "{{model}}",
  "voice_id": "{{voice}}",
  "language_code": "pt-BR",
  "text_type": "ssml",
  "output_format": "mp3",
  "ssml": "<speak><prosody rate=\\"100%\\">COLE O ROTEIRO AQUI</prosody></speak>",
  "duration_seconds": {{duration}},
  "target_words": {{words}}
}`
  },
  {
    id: 'azure',
    label: 'Microsoft Azure Speech',
    link: 'https://learn.microsoft.com/azure/ai-services/speech-service/',
    brief:
      'Azure Speech entrega vozes neurais pt-BR com SSML completo (<prosody rate/pitch/volume>, <break> para pausas, fonemas) e vozes Multilingues (Macerio, Thalita) que aceitam outros idiomas com a mesma identidade. Saída típica: audio-24khz-48kbitrate-mono-mp3. As mesmas vozes pt-BR estão disponíveis gratuitamente via edge-tts (códigos pt-BR-*Neural).',
    durationNote:
      'SSML <prosody rate="0%"> é a base (±20%); calibre o rate para bater os segundos — pausas <break time="500ms"/> também contam na duração.',
    models: [
      { id: 'neural', label: 'Neural — 16 vozes pt-BR' },
      { id: 'multilingual', label: 'Multilingual — Macerio/Thalita' }
    ],
    voices: [
      AUTO,
      { id: 'pt-BR-FranciscaNeural', label: 'Francisca (Feminina)', models: ['neural'] },
      { id: 'pt-BR-AntonioNeural', label: 'Antonio (Masculina)', models: ['neural'] },
      { id: 'pt-BR-ThalitaNeural', label: 'Thalita (Feminina)', models: ['neural'] },
      { id: 'pt-BR-BrendaNeural', label: 'Brenda (Feminina)', models: ['neural'] },
      { id: 'pt-BR-DonatoNeural', label: 'Donato (Masculina)', models: ['neural'] },
      { id: 'pt-BR-ElzaNeural', label: 'Elza (Feminina)', models: ['neural'] },
      { id: 'pt-BR-FabioNeural', label: 'Fabio (Masculina)', models: ['neural'] },
      { id: 'pt-BR-GiovannaNeural', label: 'Giovanna (Feminina)', models: ['neural'] },
      { id: 'pt-BR-HumbertoNeural', label: 'Humberto (Masculina)', models: ['neural'] },
      { id: 'pt-BR-JulioNeural', label: 'Julio (Masculina)', models: ['neural'] },
      { id: 'pt-BR-LeilaNeural', label: 'Leila (Feminina)', models: ['neural'] },
      { id: 'pt-BR-LeticiaNeural', label: 'Leticia (Feminina)', models: ['neural'] },
      { id: 'pt-BR-ManuelaNeural', label: 'Manuela (Feminina)', models: ['neural'] },
      { id: 'pt-BR-NicolauNeural', label: 'Nicolau (Masculina)', models: ['neural'] },
      { id: 'pt-BR-ValerioNeural', label: 'Valerio (Masculina)', models: ['neural'] },
      { id: 'pt-BR-YaraNeural', label: 'Yara (Feminina)', models: ['neural'] },
      { id: 'pt-BR-MacerioMultilingualNeural', label: 'Macerio (Multilingue)', models: ['multilingual'] },
      { id: 'pt-BR-ThalitaMultilingualNeural', label: 'Thalita (Multilingue, Feminina)', models: ['multilingual'] }
    ],
    configTemplate: `{
  "voice": "{{voice}}",
  "language": "pt-BR",
  "output_format": "audio-24khz-48kbitrate-mono-mp3",
  "prosody": { "rate": "0%", "pitch": "0Hz", "volume": "default" },
  "duration_seconds": {{duration}},
  "target_words": {{words}}
}`
  },
  {
    id: 'openai',
    label: 'OpenAI (TTS)',
    link: 'https://platform.openai.com/docs/guides/text-to-speech',
    brief:
      'OpenAI tem gpt-4o-mini-tts (recomendado: dirigido por instructions — tom, sotape, velocidade — e aceita as 13 vozes), tts-1-hd (boa qualidade) e tts-1 (menor latência); estes dois últimos só aceitam 9 vozes (alloy, ash, coral, echo, fable, nova, onyx, sage, shimmer). As vozes rodam em qualquer idioma — PT-BR funciona bem; speed vai de 0.25 a 4.0.',
    durationNote:
      'speed=1.0 é a base: entregue o alvo exato de palavras e use speed só para micro-ajuste (0.9-1.1). No instructions peça "ritmo natural, ~156 palavras por minuto em português do Brasil".',
    models: [
      { id: 'gpt-4o-mini-tts', label: 'gpt-4o-mini-tts — recomendado (instructions)' },
      { id: 'tts-1-hd', label: 'tts-1-hd — qualidade HD' },
      { id: 'tts-1', label: 'tts-1 — baixa latência' }
    ],
    voices: [
      AUTO,
      { id: 'alloy', label: 'alloy — neutra', models: ['gpt-4o-mini-tts', 'tts-1-hd', 'tts-1'] },
      { id: 'ash', label: 'ash — neutra', models: ['gpt-4o-mini-tts', 'tts-1-hd', 'tts-1'] },
      { id: 'coral', label: 'coral — calorosa', models: ['gpt-4o-mini-tts', 'tts-1-hd', 'tts-1'] },
      { id: 'echo', label: 'echo — masculina', models: ['gpt-4o-mini-tts', 'tts-1-hd', 'tts-1'] },
      { id: 'fable', label: 'fable — expressiva', models: ['gpt-4o-mini-tts', 'tts-1-hd', 'tts-1'] },
      { id: 'nova', label: 'nova — jovem', models: ['gpt-4o-mini-tts', 'tts-1-hd', 'tts-1'] },
      { id: 'onyx', label: 'onyx — grave', models: ['gpt-4o-mini-tts', 'tts-1-hd', 'tts-1'] },
      { id: 'sage', label: 'sage — séria', models: ['gpt-4o-mini-tts', 'tts-1-hd', 'tts-1'] },
      { id: 'shimmer', label: 'shimmer — brilhante', models: ['gpt-4o-mini-tts', 'tts-1-hd', 'tts-1'] },
      { id: 'ballad', label: 'ballad — suave (só gpt-4o-mini-tts)', models: ['gpt-4o-mini-tts'] },
      { id: 'verse', label: 'verse — poética (só gpt-4o-mini-tts)', models: ['gpt-4o-mini-tts'] },
      { id: 'marin', label: 'marin — melhor qualidade (só gpt-4o-mini-tts)', models: ['gpt-4o-mini-tts'] },
      { id: 'cedar', label: 'cedar — natural (só gpt-4o-mini-tts)', models: ['gpt-4o-mini-tts'] }
    ],
    configTemplate: `{
  "model": "{{model}}",
  "voice": "{{voice}}",
  "speed": 1.0,
  "response_format": "mp3",
  "instructions": "<tom, sotaque e ritmo em português do Brasil>",
  "duration_seconds": {{duration}},
  "target_words": {{words}}
}`
  },
  {
    id: 'murf',
    label: 'Murf AI',
    link: 'https://murf.ai',
    brief:
      'Murf tem 2 modelos: falcon-2 (atual, streaming e não-streaming) e gen2 (legado, só no endpoint não-streaming). As vozes pt-BR são fixas no padrão pt-BR-<nome> (7 vozes) e algumas falam vários idiomas (Isadora, Heitor, Benício). Os campos da síntese: locale "pt-BR", rate (-50 a 50, 0 = normal), pitch (-50 a 50), style (ex.: Conversational, Promo), sampleRate (24000/44100/48000) e variation (0-5, só gen2).',
    durationNote:
      'A API não aceita segundos: a duração sai do texto × rate. Mantenha rate=0 (normal ≈ 156 ppm) e entregue o alvo exato de palavras; ajuste rate -5 a +5 só se precisar calibrar.',
    models: [
      { id: 'falcon-2', label: 'Falcon 2 — atual (streaming)' },
      { id: 'gen2', label: 'Gen2 — legado (só não-streaming)' }
    ],
    voices: [
      AUTO,
      { id: 'pt-BR-benício', label: 'Benício — Masculina, Conversational', models: ['falcon-2', 'gen2'] },
      { id: 'pt-BR-eloa', label: 'Eloa — Feminina, Conversational/Promo', models: ['falcon-2', 'gen2'] },
      { id: 'pt-BR-gustavo', label: 'Gustavo — Masculina, Conversational', models: ['falcon-2', 'gen2'] },
      { id: 'pt-BR-heitor', label: 'Heitor — Masculina, Conversational (multilíngue)', models: ['falcon-2', 'gen2'] },
      { id: 'pt-BR-isadora', label: 'Isadora — Feminina, Conversational (multilíngue)', models: ['falcon-2', 'gen2'] },
      { id: 'pt-BR-silvio', label: 'Silvio — Masculina, Conversational', models: ['falcon-2'] },
      { id: 'pt-BR-yago', label: 'Yago — Masculina', models: ['falcon-2'] }
    ],
    configTemplate: `{
  "model": "{{model}}",
  "voice_id": "{{voice}}",
  "locale": "pt-BR",
  "format": "MP3",
  "rate": 0,
  "pitch": 0,
  "style": "Conversational",
  "text": "<COLE O ROTEIRO>",
  "duration_seconds": {{duration}},
  "target_words": {{words}}
}`
  },
  {
    id: 'playht',
    label: 'PlayHT',
    link: 'https://play.ht',
    brief:
      'PlayHT roda o modelo play3.0-mini com vozes pré-definidas (voice_source=playht), vozes clonadas (clone) e vozes de terceiros (elevenlabs/edge/kokoro/minimax quando a conta tem acesso). O catálogo tem 11 vozes pt-BR oficiais, incluindo Francisca (narration style "calm") e Isabela V3 (Carolina). speed controla o ritmo e sample_rate a qualidade (24000/44100).',
    durationNote:
      'speed=1.0 como base + alvo exato de palavras (~156 ppm). Micro-ajuste de 0.9-1.1 em speed para calibrar os segundos.',
    models: [{ id: 'play3.0-mini', label: 'play3.0-mini — atual' }],
    voices: [
      AUTO,
      { id: 'Ricardo', label: 'Ricardo — Masculina' },
      { id: 'Vitoria', label: 'Vitoria — Feminina' },
      { id: 'Camila', label: 'Camila — Feminina' },
      { id: 'Matilde', label: 'Matilde — Feminina' },
      { id: 'pt-BR-Standard-A', label: 'Maria (pt-BR-Standard-A) — Feminina' },
      { id: 'pt-BR-Wavenet-A', label: 'Ines (pt-BR-Wavenet-A) — Feminina' },
      { id: 'pt-BR_IsabelaV3Voice', label: 'Carolina (Isabela V3) — Feminina' },
      { id: 'pt-BR-FranciscaNeural', label: 'Francisca — Feminina (estilo calm)' },
      { id: 'pt-BR-HeloisaRUS', label: 'Heloisa — Feminina' },
      { id: 'pt-BR-Daniel-Apollo', label: 'Daniel — Masculina' },
      { id: 'pt-BR-AntonioNeural', label: 'Antonio — Masculina' }
    ],
    configTemplate: `{
  "model": "{{model}}",
  "voice": "{{voice}}",
  "voice_source": "playht",
  "output_format": "mp3",
  "sample_rate": 24000,
  "speed": 1.0,
  "duration_seconds": {{duration}},
  "target_words": {{words}}
}`
  },
  {
    id: 'fish_audio',
    label: 'Fish Audio',
    link: 'https://fish.audio',
    brief:
      'Fish Audio combina modelos próprios (S2.1 Pro) com uma biblioteca community de milhões de vozes: as vozes oficiais (Ethan, Sarah, Selene) são multilíngues e as vozes PT-BR estão na comunidade (busque "Portuguese (Brazil)"). O playground calibra speed, pitch e emotion; no corpo da requisição os campos principais são text, voice, format e speed.',
    durationNote:
      'Sem campo de segundos: o ritmo é palavras ÷ speed. Entregue o alvo exato (~156 ppm com speed 1.0) e registre emotion coerente com a peça.',
    models: [{ id: 's2.1-pro', label: 'S2.1 Pro — atual' }],
    voices: [
      AUTO,
      { id: 'selene', label: 'Selene — Feminina, oficial Fish' },
      { id: 'ethan', label: 'Ethan — Masculina, oficial Fish' },
      { id: 'sarah', label: 'Sarah — Feminina, oficial Fish' },
      { id: '40abc72f7a694d1f843b8c7211b2d72b', label: 'Portuguese Explainer — Comunidade, calma e medida' },
      { id: '225d877aa7c3485eaea3d4ca1fac2a6d', label: 'Portuguese (Brazil) — Comunidade, narração sênior (M)' }
    ],
    configTemplate: `{
  "model": "{{model}}",
  "voice": "{{voice}}",
  "format": "mp3",
  "speed": 1.0,
  "emotion": "neutral",
  "duration_seconds": {{duration}},
  "target_words": {{words}}
}`
  }
];
