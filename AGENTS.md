# CopyMaster AI — Guia Completo do Desenvolvedor (humano ou IA)

> Leia este arquivo ANTES de mexer no código. Ele é a fonte canônica do projeto:
> o que é, para que serve, como funciona, qual o input e output esperado de cada
> módulo, e as regras que NUNCA devem ser quebradas. Atualize-o quando mudar contratos.
> Escrito para que qualquer desenvolvedor consiga entender, melhorar e dar
> continuidade sem explorar o repo do zero.

---

## 0. Visão, objetivo e para que serve

**CopyMaster AI** é uma suíte de criação de conteúdo e marketing com IA, focada no
mercado brasileiro: SPA React + Vite na Vercel, sem backend aplicacional (banco,
login, cobrança, multiusuário), mas com **functions serverless sem estado de apoio**
(`/api/env`, `/api/research`, `/api/pin`, `/api/scrape` e o **proxy `/api/ai`** —
ver §9) que existem para pesquisa e para manter as chaves LLM fora do bundle (H1).

O usuário escolhe uma das **28 sessões**, preenche
seletores/briefing e recebe **texto pronto para copiar e colar** ou **prompt
técnico em inglês para gerar imagens em outra IA** (Midjourney, DALL-E, etc.).

### O que NÃO é
- Não tem backend aplicacional, banco de dados, login, cobrança ou multiusuário.
  As serverless functions da Vercel (proxy `/api/ai`, `/api/env`, pesquisa, pin,
  scrape) não mantêm estado — ver §9.
- A "carteira" (`TokenDashboard`) é 100% local (`localStorage`) — controle de
  quota/limites, não faturamento.
- Não gera imagens diretamente (exceto rascunho de Logo via
  `gemini-2.5-flash-image`); sessões visuais entregam **prompt EN** para colar no
  motor escolhido, com `EngineLink` para o site oficial.

### Problemas que resolve
1. **Bloqueio criativo** — copy, roteiros, e-mails, anúncios, artigos sob demanda.
2. **Falta de equipe** — 1 pessoa opera como redator, estrategista, designer de
   prompts e social media.
3. **Prompts visuais ruins** — engenharia de prompt por motor (sintaxe de cada um)
   em vez de texto genérico (`services/modules/visual/platformProfiles.ts`).
4. **Detecção de texto-robô** — verificador forense + humanizador com gate de 70%.
5. **Custo** — rotação de provedores/chaves, modelos `:free`, Cofre local AES-GCM.

### Os dois tipos de saída (badge `ToolLayout`)
- **T = Texto** (badge azul): texto puro copia-cola em PT (ou idioma da UI).
  Proibido Markdown no entregável (Item 12).
- **I = Prompt imagem** (badge roxo): prompt técnico em INGLÊS + `EngineLink`
  (`target=_blank`) + legenda/overlay em PT quando houver texto na arte.
- **Dinâmico**: TikTok/Reels/YouTube/Media mudam o badge conforme o modo
  (roteiro=Texto, capa/thumb=Prompt imagem).

---

## 1. Primeiros passos (setup em 5 minutos)

### Stack
React 18 + Vite 5 + Tailwind 3 + TypeScript 5 + `@google/genai` + `jspdf` +
`lucide-react`. Testes: Playwright + `@axe-core/playwright`. Deploy: Vercel (SPA).

### Comandos
```bash
npm install
npm run dev        # http://localhost:5173 (plugin /api/env lê/escreve o .env)
npm run build      # tsc && vite build — NÃO embute segredos (define zerado no build;
                   # guard BLOQUEADO se houver .env com chaves — ver §9 Chaves)
npm run security:bundle  # varre dist/ por padrões de chave (rode antes de distribuir)
npm run preview
npx playwright test --project=chromium            # suíte completa
npx playwright test e2e/smoke.spec.ts e2e/qa-core.spec.ts  # sem gastar quota
```
Não existe script `test` no package.json. Specs em `e2e/`:
permanentes `smoke.spec.ts`, `qa-core.spec.ts`, `user-full.spec.ts` (2 gerações reais) + mock `full-user.spec.ts`/`full-user-simple.spec.ts` (`ZAFRA-42`, 0 quota, 16 testes) + `payload-audit.spec.ts` (prova seletor→prompt nas 28 sessões via payload real + mock, 0 quota) + auxiliares `mx-live.spec.ts`, `general-user.spec.ts`, `real-dentista.spec.ts` (harness/manuais).

### Gerar seu primeiro conteúdo
1. `npm run dev` → abre `http://localhost:5173` → tela `home` (`WelcomeScreen`).
2. Clique `ABRIR SALA DE IDEIAS` ou um card (ex: `Copywriting Pro`).
3. Em `settings` (Centro de Comando): escolha `primary_text_provider`
   (default `openrouter`), cole a chave no card, clique `Testar` (chama
   `testConnection` → `callAI("Responda apenas OK")`) e depois
   `Salvar Configurações` (grava cofre + `.env` em dev).
4. Na sessão, preencha o briefing mínimo (cada sessão bloqueia vazio no botão),
   clique Gerar, aguarde o stream, use as abas + `RefinementToolbar`
   (Copiar / PDF / Verificar IA / Humanizar).
5. Acompanhe quota no `wallet` (`TokenDashboard`) e na barra `Uso {provider}`.

---

## 2. Arquitetura (mapa mental + fluxos)

```
index.tsx (ErrorBoundary + MemoryProvider + ThemeProvider)
└── components/App.tsx (28 tabs + wallet/settings + home, lazy + visitedTabs keep-alive)
    ├── contexts/SharedContext  (activeTab, sharedContext/cérebro, globalError)
    ├── contexts/ThemeContext   (normal/write/color)
    ├── contexts/MemoryContext  (histórico de uso)
    ├── hooks/useTranslation    (PT/EN/ES via utils/translations.ts + constants.ts)
    ├── hooks/useAIGenerator    (generate/generateStream, erros — ver §12)
    ├── components/ToolLayout   (padrão visual: sidebar + resultado + badge + EngineLink)
    └── services/core/aiClient.ts → callAI() = ÚNICO ponto de I/O com LLMs
```

**Regra de ouro da arquitetura:** todo acesso a LLM passa por `callAI()`.
Nunca chame `fetch` de provider direto em componente. Em produção o browser não
tem chave nenhuma: o `callAI` POSTa `{provider,url,body}` no proxy server-side
`/api/ai`, que injeta a autenticação (ver §9 "Proxy `/api/ai`").

### Como o App monta as tabs
- `components/App.tsx:12-43`: 32 `lazy()` (28 sessões + wallet/settings + home +
  modal). `components = useMemo(..., [language])` recria ao trocar idioma;
  o mapa `components` em si tem **30 entradas** (28 sessões + settings + wallet —
  `home`/modal ficam fora e são renderizados à parte).
- `activeTab` vive em `SharedContext`; `visitedTabs:Set(['home'])` + `useEffect`
  adiciona cada visita. Render: `Object.entries(components).map` com
  `div style display:block/none` — **keep-alive**: painel visitado nunca desmonta
  (preserva form/resultado/scroll), mas fica `display:none` no DOM.
  **Armadilha**: em testes Playwright, escopar asserts ao painel visível.
- **Layout ÚNICO desde 2026-09-30**: não existe mais `if (activeTab === 'home')
  return <WelcomeScreen/>`. Early-return trocava a forma da árvore raiz e o React
  desmontava tudo → "Voltar ao Início" perdia form/resultado/scroll de todas as
  sessões (verificado empiricamente: texto digitado → home → reentra = vazio).
  Agora a home é um overlay `fixed inset-0 z-40` por cima; o `<main>` ganha
  `aria-hidden` na home (e o skip-link/sidebar/hamburger são omitidos ali),
  enquanto os painéis ficam montados por baixo. `QuotaErrorModal` (z-50) continua
  acima do overlay e agora **também é alcançável na home**.
- Sidebar `App.tsx:314-366` (`nav[role=tablist]` em `:319`): 6 grupos (Estratégia & Core 4, Vendas 5, Vídeo 3,
  Visual & Design 10, Geral & Mídia 4, Sistema 1). `wallet/settings` são botões
  no rodapé, não tabs. `UsageIndicator` (poll 15s) mostra `Uso {provider} %`.
- `home` (`WelcomeScreen`) é full-screen; demais tabs têm layout
  `aside + main[role=tabpanel]`. `globalError` abre `QuotaErrorModal` com a
  mensagem real. O único `App.tsx` é `components/App.tsx` (importado por
  `index.tsx`) — a duplicata obsoleta da raiz foi removida em 2026-09-30.

### Fluxo ponta-a-ponta (exemplo Copy)
```
Sidebar click → handleNavClick setActiveTab(id)
→ visitedTabs keep-alive (monta 1ª vez, depois só show/hide)
→ Formulário (selects de getLocalizedLists + briefing + persona ativa + lock)
→ useAIGenerator.generateStream(serviceCall(onChunk), onChunk, onComplete)
→ Serviço (services/modules/*) monta prompt (personaToContext + seletores +
  buildPlatformBlock p/ visuais + divisores exatos em linha própria)
→ callAI(prompt, system, model, onChunk, {provider, taskType})
→ Parser tolerante (stripCopyFormat: split*/strip*)
→ Abas + Nota isolada (modal/link Ver Nota)
→ RefinementToolbar (Expandir/Encurtar/Simplificar/Emojis, custom+meta,
  Transformar, Verificar IA, Humanizar gate 70, PDF, TTS, Contexto Global, Copiar)
→ Memória/carteira (addHistory + trackUsage → TokenDashboard/UsageIndicator)
```
- `SharedContext` (`copymaster_shared_context:v2`, seed da persona ativa):
  compartilhamento entre suites **só por import explícito** do usuário
  (`Contexto Global` / `Desenvolver no Editor`). Nunca sync automático.
- Persona ativa (`personaService`, `types.ts:37-46`) prefixa o prompt do Copy
  (`CopyGenerator.tsx:113`) como `MARCA/CLIENTE/TOM/VOCABULÁRIO/MISSÃO` e aparece
  na `ActivePersonaBar`.

### `callAI(prompt, systemInstruction, defaultModel, onChunk?, config?)`
`config`: `{ provider, images, tools, responseMimeType, responseSchema,
aspectRatio, tempApiKey, taskType }`.
- `taskType: 'visual'` → usa `primary_prompt_provider`; senão `primary_text_provider`
  (ambos de `localStorage`, padrão `'openrouter'`). Provider inválido cai para
  `openrouter`.
- Ordem de chave: `tempApiKey` → **sentinel do servidor** (`__copymaster_proxy__`:
  produção, mapa vindo do GET `/api/env` via `serverKeyService` → chamada pelo
  proxy `/api/ai`) → `process.env` (embutido só no `serve` dev — `vite build`
  zera os segredos) → cofre (`vaultService`, AES-GCM, migração legada automática)
  → legado `localStorage` (`<provider>_api_key`). Sem chave → erro PT-BR
  `Chave X não configurada`. Endpoint local (9router) nunca usa o sentinel.
  **P0 corrigido em 2026-09-30**: `getVaultKey()` devolve *string*, e o código
  fazia `const { getVaultKey } = await vaultMod.getVaultKey(provider)` —
  destructuring de string virava `undefined`, o `catch` engolia o TypeError e
  **toda chave só-do-cofre era inacessível** (pior em produção, onde `/api/env`
  é 405 e o cofre é o único destino; a migração legada ainda apagava o
  plaintext nessa leitura falhada). Nunca destructure o retorno da função —
  destructure o módulo: `const { getVaultKey } = vaultMod;`.
- Cérebro: `copymaster_brain:v2` prefixa a instrução (se já contém
  `REGRAS DE OURO`, `brain + system`, senão `GOLDEN + brain + INSTRUÇÕES`).
- Ramo `gemini` (`@google/genai`, único com streaming real
  `generateContentStream` + `imageConfig.aspectRatio` + extração
  `inlineData → imageUrl`). **Falha no primário gemini NÃO aborta mais**: o
  erro é anotado, gemini vai para o FIM da cadeia e os demais providers são
  tentados antes (antes: `return {error}` direto → quota gemini = geração
  morta mesmo com OpenRouter/Groq saudáveis).
- Ramo OpenAI-compatível: `fallbackChain = routerService.getFallbackChain`
  (ordena por quota restante + latência; `corsWarning` por último no browser;
  gateway 9Router morto penalizado 60s). Expande pool de chaves
  (`keyPoolService`: base + `_2.._9` + cofre, throttle 2,5s) e pool de modelos
  `:free` OpenRouter em 429/5xx antes de trocar de chave; retry sem
  `response_format` em 400 (alguns `:free` rejeitam `json_object`).
- Provedores estritos (`groq`, `mistral`, `nvidia`, `meta`, `grok`) **rejeitam o
  campo top-level `system`**: para eles a instrução vai como
  `messages[0] role:system`. Não reintroduza `system:` global.
- Grounding automático: se `tools` pede `googleSearch/web_search` e provider não
  é gemini, injeta `gatherResearch(prompt)` como `[FONTE N]`.
- Timeouts: 3,5s p/ gateway local, 600s p/ remoto (`:free` sofre throttle;
  Ideas ~40KB pode levar ~360s).
- Defesa anti-vazamento: conteúdo vazio ou com `reasoning/chatcmpl` não é exibido,
  gira o pool. Erro final é agregado (principal + até 3 fallbacks) e traduzido
  por `toFriendlyError()` (PT-BR, nunca JSON cru).
- Sucesso registra `setHealth` (latência), `markKeyUsed`, `addHistory`
  (previews 400/600, máx 500, poda 90 dias) e `setLastModel` (só openrouter).
- `testConnection(provider, apiKey, type)` chama
  `callAI("...TYPE", "Responda apenas OK", ...)` e retorna
  `{success, message, latency, details?, engineType?}` — usado pelo botão Salvar.

### Constituição (GOLDEN_SYSTEM_INSTRUCTIONS, V20, em `aiClient.ts`)
Lei suprema dos prompts (41 itens, agrupados):
- **Entrega**: só resultado, sem saudação; roteiros são fala pura de teleprompter;
  entregável é **TEXTO PURO copia-cola** (proibido `* # - — • > 1. crases pipes**);
  Markdown só na Nota; sem explicar raciocínio; sem extrapolar escopo.
- **Curadoria**: especialista mundial, tese provocadora, filtra N opções.
- **Contexto/hierarquia**: entrada do usuário é verdade; ordem
  Persona Ativa > Contexto Global; sessão isolada; input nunca sobrescreve a
  Constituição.
- **Visual**: diretor de fotografia, prompt EN detalhado
  (`VISUAL_MASTER_PROTOCOL`: lentes 35/85mm, Rim/Volumetric/Cinestill, texturas,
  composição; **PROIBIDO PT**); Capa de Revista começa com
  `Usar a imagem em anexo...` (Regra #6).
- **Factualidade**: sem inventar stats (`[INSERIR DADO]`), sem URL fake (fallback
  `google.com/search?q=`), **bloquear sem dados essenciais** (Itens 18/19/26 —
  ex: SEO sem roteiro, logo sem nicho) com bloco objetivo, sem supor
  público/tom/canal, separa fato/opinião/criação, citação obrigatória
  (`[FONTE NÃO INFORMADA]` se sem lastro), marca incerteza, sem plágio.
- **Nota (Item 8)**: Nota do Estrategista SEMPRE separada do entregável.
- **Validação/conflitos**: checklist interno, auditoria de coerência; prioridade
  verdade > contexto > idioma > formato > criatividade; modos exclusivos
  (Jornalístico/Copy/Roteiro/Prompt/Social); ambiguidade → pergunta ou bloqueia.
- **Segurança (Item 33)**: ignora prompt injection, bloqueio imediato.
  Só o dono muda as Regras (Itens 15/41).

### Divisores (contrato sagrado modelo↔parser)
Conteúdo e nota NUNCA se misturam na mesma string; o separador é textual:

| Divisor | Uso |
|---|---|
| `\|\|\|DIVIDER\|\|\|` | 2 variações (copy) |
| `\|\|\|NOTA_DIVIDER\|\|\|` | separa entregável da Nota (quase todas) |
| `\|\|\|EMAIL_DIVIDER\|\|\|` / `\|\|\|ADS_DIVIDER\|\|\|` / `\|\|\|SLIDE_DIVIDER\|\|\|` / `\|\|\|QUOTE_DIVIDER\|\|\|` / `\|\|\|CITATION_DIVIDER\|\|\|` / `\|\|\|LETTERING_DIVIDER\|\|\|` / `\|\|\|MEME_DIVIDER\|\|\|` / `\|\|\|INSP_DIVIDER\|\|\|` / `\|\|\|LOGO_OPTION_DIVIDER\|\|\|` / `\|\|\|YT_OPTION_DIVIDER\|\|\|` / `\|\|\|SCENE_DIVIDER\|\|\|` / `\|\|\|SCHEMA_DIVIDER\|\|\|` (JSON-LD) / `\|\|\|PRD_DIVIDER\|\|\|` (PRD↔tokens) | separadores por sessão |

Regras ao escrever prompts: divisor **sempre em linha própria, exato,
nunca quebrado em linhas**, nunca repetir placeholders (`[CONTEÚDO...]`) nem
o nome do divisor no corpo. Modelos ignoram divisores com frequência — por
isso os parsers usam `splitVisualResult()` / `splitOptions()` (tolerantes a
`NOTE` vs `NOTA`, divisores quebrados e fallback por parágrafos em branco).

### Utilitários de limpeza (`utils/stripCopyFormat.ts`)
- `stripCopyMarkdown()` — texto puro (usado em Copy + RefinementToolbar).
  Ex: `**Variação 1:**\n- Aprenda **hoje**!\n|||DIVIDER|||` →
  `Aprenda hoje!`. Remove listas `# - • > 1.`, `** __ * _ ~~ ```, rótulos
  `Variação/Opção N`, divisores e linhas só-símbolos; preserva hífen interno.
- `stripVisualPrompt()` — limpa prompt visual **preservando** `--ar`, `::`,
  resoluções (`1024x1792`) e steps numerados; remove Markdown leve,
  placeholders `[CONTEÚDO]` e nota.
- `splitCopyVariants(text, divider)` — tolera divisor quebrado
  (`|||\\nDIVIDER|||`), corta a nota, retorna N variações limpas.
- `splitVisualResult(text)` → `{ content, note }` tolerante (`NOTE` vs `NOTA`,
  case-insensitive; guarda anti-JSON `{"id":"chatcmpl...` → content vazio).
- `splitOptions(text, divider, expected)` → N abas úteis mesmo sem divisor
  (divide por parágrafos `\n\n` e reagrupa; nunca retorna aba vazia se houver texto).

### Componentes compartilhados
- `ToolLayout` (props: `title icon iconColorClass description loading error
  isLocked onToggleLock sidebarContent mainContent hasResults actions
  outputKind?`): `OutputKindBadge` (`Prompt imagem` roxo / `Texto` azul) e
  `EngineLink` (link oficial do motor sob o seletor, `target=_blank`; só em
  sessões imagem). Grid `lg:grid-cols-12` (sidebar 4 + main 8); `isLocked`
  aplica `opacity-50 pointer-events-none`.
- `RefinementToolbar` (só renderiza se há texto): Verificar IA + Humanizar,
  Expandir/Encurtar/Simplificar/Emojis, instrução custom + meta de caracteres,
  Transformar (pivot por plataforma/metodologia/funil/tom), PDF/TTS/Contexto
  Global/**Copiar**. Detalhes no §12.
- `SectionHelp`, `SpeechInput`, `TextToSpeech`, `VisualPreview`, `ActivePersonaBar`.

---

## 3. Catálogos e motores

- `data/global.ts` (90 linhas): `GLOBAL_LANGUAGES` (PT-BR/EN-US/ES),
  `IMAGE_AIS` (**22**, índice 0 = Automático: Imagen 4, Nano Banana Pro, Whisk,
  Mixboard, Stitch, Midjourney v6, DALL-E 3, Grok 2, Recraft V3, SD 3.5,
  Firefly, Leonardo, Flux.1 Pro, Ideogram 2, **Meta AI Imagine, Qwen Wanx 2,
  Doubao Seedream, Hunyuan, ERNIE-ViLG**, Kling, Luma), `VIDEO_AIS` (10:
  Automático, Veo 3.1, Flow, Runway Gen-3, Pika, Sora, Luma, Kling, Haiper,
  Minimax), `VIBE_CODING_PLATFORMS` (22 p/ Landing tech), `VIDEO_RATIOS`
  (`Auto,16:9,9:16,1:1,4:5,21:9,3:4`), `PAPER_SIZES_PT/EN/ES`
  (Digital 1:1/9:16/16:9/4:5/21:9 + Impresso A4V/A4H/A3V/A5V/American Comic).
  Listas globais não-localizadas.
- `data/visuals.ts` (557 linhas): estilos/formatos/estéticas; padrão item `[0]` =
  `Automático`. PT mais completo que EN/ES (ex: `IMAGE_STYLES` 46 PT / 30 EN /
  27 ES; `MEME_STYLES` ~45 PT com Flork/Wojak/Gretchen/Nazaré; `COMIC_STYLES`
  ~50 PT com Ziraldo/Turma da Mônica). `MAGAZINE_PRESETS/MOODS`,
  `LOGO_AI_PLATFORMS` (17), `LOGO_STYLES` (43 PT), `BRAND_ARCHETYPES` (17),
  `FAMOUS_PAINTERS` (26), `FAMOUS_DESIGNERS` (33), `VISUAL_COLORS` (26),
  `VISUAL_TEXTURES` (32), `QUOTE_STYLES`, `INFOGRAPHIC_STYLES/LAYOUTS`,
  `COMIC_LAYOUTS` (18), `ADULT_ANIMATION` (alias comic + 11 formatos),
  `MEME_FORMATS` (~40: Drake, Distracted, Trade Offer...), `VIDEO_STYLES`,
  `PPT_*`, `LP_*`, `LET_*` (20 estilos/23 técnicas/25 superfícies/19 composições).
- `data/{copywriting,social,creative,citations}.ts`:
  copywriting (`TONES` 23 PT, `METHODOLOGIES` 27 PT: AIDA/PAS/FAB/StoryBrand/JTBD...,
  `TRIGGERS` 16, `FUNNEL_STAGES` 6, `SINS` 8, `EMAIL_TYPES` 10, `VSL_FRAMEWORKS`
  13, `LP_TYPES/FRAMEWORKS` 9, `ARTICLE_TYPES` 11, `PRD_TYPES` 6, `PRD_SECTIONS` 8);
  social (`SOCIAL_PLATFORMS` 28 PT / 29 EN-ES com Reddit, `POST_TYPES` 12,
  `AD_PLATFORMS/AD_GOALS` 8, `INSPIRATION_CATEGORIES` 10 com `id` estável —
  usar `id`, nunca `label`);
  creative (`NOTEBOOK_MODES` 3 + 8 objetivos, `SUNO_STYLES` 18 / `MOODS` 15;
  os arrays antigos de voz TTS foram removidos — o banco vive em `data/tts.ts`);
  citations (`CITATION_AREA_IDS` 16, `AREAS/TONES` 15 / `SOURCES` 10,
  `CITATION_AUTHORS` ~250 com `getAuthorsByArea(areaId)`; `auto` = todos).
- `data/tts.ts` (**Áudio, 2026-10-01**): `TTS_PLATFORMS` — 9 provedores com
  `brief` (como a plataforma trabalha), `durationNote` (como calibrar segundos),
  `models`, `voices[{id,label,models?}]` **só compatíveis com PT-BR** (nenhum
  pt-PT/en-US — travado por spec) e `configTemplate` JSON com placeholders
  `{{model}}/{{voice}}/{{duration}}/{{words}}`: ElevenLabs (5 modelos, 50 vozes
  BR com `voice_id` real), Google Cloud (Standard/WaveNet/Neural2/Chirp3-HD —
  43 códigos `pt-BR-*` com gênero), Gemini TTS (3 modelos, 30 vozes estelares),
  Amazon Polly (neural/standard × Camila/Vitória/Thiago/Ricardo), Azure (18
  vozes `pt-BR-*Neural`, neural×multilingual), OpenAI (13 vozes, subset 9 em
  `tts-1`), Murf (`falcon-2`/`gen2` × 7 `pt-BR-*`), PlayHT (`play3.0-mini` × 11),
  Fish Audio (S2.1 Pro × 6). Helpers: `TTS_DURATION_OPTIONS` (10..120, step 5),
  `estimateWordsForDuration` (2,6 pal/s ≈ 156 ppm PT-BR), `clampDuration`,
  `getTTSPlatform`, `getVoicesFor` (filtra voz×modelo). Exportado via
  `export * from './data/tts'` em `constants.ts`; `[0]` de cada lista de vozes
  é `auto` (✨ Automático — a IA escolhe na Nota).
- `constants.ts:getLocalizedLists(langCode)`: **única fachada** que componentes
  consomem (`const { tones, imageStyles } = getLocalizedLists(langCode)`).
  Pass-through (não-localizado): `imageAIs, videoRatios, magPresets, magMoods,
  visualColors, visualTextures, famousPainters/Designers, logoPlatforms`.
  Localizado por ternário `isPt?PT:isEs?ES:EN`. Nunca importar `data/*` direto
  (exceto globais).
- `services/modules/visual/platformProfiles.ts` (321 linhas): 22 perfis
  (`getPlatformProfile` fuzzy-match com fallback `universal`,
  `buildPlatformBlock(engine, {aspectRatio, customText, negative})`,
  `getPlatformLink`/`PLATFORM_LINKS`, `SESSION_HIERARCHY_RULE`,
  `caps{words,chars}` + `noNegative` por motor, negativo universal SD/Leonardo).
  Regra anti-regressão: NENHUMA sessão chama `buildPlatformBlock` com `{}` —
  aspecto/overlay sempre fluem (logo=marca, carousel=customText/footer,
  inspiration=footer). Trava: harness-contrato motor×sessão (aspecto presente,
  overlay presente, marcador nativo, divisor sem vazamento).
  Fontes oficiais por perfil (pesquisa 2026): MJ docs.midjourney.com (curto,
  params no fim, `--no`, `::`, aspas); DALL-E OpenAI Cookbook (narrativa, sem
  negativo, rewriting); SD Stability/toolkit (positive/negative, resolução);
  Firefly helpx.adobe (conciso sujeito+descritores, sem cap inventado);
  Imagen ai.google.dev (sujeito→contexto→estilo, posição/fonte);
  Nano Banana DeepMind (Subject→Composition→Action→Location→Style);
  Ideogram docs (teto 150-160w, frases, aspas, EN p/ texto, Magic/JSON);
  Flux docs.bfl.ai (**SEM negative**: positive framing, ordem, 30-80w, hex);
  Recraft docs (teto 1000ch, text_layout bbox); Leonardo guides (lista vírgulas,
  estilo primeiro, character ref); Qwen help.aliyun (negative_prompt,
  prompt_extend); Seedream ByteDance (fórmula + layout mensurável);
  Hunyuan handbook (prioridade sujeito→técnico); ERNIE Baidu (fórmula + aspas +
  negative_prompt); Grok docs.x.ai (natural, sem params); Meta ai.meta.com
  (conversa, `imagine`, detalhe). Whisk/Mixboard/Stitch/Kling/Luma: sem doc
  pública — heurística marcada. Novo motor exige doc-fonte antes do perfil.
  Helpers: `MJ_ASPECT` (`--ar X:Y`), `DESCRIBE_ASPECT` (frases), `SD_RES`,
  `DALLE_SIZE`. Negativo: default só SD/Leonardo; Flux `noNegative` → framing
  positivo; MJ → `--no` no fim.
- Hierarquia nos prompts: **função da sessão > sintaxe do motor > protocolo
  visual > inglês técnico obrigatório**.

---

## 4. As 28 sessões (contrato completo)

Legenda: **T** = badge Texto (copiar e colar) · **I** = badge Prompt imagem
(prompt EN p/ outra IA). `S` = serviço, `C` = componente.
Template por sessão: PARA QUE SERVE / QUANDO USAR / INPUTS / SERVIÇO / DIVISOR /
BADGE / EXEMPLO / BLOQUEIOS.

### Estratégia
1. **Sessão de Ideias** — `C IdeaSession` / `S strategy/ideas.generateIdeaSessionService(niche, language, preSnippets?)` (orquestradora: 4 seções em paralelo) + `generateCopyIdeasService` / `generateTrendsService` / `generateContentFormatsService` / `generateEnemiesService` (botões Gerar por aba, ~1,5-2k tok cada). **T**.
   PARA QUE SERVE: virar nicho em pauta completa (tendências, hashtags, 12 copies
   Topo/Meio/Fundo em texto, formatos, inimigos comuns, fontes). QUANDO USAR:
   início de funil, calendário de conteúdo.
   INPUTS: `nicho` (texto, ex: `marketing para dentistas`); seletor de escopo
   `geral/noticias/academico/auto` (default `geral`, persistido em
   `copymaster_research_scope:v1`); aba `Pesquisa Instantânea` com filtro
   `top/recent/papers/news` (custo 0 via `quickResearch`, rank TF + recência,
   cache 6h com chave por escopo).
   OUT: **JSON** `{trends[{title,description,analysis}], hashtags{instagram,tiktok,linkedin,twitter,seoKeywords}, contentIdeas[12: 4 Topo/4 Meio/4 Fundo, cada uma com hook+headline+body+cta], contentFormats{infographic[2],video_script[2],article[2]}, commonEnemies[6: medo|erro|irritacao|mito|vilao|desculpa + angle + exampleHook], sources}` —
   **sem divisor por design** (não exigir `NOTA_DIVIDER` aqui).
   OTIMIZAÇÃO VELOCIDADE: usa `GOLDEN_IDEAS_SLIM` (subconjunto ~137 tok com
   marcador `REGRAS DE OURO`, que impede `callAI` de prefixar a Constituição
   integral de 3376 tok) + limites rígidos no prompt (hook 100/headline 100/
   body 600/cta 100/outline 400/angle 180/hashtags 6 por rede) + slices de
   contrato (formats 2, enemies 6) + `maxTokens: 8192` (via `callAI`, evita
   truncamento no default 4k dos `:free`) + `minItems` no schema
   (contentIdeas 9, enemies 4) + `tryParse` rejeita cauda vazia (força repair
   em vez de vazio silencioso). Economia medida: −12.954 chars (~3.200 tok)
   no input por chamada; teto de output 70k→~29k chars (típico ~20k).
   EXEMPLO: IN `odontologia estética` → OUT 7 abas (Pesquisa, Ideias de Copy,
   Conteúdo, Inimigo Comum, Tendências, Hashtags, Fontes) + cards com
   `Desenvolver no Editor` / `Desenvolver na Edição` (exporta para `sharedContext`).
2. **Copywriting Pro** — `C CopyGenerator` / `S copy/general.generateCopyService(params + {briefingContent, language, targetLength})` (+ `generateCorrectionService` p/ correção). **T**.
   INPUTS: `platform` (Campo de Batalha), `type` (Formato), `funnelStage`,
   `methodology` (AIDA/PAS/StoryBrand...), `tones[]` multi, `mentalTriggers[]`
   multi, `objective`, `targetLength` (chars), `briefingType` (ideia/referência/
   imagem/pdf) + `simpleInput/referenceInput` + persona ativa (prefixo automático).
   Aux: `analyzeImageContextService` / `analyzePdfContextService`.
   OUT: **2 variações texto puro** `|||DIVIDER|||** + nota (`splitCopyVariants` +
   `stripCopyMarkdown`). Bloqueio vazio no botão.
   EXEMPLO: IN `Instagram/Post/Topo/AIDA + "Curso de inglês para adultos"` →
   OUT 2 abas + modal `Ver Estratégia`.
3. **NotebookLM** — `C NotebookLMStudio` / `S strategy/notebook.generateNotebookLMService({mode, objective, context, language})`. **T**.
   INPUTS: `mode` (`source_creator`/`audio_instruction`), `objective` (8 cards:
   Resumo Áudio, Roteiro Vídeo, Mapa Mental, Relatório, Flashcards, Quiz,
   Infográfico, Slides), `localContext` (ideia principal).
   OUT: fonte pronta p/ colar no NotebookLM + NOTA.
   EXEMPLO: IN `Mapa Mental + "fotossíntese para 8º ano"` → OUT bloco fonte + nota.
4. **Personas** — `C PersonaManager` / `S strategy/personas.generatePersonasService({form, quantity, language})`. **T**.
   INPUTS manual: `currentPersona{name*,description,audience,tone,vocabulary,mission,visuals}`;
   auto: `autoGenForm{niche,business,product,pain,differential,location,additionalInfo}` +
   `autoGenQty` (1-3); retrato: `portraitConfig{ai, style, ratio}`.
   OUT: `{personas[{id,name,description,audience,tone,vocabulary,mission,visuals}]}` JSON + nota.
   Retrato via `generateImagePromptService` (só `parts[0]` vira prompt).
   EXEMPLO: IN `Fitness + App de treino` → OUT grid cards + botão `ATIVA`
   (prefixa o Copy) + aba portrait EN.

### Vendas
5. **Email Marketing** — `C EmailStudio` / `S copy/email.generateEmailSequenceService({...params, context, language})`. **T**.
   INPUTS: `type` (Boas-vindas...), `count` (1-5), `tone`, `senderName`,
   `targetAudience`, `localContext` (oferta).
   OUT: `|||EMAIL_DIVIDER|||** (N e-mails) + `|||NOTA_DIVIDER|||** por bloco.
   EXEMPLO: IN `Boas-vindas x3 + "Lançamento curso confeitaria"` → OUT abas
   `Email 1..N` + estratégia amarela inline.
6. **Roteiro VSL** — `C VSLStudio` / `S copy/vsl.generateVSLService({...params, context, language})`. **T**.
   INPUTS: `framework` (Benson/Georgi/Hormozi...), `productName*`, `mainPain`,
   `uniqueMechanism`, `offer`, `guarantee`, `localContext*`.
   OUT: fala pura teleprompter + NOTA; **proibido `[Cena N]`**.
   EXEMPLO: IN `Método Recomeço + mulheres endividadas` → OUT bloco corrido + nota.
7. **Landing Pages** — `C LandingPageStudio` / `S copy/landingPage.generateLandingPageService` (+ `generateLandingPageTechPromptService` p/ vibe-coding). **T**.
   INPUTS: `mode` (content/tech), `type`, `style`, `framework`, `productName*`,
   `promise`, `offer`, `targetAudience`, `targetPlatform` (22 VIBE_CODING),
   `techParams{visualStyle, sections, interactivity}`, `localContext`.
   OUT content: wireframe Hero/Prova/Oferta + nota (regex `NOTA DO ESTRATEGISTA:`);
   OUT tech: bloco mono p/ Lovable/v0 (só Copiar, sem nota).
8. **Gestor de Ads** — `C AdsStudio` / `S copy/ads.generateAdsService({...params, context, language})`. **T**.
   INPUTS: `platform` (Meta/Google/TikTok...), `goal`, `productName*`, `offer`,
   `targetAudience`, `localContext*`.
   OUT: `|||ADS_DIVIDER|||** (3 A/B) + nota global.
9. **Sexy Canvas** — `C SexyCanvas` / `S strategy/sexyCanvas.generateSexyCanvasService(sin, context, language)`. **T**.
   INPUTS: `selectedSin` (Luxúria/Gula/Avareza/Preguiça/Ira/Inveja/Orgulho),
   `localContext*` (produto). OUT: copy visceral no pecado + NOTA.

### Vídeo social (estados 100% locais por suite — nunca vazam entre si)
10. **TikTok Studio** — `C TikTokSuite` / `S social/tiktok.generateTikTokService({mode,duration,style,engine,aspectRatio,customText,context,language})`. Badge dinâmico.
    Modos `viral_script|tiktok_shop|seo|cover`. Cover usa o roteiro gerado como
    `[FONTE DE DADOS OBRIGATÓRIA]` + `coverConfig{engine,style,ratio 9:16,customText}`.
    `shopParams{productName,targetAudience,painPoint,keyBenefit,offerCTA}`.
    Texto via `|||NOTA_DIVIDER|||`; cover via `splitVisualResult`.
    EXEMPLO: IN `viral_script + "5 dicas de organização"` → OUT roteiro fala pura.
11. **Reels Studio** — `C ReelsSuite` / `S social/reels.generateReelsService` (mesmo padrão; ratio default 4:5).
    Modos `viral_script|sales_promo|seo|cover`. Nota rotulada `Growth Lab`.
12. **YouTube Studio** — `C YouTubeSuite` / `S social/youtube.generateYouTubeService({type,duration,style,engine,aspectRatio,customText,context,language})`. Badge dinâmico.
    `script|seo|thumbnail`. `seo/thumbnail` herdam `outputs.script.text` como fonte.
    Thumb: **framework MrBeast** (3 elementos, emoção extrema, contraste anti-UI,
    texto 3-5 palavras complementar, rosto dominante) → 3 opções
    `|||YT_OPTION_DIVIDER|||** + **nota rica em 2ª chamada dedicada** (parâmetros,
    o que/como/porquê, A/B; parse `splitVisualResult` + `splitOptions(...,3)`).
    Compartilhar `sharedContext` entre suites é só por import explícito do usuário.

### Visual & Design (saída EN salvo legenda; sempre com EngineLink)
13. **Logo** — `C LogoStudio` / `S visual/logo.generateLogoBriefService({...params, context, language})`. **I**.
    INPUTS: `brandName*`, `niche` (via localContext), `archetype`, `style`,
    `platform`, `artistInfluence`, `designerStyle`, `aiModel`, ratio 1:1.
    OUT: `|||LOGO_OPTION_DIVIDER|||** (2) + nota (`splitVisualResult` +
    `splitOptions(...,2)`; aba 2 oculta se vazia) + Preview real
    (`callAI gemini-2.5-flash-image`). Aspecto/overlay da marca sempre fluem.
14. **Carrossel** — `C CarouselGenerator` / `S social/carousel.generateCarouselService({...params, context, referenceImages, referenceMode, language})`. **I**.
    INPUTS: `slideCount` 3-10, `style`, `platform`, `aiModel`, `aspectRatio`,
    `footer` (@usuario), `customText` (hook), `localTopic*`, `refImages[]`.
    OUT: `|||SLIDE_DIVIDER|||`; por lâmina: COPY PT + VISUAL PROMPT EN + nota.
15. **Capa de Revista** — `C MagazineCoverStudio` / `S visual/magazine.generateMagazineCoverService({...params, context, referenceImages, referenceMode, language})`. **I**.
    INPUTS: `magazine` (19 presets), `mood` (19), `headline`, `subheadline`,
    `footerText`, `aiModel`, `localContext*` + upload foto (resize 1024,
    `refMode=high_fidelity`).
    OUT: prompt EN único começando com **Regra #6: `Usar a imagem em anexo...`** + nota.
16. **Frases (Quote)** — `C QuoteGenerator` / `S social/quote.generateQuoteCardService({count,style,context,platform,aspectRatio,footer,aiModel,customText,referenceImages,referenceMode,language})`. **I**.
    INPUTS: `count` (fixo 3), `style`, `aiModel`, `aspectRatio`, `platform`,
    `footer`, `customText` (frase pronta opcional), `localTopic`, `refImages`.
    OUT: `|||QUOTE_DIVIDER|||** + NOTA (`splitVisualResult` + `splitOptions(...,3)`).
    EXEMPLO: IN `disciplina` ou `"Feito é melhor que perfeito"` → OUT N abas
    (legenda PT + visual EN + watermark).
17. **Citações Verificadas (Citation)** — `C CitationGenerator` / `S social/citation.generateCitationService` + `S social/citationVerify.verifyCitationService` (juiz batch 2º pass, selo por opção). **I**.
    INPUTS: `areaId` (16 + auto), `author` (`getAuthorsByArea`, auto=todos),
    `tone` (15), `source` (10), `count`, `style`, `platform`, `aspectRatio`,
    `footer`, `context`, `showAuthor` (toggle ON default), modelo visual opcional
    (`modelMode none/link/upload/preset`, `modelLink/modelImage/modelDna/modelRef`).
    OUT: `|||CITATION_DIVIDER|||** (N) + NOTA com ficha técnica + ficha de
    verificação. Selos: `CONFIRMADA` / `TRADUCAO-LIVRE` / `FALSA` / `DUVIDOSA`.
    Modelo: `api/pin.ts` resolve Pin (og:image, rejeita `/ideas/`),
    `S vision/modelDna.analyzeModelImage` (Gemini, cache session) +
    `buildModelDnaBlock` (tradução por motor),
    `S pinterestRef.buildReferenceRule` (Gemini vê pixels, outros preset+link);
    sem modelo = sem preset no prompt. Custo: 2 calls.
18. **Lettering** — `C LetteringStudio` / `S visual/lettering.generateLetteringService({...params, context, footerText, language})`. **I**.
    INPUTS: `text*` (frase protagonista), `style` (20), `technique` (23),
    `surface` (25), `composition` (19), `platform`, `aiModel`, `aspectRatio`
    (1:1 default), `footer`, `localContext` — exige `text OU localContext`.
    OUT: `|||LETTERING_DIVIDER|||** (2) + nota.
19. **HQ/Comic** — `C ComicGenerator` / `S creative/comic.generateComicService` (+ `generateComicNoteService` sob demanda). **I**.
    INPUTS: `style` (~50 PT: Ziraldo, Kirby, Shonen...), `layout` (18),
    `aiModel`, `platform`, `aspectRatio`, `footer`, `localStory*`, `refImages`.
    OUT: `PAINEL→AÇÃO→DIÁLOGO→PROMPT IA` (roteiro PT + prompt EN; gramática
    painel/tier/sarjeta). Botão "Ver Nota / Gerar nota" (2ª chamada) + modal —
    a nota SEMPRE é verificável.
20. **Fábrica de Memes** — `C MemeGenerator` / `S social/meme.generateMemeService({...params, context, referenceImages, referenceMode, language})`. **I**.
    INPUTS: `style` (~45 PT: Flork/Wojak/Gretchen...), `format` (~40: Drake,
    Distracted...), `aiModel`, `platform`, `aspectRatio` (1:1), `footer`
    (watermark), `localContext*`.
    OUT: `|||MEME_DIVIDER|||** (2) + nota. Teoria: setup→punch, fidelidade ao
    template, legenda PT + visual EN.
21. **Infográfico** — `C InfographicGenerator` / `S creative/presentation.generateInfographicService({...params, context, referenceImages, referenceMode, language})`. **I**.
    INPUTS: `style` (14), `layout` (11), `aiModel`, `platform`, `aspectRatio`,
    `footer`, `localData*` (tópico/dados brutos).
    OUT: plano único (hierarquia + visual por bloco) + NOTA (sem `SLIDE_DIVIDER`).
22. **Apresentação (PPT)** — `C PresentationGenerator` / `S creative/presentation.generatePresentationService({...params, context, language})`. Badge `Texto` (corrigido de `outputKind="image"`: a saída é roteiro texto).
    INPUTS: `platform` (8), `slideCount` (5/8/10/12/15/20/25), `style` (8),
    `purpose`/`audience` (8), `localData*`.
    OUT: `[SLIDE NN: TÍTULO]` obrigatório por lâmina + NOTA.
23. **Media Prompts** — `C MediaPrompts` / `S visual/image.generateImagePromptService` + `S visual/video.generateVideoPromptService` + `S creative/audio.generateAudioScriptService/generateSunoPromptService` + `platformProfiles`. Badge dinâmico.
    INPUTS imagem: `ai` (22 IMAGE_AIS), `style`, `ratio`, `text`, `footer`,
    `platform`, `localContext*`; vídeo: `aiModel` (10 VIDEO_AIS), `duration`
    (5s/10s), `ratio`, `style` (14), `sceneCount` (1-5), `text`; áudio:
    `provider` (9 TTS de `TTS_PLATFORMS`), `voice` (banco só-PT-BR filtrado por
    modelo; `auto` = IA escolhe), `model` (por plataforma/família), `duration`
    (seletor 10–120s step 5, hint "≈ N palavras" @156 ppm);
    música: `mode`, `style` (18 Suno), `mood` (15).
    OUT imagem (matriz 10-steps) / vídeo (`|||SCENE_DIVIDER|||` por cena) /
    áudio (config JSON da plataforma com `duration_seconds`/`target_words` já
    preenchidos + `|||CONFIG_END|||` + roteiro no alvo de palavras + NOTA; a UI
    exibe o COMANDO **completo**, config visível) / música (prompt Suno) + NOTA.
24. **Inspiração** — `C InspirationStudio` / `S social/inspiration.generateInspirationService({category,subCategory,visualStyle,platform,format,quantity,aiModel,aspectRatio,footer,bgColor,fontColor,texture,context,language})`. **I**.
    INPUTS: `category/subCategory` (10 categorias, `id` estável), `visualStyle`,
    `platform`, `quantity=3`, `aiModel`, `aspectRatio`, `footer`, `bgColor/fontColor`
    (26 cores), `texture` (32), `localContext*`.
    OUT: `|||INSP_DIVIDER|||** (3) + NOTA; exige **citações reais verificadas**
    (Item 32; pode bloquear por Item 18).
25. **Animação Adulta** — `C AdultAnimationGenerator` / `S creative/comic.generateAdultAnimationService({...params, context, referenceImages, referenceMode, language})`. **T**.
    INPUTS: `style` (alias comic), `format` (11), `aiModel`, `platform`,
    `aspectRatio`, `footer`, `localPremise*`.
    OUT: roteiro humor ácido (Regra de Três) + NOTA.
26. **Artigos** — `C ArticleGenerator` / `S copy/article.generateArticleService({...params, context, language})`. **T**.
    INPUTS: `type` (11: Blog Post...), `tone`, `citeSources`, `includeBibliography`,
    `targetLength`, `writerStyle` (Journalist/Copywriter/Prompt Engineer/Editor),
    `localTopic*`.
    OUT: artigo SEO+AEO + `|||SCHEMA_DIVIDER|||** (JSON-LD, toggle Ver JSON-LD) + NOTA.
27. **PRD Vibe Studio** — `C PRDStudio` / `S copy/prd.generatePRDService(params + {businessName*, niche*, promise*, audience*, q1..q5?, siteRefUrl?, siteDnaBlock?, language})`. **T**.
    INPUTS: negócio (`name/niche/promise/audience*` + `differential`), 5 Qs opcionais (accordion; puladas viram `[ASSUNÇÃO]` na Nota), site ref opcional (`siteRefUrl` https + `screenshots[]` 1024 → `GET /api/scrape` texto/SEO + `analyzeSiteImage` SITE_DNA visão; DNA **sobrescreve** Automático), `prdType` (LP Conversão/Institucional/One-pager/Docs/Custom), `prdPlatform` (21 VIBE_CODING), `sections[]` checklist IA, `tone/methodology`, estilo override (`visualStyle/bgColor/fontColor/texture` — perde p/ DNA), `integrations` (só estático), `localContext`.
    OUT: PRD.md PT-BR P0-P2 + `|||PRD_DIVIDER|||** (tokens.json) + `|||NOTA_DIVIDER|||` (decisões + `[ASSUNÇÕES]` + riscos); abas `PRD/Tokens` + `Exportar p/ Centro` (alimenta Landing tech). Bloqueio vazio no botão.
    EXEMPLO: IN `Studio Lume + estética premium + linear.app` → OUT PRD PT-BR + tokens hex + nota.
28. **Auditoria V24** — `C StressDiagnostic` / `S tools/diagnostic.runStressTestService(modId, language, mode)`. Ferramenta sistema (sem badge).
    24 módulos no código (`ideas,copy,notebook,personas,email,vsl,lp,ads,sexy,tiktok,reels,youtube,carousel,logo,magazine,quote,citation,lettering,comic,meme,infographic,article,ppt,prd`)
    executam o **serviço real** com briefing-marcador (`ZAFRA-42`, Café ZAFRA-42
    p/ baristas) e asserts determinísticos (sem saudação 40c, divisor exato,
    marcador do seletor case/acento-insensível, nota isolada, corpo mínimo).
    Fora do harness: Media (matriz + SCENE), Inspiração (pode bloquear),
    Animação Adulta e a própria Auditoria (recursão). O rótulo "V24" acompanha os 24 módulos (era V23 com 23, antes de prd virar módulo próprio).
    Modos: **rápida** (24 chamadas) / **completa** (+juiz LLM = 48,
    `det*0,7 + juiz*0,3`). Botão "Re-testar Reprovados" (honesto; sem placebo).
    OUT: dashboard compliance + cards por categoria + modal `Inspecionar RAW`.

### Assinaturas literais dos serviços (params por sessão)
Todos os serviços seguem `(params: XParams, onChunk?: (text: string) => void)`,
exceto onde indicado. `params: any` no código — os campos reais abaixo foram
extraídos via `grep params.*` de cada serviço (fonte canônica em caso de dúvida).

```ts
// copy/general.ts
interface CopyParams { briefingContent: string; funnelStage?: string; methodology?: string;
  tones?: string[]; mentalTriggers?: string[]; objective?: string; targetLength?: number; language: string; }
// generateCopyService(params: CopyParams, onChunk?) / generateCorrectionService(params, onChunk?)
// Aux: analyzeImageContextService(base64Image: string, language: string)
//      analyzePdfContextService(base64Pdf: string, language: string)

// strategy/ideas.ts — SEM divisor (JSON)
generateIdeaSessionService(niche: string, language: string, preSnippets?: any[])

// strategy/notebook.ts
interface NotebookParams { mode: 'source_creator' | 'audio_instruction'; objective: string;
  context: string; language?: string; }

// strategy/personas.ts — SEM divisor no CRUD (JSON)
interface PersonasParams { form: { niche: string; business?: string; product?: string; pain?: string;
  differential?: string; location?: string; additionalInfo?: string }; quantity: 1 | 2 | 3; language?: string; }

// strategy/sexyCanvas.ts
generateSexyCanvasService(sin: string, context: string, language: string, onChunk?)

// copy/email.ts
interface EmailParams { type: string; count: number; tone?: string; senderName?: string;
  targetAudience?: string; context: string; language: string; }

// copy/vsl.ts
interface VSLParams { framework: string; productName: string; uniqueMechanism?: string;
  offer?: string; guarantee?: string; mainPain?: string; context: string; language: string; }

// copy/landingPage.ts
interface LandingParams { type?: string; style?: string; framework?: string; productName: string;
  promise?: string; offer?: string; targetAudience?: string; targetPlatform?: string;
  visualStyle?: string; sections?: string; interactivity?: string; context: string; language: string; }

// copy/ads.ts
interface AdsParams { platform: string; goal?: string; productName: string; offer?: string;
  targetAudience?: string; context: string; language: string; }

// copy/prd.ts
interface PRDParams { businessName: string; niche?: string; promise?: string; audience?: string;
  differential?: string; tone?: string; methodology?: string; prdType?: string; prdPlatform?: string;
  sections?: string[]; integrations?: string; visualStyle?: string; bgColor?: string; fontColor?: string;
  texture?: string; siteRefUrl?: string; siteDnaBlock?: string;
  q1?: string; q2?: string; q3?: string; q4?: string; q5?: string;
  context?: string; language?: string; }
export const PRD_DIVIDER = '|||PRD_DIVIDER|||'; // PRD ↔ tokens.json

// social/tiktok.ts + social/reels.ts
interface ShortVideoParams { mode: string; duration?: number; style?: string; engine?: string;
  aspectRatio?: string; customText?: string; context: string; language: string; }

// social/youtube.ts
interface YouTubeParams { type: 'script' | 'seo' | 'thumbnail'; duration?: number; style?: string;
  engine?: string; aspectRatio?: string; customText?: string; context: string; language: string; }

// visual/logo.ts
interface LogoParams { brandName: string; niche?: string; archetype?: string; style?: string;
  platform?: string; artistInfluence?: string; designerStyle?: string; aiModel?: string;
  aspectRatio?: string; context: string; language: string; }

// social/carousel.ts
interface CarouselParams { slideCount: number; style?: string; platform?: string; aiModel?: string;
  aspectRatio?: string; footer?: string; customText?: string; context: string;
  referenceImages?: string[]; referenceMode?: string; language: string; }

// visual/magazine.ts
interface MagazineParams { magazine: string; headline?: string; subheadline?: string;
  footerText?: string; mood?: string; aiModel?: string; context: string;
  referenceImages?: string[]; referenceMode?: string; language: string; }

// social/quote.ts
interface QuoteParams { count: number; style?: string; aiModel?: string; aspectRatio?: string;
  platform?: string; footer?: string; customText?: string; context: string;
  referenceImages?: string[]; referenceMode?: string; language: string; }

// social/citation.ts (1º pass) + citationVerify.ts (2º pass, 1 call p/ todas)
interface CitationParams { count: number; style?: string; area?: string; author?: string;
  tone?: string; source?: string; platform?: string; aspectRatio?: string; footer?: string;
  context?: string; showAuthor?: boolean; useModel?: string; modelLink?: string;
  modelImage?: string; modelDna?: object; modelRef?: object; aiModel?: string; language: string; }
verifyCitationService(
  candidates: Array<{ quote: string; author: string; work: string }>,
  language?: string, provider?: string): Promise<CitationCheck[]>

// visual/lettering.ts
interface LetteringParams { text: string; style?: string; technique?: string; surface?: string;
  composition?: string; platform?: string; aiModel?: string; aspectRatio?: string;
  footer?: string; context?: string; footerText?: string; language: string; }

// creative/comic.ts (HQ + animação; nota via 2ª chamada)
interface ComicParams { style?: string; layout?: string; format?: string; aiModel?: string;
  platform?: string; aspectRatio?: string; footer?: string; context: string;
  referenceImages?: string[]; referenceMode?: string; language: string; }
generateComicNoteService(params: ComicParams, scriptText: string)

// social/meme.ts
interface MemeParams { style?: string; format?: string; aiModel?: string; platform?: string;
  aspectRatio?: string; footer?: string; context: string;
  referenceImages?: string[]; referenceMode?: string; language: string; }

// creative/presentation.ts (infográfico + PPT)
interface PresentationParams { platform?: string; slideCount?: number; style?: string;
  purpose?: string; audience?: string; context: string;
  referenceImages?: string[]; referenceMode?: string; language: string; }

// visual/image.ts + visual/video.ts + creative/audio.ts (Media)
interface ImagePromptParams { ai?: string; aiModel?: string; style?: string; ratio?: string;
  aspectRatio?: string; text?: string; customText?: string; footer?: string; platform?: string;
  context: string; language: string; }
interface VideoPromptParams { aiModel?: string; duration?: string; ratio?: string; aspectRatio?: string;
  style?: string; sceneCount?: number; text?: string; customText?: string; platform?: string;
  context: string; language: string; }
interface AudioParams { provider: string; voice?: string; model?: string; duration?: number;
  mode?: string; style?: string; mood?: string; context: string; language: string; }
// provider = id de TTS_PLATFORMS (9); voice = id da voz ('auto' = IA escolhe);
// duration = segundos 10–120 (clamp) → targetWords = round(seg × 2,6);

// social/inspiration.ts
interface InspirationParams { category: string; subCategory?: string; visualStyle?: string;
  platform?: string; format?: string; quantity?: number; aiModel?: string; aspectRatio?: string;
  footer?: string; bgColor?: string; fontColor?: string; texture?: string;
  context: string; language: string; }

// copy/article.ts
interface ArticleParams { type?: string; tone?: string; citeSources?: boolean;
  includeBibliography?: boolean; targetLength?: number; writerStyle?: string;
  context: string; language: string; }

// tools/diagnostic.ts
type AuditMode = 'rapida' | 'completa';
runStressTestService(moduleId: string, language: string, mode?: AuditMode): Promise<StressTestResult>
// AUDIT_MODULE_IDS.length === 24 (fora do harness: media, inspiration, adultAnimation, stress)

// tools/refinement.ts + tools/aiDetection.ts
refineCopyService(params: { originalText: string; instruction: string; language: string;
  platform?: string; targetLength?: number })
checkAIProbabilityService(text: string, language: string): Promise<AICheckResult>
humanizeTextService(text: string, language: string, signals?: AISignalHit[])

// visual/platformProfiles.ts
buildPlatformBlock(engineName?: string,
  opts?: { aspectRatio?: string; customText?: string; negative?: string }): string
getPlatformProfile(engineName?: string): PlatformProfile

// core/aiClient.ts
callAI(prompt: string, systemInstruction?: string, defaultModel?: string,
  onChunk?: (text: string) => void,
  config?: { provider?: string; images?: string[]; tools?: any[]; responseMimeType?: string;
    responseSchema?: any; aspectRatio?: string; tempApiKey?: string;
    taskType?: 'text' | 'visual' }): Promise<{ text: string; error?: string; imageUrl?: string }>
```
> Se um campo novo for adicionado ao serviço, atualize a interface aqui
> na mesma PR (contrato doc↔código).

### Sistema (fora das 28 — botões, não tabs)
- **TokenDashboard** (`wallet`, 282 linhas, 100% local): grid provedores
  (sem chave = `opacity-60 grayscale`), donut ciclo (`getCurrentCycleUsage`,
  verde<75/amarelo<90/vermelho), limites + `renewalDay` editáveis, diagnóstico
  por provider (`testConnection`), cards Entrada/Saída, auto-refresh 15s.
- **SettingsCenter** (`settings`, 457 linhas): status 9Router (fetch
  `localhost:20128/v1/models` 2s), motores primários (2 selects →
  `localStorage primary_text/prompt_provider`), pool `:free` OpenRouter
  (multi-seleção `openrouter_free_pool` + `lastModel`), cards provider
  (`mainLLMs` 11 + `otherLLMs` 18 + `mediaEngines` 3) com selo `.env` (sky) vs
  `Cofre` (emerald), input password + `Pegar Chave` (link oficial),
  `corsWarning→Proxy`, campo extra `cloudflare_account_id`, `Testar`
  (`testConnection`) / `Adicionar` (testa antes de gravar) / `Salvar`
  (percorre keys, placeholder = skip, testa antes, grava cofre + `.env`,
  resumo no botão) / `Resetar Cache` (`localStorage.clear+reload`).
  Constituição V20 em modal.
- **WelcomeScreen** (`home`): hero + 5 grupos de cards (`onNavigate`) + footer.

---

## 5. Verificar IA / Humanizar (`tools/aiDetection.ts` + `tools/textForensics.ts` + toolbar)
- **Forense local** vive em `tools/textForensics.ts` (puro, 0 rede/0 quota;
  testado direto no Node por `e2e/humanizer-local.spec.ts`): taxonomia PT-BR
  de 8 famílias + `quickLocalScan()` (literal **+ léxico `data/slopPT.ts`
  ~75 entradas + 7 estruturas regex + caracteres invisíveis**; conta todas as
  ocorrências e deduplica por índice quando literal e estrutura apanham a mesma
  passagem). Famílias novas: `slop_lexico`, `caracteres_invisiveis`,
  `mobilizacao_forcada`, `auto_revelacao_ia`, `pergunta_retorica`, `parede_emoji`.
  Léxico: `safe:true` = substituição mecânica permitida (invariante ou com
  variantes de gênero/número); `safe:false` = só sinaliza. Estruturas regex
  (trio/dualidade/hashtags/bait/pergunta retórica/parede de emoji) **nunca**
  são substituídas — só viram evidência.
- `checkAIProbabilityService` → `{score, band, signals, reason, caveat, mode}`
  (faixas: <40 humano, 40-69 misto, ≥70 provável IA). Badge clicável no toolbar
  abre painel de sinais (família, count, evidência 120c + caveat). O prompt do
  perito recebe **EVIDÊNCIA LOCAL MEDIDA** (contagens + trechos + ritmo
  `burstinessOf` CV) em vez de dica genérica — ele julga sobre números.
- **Fallback honesto**: se o perito LLM falhar (quota/rede/JSON inutilizável),
  devolve `localEstimate()` (determinístico: densidade de sinais/100 palavras +
  uniformidade de frases) com `mode:'local'` e caveat explícito — a toolbar
  avisa "heurística local, não veredito". **Verificar IA nunca fica bloqueado**
  (§8: erro vira aviso visível, nunca silêncio).
- `HUMANIZE_THRESHOLD = 70`: **Humanizar auto-verifica** (reusa se texto inalterado);
  abaixo de 70 bloqueia com aviso e não altera nada; a partir de 70 aplica
  **passo 0 determinístico** `autoCleanText()` (remove invisíveis + troca só os
  termos `safe` do léxico, com caixa preservada — em dash/aspas curvas são
  tipografia PT legítima e não são tocados) e depois a cirurgia LLM guiada
  pelos sinais ordenados por count (**PRIORIDADE #1 = maior count**; preserva
  fatos, `[INSERIR DADO]` em vez de inventar). Saída passa por
  `stripInvisibleChars()` de cinto-e-suspensório, re-mede o delta
  (`IA X% → Y%`) e reporta a pré-limpeza no aviso (`Pré-limpeza: N termo(s)`).
- Toolbar: quick actions (Expandir/Encurtar/Simplificar/Emojis via
  `refineCopyService`; `cleanAIOutput` corta divisores/prefixos/`Aqui está...`),
  custom + meta de caracteres (meta só vale p/ custom/Transformar), Transformar
  (pivot por plataforma/metodologia/funil/tom), PDF (`downloadPDF`: jsPDF header
  16pt, paginação, rodapé `Gerado por CopyMaster AI`), TTS, Contexto Global
  (`setSharedContext` + alert), Copiar (`clipboard` + contagem).
- `useAIGenerator`: `isQuotaError()` normalizado (quota/429/402/credit/rate/
  tier_not_allowed/free-models-per-day); quota→`setGlobalError` (modal
  `QuotaErrorModal`, que exibe a mensagem real); resto→erro local friendly
  (`toFriendlyError`, nunca JSON cru). `generateStream` entrega `onChunk` final
  mesmo para providers blocking (idempotente).

---

## 6. Testes e QA
- Determinísticos (sem quota): `smoke` (21 linhas: `#root`, título, 1º botão,
  375×667 e 1920×1080), `qa-core` (home sem `pageerror`, Ideas bloqueia
  nicho vazio, 28 tabs renderizam >200 chars — escopar ao visível por causa do
  keep-alive `display:none`, `AxeBuilder` zero `critical`, falha total providers
  via `route.abort` → `div.bg-red-950` friendly sem `{"object"` + botão Centro),
  `redteam` (injection/vazio/gigante/URL/duplo-clique/research-down, 0 quota),
  `i18n` (EN/ES/PT + 28 tabs), `a11y-tabs` (Axe zero critical 6 tabs +
  skip-link + teclado), `prompt-harvest` (payloads reais → `e2e-evidence/`),
  `server-proxy` (contrato do `/api/ai`: 405/403/400/SSRF/503 sem upstream +
  seam prod ON roteando a geração por `/api/ai` sem auth + seam dev OFF usando
  chamada direta — 9 testes, 0 quota),
  `humanizer-local` (8 testes: forense PT-BR puro no Node — gate 70 × faixa
  humano, estruturas regex, dedup léxico, autoClean, estabilidade 5×, vazio —
  + browser mock: fallback `mode:'local'` nunca bloqueia e humanizar com
  pré-limpeza/delta/saída sem invisível), `media-audio` (6 testes: catálogo TTS
  9 plataformas puro no Node — template com `{{duration}}/{{words}}`, 10s=26 /
  60s=156 / 120s=312 palavras, filtro voz×modelo, zero pt-PT — + browser mock
  provando duração/plataforma no payload e COMANDO completo visível).
  Suíte determinística = essas 19 specs
  (inclui `full-user`/`fallback`/`army-*` mockadas) com `--workers=1`: 97/97.
- Com quota `:free` (50/dia, reset diário): `user-full` (140 linhas, `retries:1`,
  hero + ≥20 `Acessar Módulo`, navega 28 tabs + wallet/settings, bloqueios,
  2 gerações reais — Ideas ~40KB/740s polling `Baixar Relatório`, Copy 340s
  `Variação 1` — erro sempre friendly), `mx-live` (harness manual de visuais com
  log `[MX:tag] LEN STAR DASH DIV PT EN`; não é spec permanente), matriz P1
  (harness Node quando browser trava), auditoria rápida (24 chamadas — agendar).
- Padrão de spec: briefing mínimo, asserts de formato (não de mérito), erros
  via `route.abort/fulfill`, `test.setTimeout` generoso (300-740s), workers ≤4.
- Armadilhas conhecidas: painéis keep-alive `display:none` no DOM (escopar
  asserts ao visível — `activeRoot` prefere `display:block` + `aria-hidden="false"`);
  Vite **reinicia ao gravar `.env`** (recarrega a página);
  modelo `:free` fraco oscila idioma/divisores (prompts exigem, parsers toleram).
  Spec mockada sem chave NÃO gera: `callAI` retorna erro antes do fetch e o
  `route.fulfill` nunca dispara (falha silenciosa, 0 quota gasta) — todo spec mock
  semeia em `beforeEach` via `addInitScript` a chave dummy `openrouter_api_key`
  (`e2e-mock-key-sem-quota`) + providers primários `openrouter`; briefing de teste
  nunca contém o marcador (input ecoa e o wait vira vácuo); throttle 2,5s/chave
  serializa a fase ideas (~12s) — waits pós-ideas com folga; Delta lock com
  `click({force:true})` e `--workers=1` (paralelo = OOM `Target closed`).

## 7. Checklist de mudança segura
1. `npx tsc --noEmit` → `npm run build` → smoke + qa-core.
2. `npm run doc:check` (ou `python3 scripts/check-anchors.py`) — trava
   doc↔código: 29 âncoras `arquivo:linha` + 3 invariantes (28 tabs,
   24 módulos, divisores). Se falhar, atualize o código ou este arquivo —
   nunca ignore a divergência.
3. Mexeu em prompt? Confira divisores exatos em linha própria + rode a sessão.
4. Mexeu em parse? Confira `stripCopyFormat` + caso sem divisor (fallback).
5. Mexeu em provider/chave? Confira `resolveEnvKey`, fallback e `friendlyErrors`.
6. Nada de segredo no código; audite o bundle (`npm run security:bundle` =
   `python scripts/check-bundle-secrets.py dist`) e nunca distribua build com
   `ALLOW_BUNDLE_SECRETS=1`.
7. Atualize ESTE arquivo se mudar contratos (incluindo §9 para subsistema novo).

## 8. Nunca fazer
- Chamar LLM fora de `callAI()`; expor chave em log/erro/UI; commitar `.env`.
- Reintroduzir `system:` top-level global (quebra Groq/Mistral/NVIDIA/Meta/Grok).
- Misturar nota no entregável; exigir `NOTA_DIVIDER` de ideas/personas (JSON).
- Compartilhar estado entre suites (cada uma tem seu `useState`; só import explícito).
- Botões que alegam ação que não executam (placebo); erros silenciosos
  (toda falha termina em `setError`/`setGlobalError`/alert friendly).
- Importar `data/*` direto no componente (usar `getLocalizedLists`); usar `label`
  de categoria como chave (usar `id` estável); chamar `buildPlatformBlock` com `{}`.
- Deixar skills/regras genéricas de agente (ex.: Everything Claude Code) sobrepor
  este arquivo: em conflito, **AGENTS.md vence**. As skills ECC são biblioteca de
  apoio sob allowlist em `opencode.json` (permissions `skill`), não contrato.

---

## 9. Subsistemas de apoio (com âncoras `arquivo:linha`)

### Chaves (`services/vaultService.ts` + Centro de Comando)
Cofre AES-GCM-256 em `localStorage` (`copymaster_vault:v2` + salt;
PBKDF2 100k SHA-256; IV 12 bytes). `setVaultKey` criptografa e remove legado
`*_api_key` (vazio deleta); `getVaultKey` migra legado sozinho. Por
navegador/perfil — não sincroniza, some se limpar dados do site.
`SettingsCenter → Salvar Configurações`: **testa a conexão antes**; se OK,
grava no **cofre (efeito imediato) + `.env` via `POST /api/env` (dev)**;
campo apagado remove dos dois; resumo exibido no botão.

### Proxy `/api/ai` (H1 fechado — produção sem segredos no bundle)
`api/ai.ts` (function Vercel + rota no plugin dev, mesmo canal `ssrLoadModule`
de pin/scrape/research): POST-only (405), Origin host==Host (403), rate 60/min
por IP (429 + `Retry-After`), corpo máx 6MB (413). Allowlist anti-SSRF rígida —
provider existe em `ENV_KEY_MAP`/`PROVIDER_CONFIGS`, `https:`, sem credenciais
nem porta, **host exato** do `cfg.url` (gemini restrito a
`generativelanguage.googleapis.com/v1beta/models/`),
`NEVER_PROXY = {9router,huggingface,runway,elevenlabs,stability}` → 400 (gateway
local: o servidor não alcança o localhost do usuário). Chave do servidor = pool
`base + _2.._9` lido de `process.env` **e** do arquivo `.env` (paridade dev/prod);
sem chave → 503 PT-BR (`... ausente no servidor ...`), nunca loga/retorna segredo.
Headers de auth do cliente são descartados; servidor injeta `Bearer`
(anthropic: `x-api-key` + `anthropic-version`; gemini: `x-goog-api-key`).
`forward()` retry 401/429 em até 3 chaves do pool, `redirect:'error'`, timeout
290s (504/502); repassa status/content-type/`retry-after`/corpo do upstream;
`export const maxDuration = 300`.
Cliente: `services/serverKeyService.ts` — sentinel `SERVER_KEY =
'__copymaster_proxy__'`; gate `useServerKeys()` = PROD (`import.meta.env.PROD`,
bundle sem segredos) OU flag `localStorage copymaster_server_keys` (`'1'` força,
`'0'` bloqueia). **Dev sem flag → `ensureServerKeys()` devolve `{}` sem rede**
(especificações intactas, 0 quota). Com gate ligado: GET `/api/env` (4s abort,
cache 60s / negativo 10s) filtra `NOT_PROXYABLE` e URL vazia → mapa
`{provider: tem-chave}`. `callAI` aquece `ensureServerKeys()` **antes** do rank
(`invalidateRankCache()` no transição frio→quente), prefere o sentinel na ordem
de chave primária e no loop de fallback (`doFetch`: sentinel → POST `/api/ai` com
auth removida; qualquer outra chave → `fetch` direto de sempre). Gemini com
sentinel vira REST v1beta não-streaming com fidelidade do SDK
(`systemInstruction`/`tools`/`responseSchema`/`imageConfig`/`maxOutputTokens`,
`responseModalities` em modelo `*image*`) — um único `onChunk` final.
`routerService.hasEnvKey` conta o mapa do servidor primeiro (sem isso a cadeia
de fallback da produção encolheria para só-cofre/legado). Specs:
`e2e/server-proxy.spec.ts` (9 testes, 0 quota).

### Provedores de LLM (`services/providerConfig.ts`, 32 entradas)
`Record<key,{name,url,defaultModel,link,description,howTo,corsWarning?}>`.
9Router local (`http://localhost:20128/v1/chat/completions`), NVIDIA, Polin,
Gemini (SDK, sem URL), OpenAI (`corsWarning`), Anthropic (headers próprios),
DeepSeek (`corsWarning`), Meta/Groq (mesma URL Groq, modelos `gpt-oss-120b`),
Mistral, Cohere, OpenRouter Hub, Qwen, Ernie, Moonshot, Yi, Zhipu/Z.AI, Grok xAI,
HyperCLOVA, Perplexity, HuggingFace (sem endpoint), Together, ElevenLabs (TTS),
Stability (imagem), Runway (vídeo), Cerebras (1M/dia), SambaNova, Chutes,
SiliconFlow, Nebius, Cloudflare (`{account_id}` → `localStorage
cloudflare_account_id`, sem ID = erro orientativo).
Gratuitos sem cartão: Groq, OpenRouter `:free`, Gemini Flash, Cerebras, SambaNova,
Chutes, SiliconFlow, Zhipu, Nebius (créditos), Cloudflare (10k req/dia).
`ENV_KEY_MAP` vive em `vite.config.ts` (dev) espelhado em `api/env.ts`
(prod readonly); `resolveEnvKey` em `aiClient.ts`, `hasEnvKey` em
`routerService.ts`. Ao adicionar provider, atualize os 4 + card em
`SettingsCenter` (`mainLLMs/otherLLMs`) — ver §16.
`/api/env` (plugin Vite em dev): GET mascarado (**só prefixo** `sk-o********` +
count do pool; antes era `4+***+4` com 4 finais expostos), POST grava/remove
(reinicia dev server). **Sem CORS `*`** (same-origin: era CSRF cross-origin +
leitura de mask por qualquer site aberto no browser do dev; o POST também
recusa chave com CRLF). **Em produção (Vercel) é read-only
(405)** — chaves vão no dashboard.
**SEGURANÇA (H1 FECHADO em 2026-09-30)**: `vite.config.ts → define` só embute
segredos quando `command === 'serve'` (dev local) ou `ALLOW_BUNDLE_SECRETS=1`
(escape efêmero, nunca distribuição). Em `vite build` — inclusive `vercel build`
local — todo segredo vira `""` (pools `*_LIST` viram `[]`); ficam de fora do
blanking só o catch-all `process.env` (→ `{}`) e os `LITELLM_MODEL_PRIMARY/FALLBACK`
(não-sensíveis). A autenticação em produção passa a ser server-side via proxy
`/api/ai` (ver "### Proxy `/api/ai`" acima). **Guard ativo (defesa em
profundidade):** `npm run build` ainda bloqueia se ARQUIVO `.env` tem chaves
(erro `BLOQUEADO`, vale também p/ `vercel build` local — a CLI seta `VERCEL=1`);
para bundle local efêmero use `ALLOW_BUNDLE_SECRETS=1 npm run build`
(PowerShell: `$env:ALLOW_BUNDLE_SECRETS="1"; npm run build`) e valide com
`npm run security:bundle` antes de distribuir. **O ALERTA H1 antigo morreu:**
chaves do dashboard da Vercel em `process.env` não chegam mais ao bundle (o
blanking é exatamente o `define` que as embutia). Prova de canário do gate:
mover `.env` → `OPENROUTER_API_KEY=sk-canary... GROQ_API=gsk_canary... npm
run build` → `grep sk-canary dist/` vazio + `npm run security:bundle` limpo →
restaurar `.env` (o guard volta a bloquear).

### Pool, ranking e carteira
- `keyPoolService.ts`: pool `base + _2.._9` (todos os 32 providers, até 9 chaves cada;
  `MAX_POOL_KEYS=9`), `getEnvKeyList` (1º `*_LIST` do build, senão varredura),
  `getApiKeys` (env + cofre, dedup), `keyFingerprint` p/ logs sem vazar,
  `isRetriableError` (**`status >= 500`**/401/429/402/404/400/410/403 +
  `tier_not_allowed/quota/rate/
  model_not_found...` sempre giram — 5xx entrou em 2026-09-30: um 502/503 do
  primário não pode abortar a cadeia, que é o que §2 promete), throttle 2,5s por chave.
- `routerService.ts`: `healthCache` TTL 60s (morto = 999999), `hasEnvKey`
  (32 providers, incl. `openai/anthropic/qwen/ernie` etc.), `rankProviders` (env ∪ cofre com url/gemini; score = quota
  restante + bônus openrouter+1M/9router+500k; desempate latência; `corsWarning`
  por último), `getFallbackChain(start)` (rotaciona p/ começar no preferido;
  `start` fora do ranking → prefixado na frente — sem isso `testConnection`
  testava outro provider e dava resultado falso). Auto-escala 1..N: `getTopProviders(N)` distribui seções Ideas em round-robin; `callAI` gira N chaves por provider sequencial com `attempt-cap 2 + Retry-After`.
- `usageService.ts` (100% local): `DEFAULT_SETTINGS` (25 providers; 1M p/
  9router/gemini/meta/openrouter/groq, 100k elevenlabs, 1000 stability/runway,
  resto 500k; `renewalDay:1`), `trackUsage` (poda >90 dias →
  `copymaster_usage_history`), `getCurrentCycleUsage` (ciclo ancorado em
  `renewalDay`; alimenta ranking + `TokenDashboard`; `App.tsx` consulta antes).
- `openRouterCatalog.ts`: `fetchCatalog()` (cache 24h; filtra
  `pricing.prompt == 0` + `:free`; fallback `CURATED_FREE`); pool
  `openrouter_free_pool` (multi-seleção); `setLastModel` (visível no Centro).

### Pesquisa com fatos reais (`services/research/`)
Grounding anti-alucinação (Itens 14/32):
- `research/quickResearch.ts:114` — `quickResearch(niche, language)` (custo 0):
  aba "Pesquisa Instantânea" do IdeaSession (`components/IdeaSession.tsx:65`).
  `ResearchScope` (`:12`, `auto|geral|noticias|academico`, default `geral`,
  persistido em `copymaster_research_scope:v1`): `geral` = WEB-ONLY
  (busca Google normal: blogs/guias/sites via `api/research?source=web`,
  que agrega Yahoo RSS + DuckDuckGo lite/html + Bing + SearxNG em paralelo,
  timeout 8s; Google News isolado em `noticias`);
  `noticias` = 1 fonte (news via server-only, 3s); `academico` =
  5 fontes acadêmicas (6s, sem penalty); `auto` = 8s com detecção comercial.
  `geral` nunca devolve vazio se há algo ranqueado (top parcial + aviso).
  News e web correm DESACOPLADOS (cada um com sua race; web lento não descarta
  news); teto 10 resultados (`limit` 10 + `slice(0,10)`); gate relaxado só em
  `geral` (score≥2 + cobertura≥0,2); migalha 0-1 não é cacheada (evita stale).
  Parsers DDG/Bing tolerantes (ordem de atributos, aspas, `b_algoBorder`,
  unwrap `uddg=` + URLs protocol-relative `//`).
  URLs validadas (`isValidWebUrl` em `api/research.ts` + `isClickableUrl` em
  `quickResearch.ts`: só http(s) público clicável, sem scheme/relativo/página
  de buscador; `news.google.com` permitido). Entities decodificadas ANTES do
  strip (`decodeEntities` + 2ª passada em `cleanHtml`, fallback p/ title se
  sobrar `href=`); CBMi resolvido p/ canonical via `<source url>` quando
  presente. Engines web com timeout 6s + race `geral` 8s. Fase 2 em
  `IdeaSession.tsx` com try/finally + contador de segundos + auto-salto para
  a aba Ideias — nunca trava em "Arquitetando...".
  `rankSnippets` (`:209`, TF título×3 + cobertura + boost news/blog +
  recência − penalidade comercial em teses, exceto `academico`) e
  `filterSnippets` (`:247`). `detectCommercialIntent` (`:83`) pula PubMed/SciELO
  em queries comerciais; `filterByRelevance` (`:237`, score≥4 + cobertura≥0,3)
  impede tese sem relação de virar "Mais aderente". Cache 6h com chave por escopo.
- `research/researchOrchestrator.ts:47` — `gatherResearch()`: 6 fontes em
  paralelo (semantic 4, arxiv 3, openalex 3, pubmed 2, crossref 2, news 4),
  dedup por URL, `enrichWithMarkdown(1)`, cache 6h em `localStorage`,
  injeta `[FONTE N]` no prompt (Ideas; fallback automático p/ qualquer prompt
  com `tools:googleSearch` em `aiClient.ts`). `snippetsToGroundingBlock`
  (`:73`), `citingInstructions` (`:79`).
- `research/researchClient.ts:21` — `fetchSource()`: tenta `GET /api/research`
  (serverless, sem CORS nem chave, 12s) e cai para `import()` dinâmico local.
- `api/research.ts`: handlers server (arxiv/semantic/openalex/pubmed/crossref/
  news RSS pt-BR) com fallback `{ok:true,items:[]}`.
- Provedores em `research/providers/*.ts` retornam `SourceSnippet`
  (`{title,url,snippet,sourceType,date,source}`, tipo em `arxiv.ts:1`).

### Personas ativas (`services/personaService.ts`, `localStorage`)
- `:7` get / `:15` save (upsert) / `:28` delete / `:38`+`:46` ativa
  (`copymaster_active_persona_id`) / `:51` resolve / `:58` serializa p/ prompt
  (`MARCA/CLIENTE/TOM/VOCABULÁRIO/MISSÃO`).
- Formato em `types.ts:37-46`. A persona ativa **prefixa o prompt do Copy**
  (`components/CopyGenerator.tsx:113`) e aparece na `ActivePersonaBar`.
- `api/pin.ts`: proxy Pin p/ Citation (`og:image → pinimg → Microlink`,
  rejeita `/ideas/`, teto 2,5MB, `bytes=1` retorna base64).
- `vision/modelDna.ts`: `analyzeModelLocal` (canvas 64px, sem rede) /
  `analyzeModelImage` (Gemini vision JSON, cache session) + `buildModelDnaBlock`.

### Memória, PDF e i18n
- `services/memoryService.ts`: `addHistory` (`:65`, previews 400/600, máx 500)
  reconstrói o cérebro (`:57`: top tons/métodos/providers + tópicos);
  consumido via `contexts/MemoryContext.tsx` (polling 4s + `storage` event) e
  gravado pelo `aiClient`. Chaves `copymaster_history/profile/brain:v2`.
- `services/pdfService.ts:3` — `downloadPDF(title, content)` (jsPDF, header
  16pt, paginação, rodapé "Gerado por CopyMaster AI", `save()` em `:56`).
- i18n: `hooks/useTranslation` (`português→pt, español→es, english→en`,
  default `en`; `t(key)` com fallback EN) + `utils/translations.ts`
  (**`en` + `pt` + bloco `es: {}` vazio e documentado** — `es` cai em EN p/ labels via fallback de `t()`; listas têm triplo PT/EN/ES).
  Idioma global em `App.tsx` via prop. Nova string: adicionar em `en`+`pt`
  (e triplo `data/*` + `getLocalizedLists` se for opção de seletor); testar
  trocando o `<select>` do sidebar. Prompts visuais sempre EN técnico.

### Âncoras dos contratos críticos (§2, §5) — recalibradas em 2026-09-30
(auto-seleção + N chaves por provider + fallback robusto + turbo manual
+ correções da auditoria: cofre legível, 5xx retriable, gemini→fallback,
max_tokens Anthropic, keep-alive da home — ver §14)
`aiClient.ts`: `callAI` :288, pool+fallback :503, strict-system :809,
timeouts :831, `testConnection` :948, GOLDEN :28, VISUAL :271. `vaultService.ts`: chaves :1-2,
`setVaultKey` :64, migração :211. `keyPoolService.ts`: `MAX_POOL_KEYS` :12,
`getApiKeys` :101, `isRetriableError` :134.
`friendlyErrors.ts`: `toFriendlyError` :6. `stripCopyFormat.ts`:
`stripCopyMarkdown` :11, `splitCopyVariants` :55, `stripVisualPrompt` :69,
`splitOptions` :101, `splitVisualResult` :120. `aiDetection.ts`:
`HUMANIZE_THRESHOLD` :7. `textForensics.ts`: `quickLocalScan` :105,
`localEstimate` :226.
`tools/diagnostic.ts`: `AuditMode` :50, `MARK` :150, `AUDIT_MODULE_IDS` :436,
`runStressTestService` :438.
`SettingsCenter.tsx`: POST `/api/env` :107, `handleSave` :152.
`hooks/useAIGenerator.ts`: `isQuotaError` :12. `ToolLayout.tsx`:
`OutputKindBadge` :10, `EngineLink` :24. `QuotaErrorModal.tsx`: `message` :8.
Para revalidar: `python3 -c "import pathlib; t=pathlib.Path('services/core/aiClient.ts').read_text().splitlines(); print([i+1 for i,l in enumerate(t) if 'export const callAI' in l])"`.

---

## 10. Como adicionar uma sessão N+1 (scaffold)
1. **Dados**: se precisar de seletor novo, adicione triplo `X_PT/X_EN/X_ES` em
   `data/<dominio>.ts` (1º item `Automático`) e exponha em
   `constants.ts:getLocalizedLists` (ternário `isPt/isEs`).
2. **Serviço** `services/modules/<area>/<nome>.ts`: exporte
   `generate<Nome>Service(params, onChunk?)` chamando **sempre `callAI()`**
   (nunca `fetch` direto); monte prompt com seletores + `buildPlatformBlock`
   (visuais, nunca `{}`) + divisor exato em linha própria + `SESSION_HIERARCHY_RULE`.
3. **Componente** `components/<Nome>.tsx`: use `ToolLayout` (sidebar + main +
   `outputKind`), `useAIGenerator` (`generate`/`generateStream`), parser de
   `stripCopyFormat`, `RefinementToolbar`, `SectionHelp`; estados locais
   (nunca compartilhe entre suites); bloqueie botão com briefing vazio;
   erros via `setError`/`setGlobalError` (nunca JSON cru, nunca silencioso).
4. **Registro**: `lazy()` + entrada em `components` + `NavItem` em
   `components/App.tsx` (grupo correto) + card em `WelcomeScreen.toolGroups` +
   strings em `utils/translations.ts` (en+pt).
5. **Auditoria**: adicione o módulo em `services/modules/tools/diagnostic.ts`
   (`MODULES[...]`, briefing com `ZAFRA-42`, asserts: sem saudação, divisor
   exato, marcador, nota isolada) e atualize ESTE §4 + contagem do título.
6. **Testes**: rode `npx tsc --noEmit` → `npm run build` → smoke + qa-core;
   adicione a tab no `qa-core` (visível) e, se precisar de geração real, no
   `user-full`/`mx-live` com timeout generoso.

## 11. Como adicionar provider / motor visual
- **Provider LLM**: `services/providerConfig.ts` (name/url/model/link/howTo/
  cors?) + `vite.config.ts ENV_KEY_MAP` + `api/env.ts ENV_KEY_MAP` +
  `aiClient resolveEnvKey/envMap` + `routerService hasEnvKey` + card em
  `SettingsCenter` (`mainLLMs/otherLLMs`). Teste com `Testar` antes de Salvar.
- **Motor visual**: novo perfil em `platformProfiles.ts` **exige doc-fonte
  oficial** (sintaxe, caps, negativo, aspecto, overlay) + `match[]` + `aspect()` +
  `textOverlay()` + entrada em `PLATFORM_LINKS`; rode harness motor×sessão.

## 12. Troubleshooting (erros comuns)
- **Quota/429/402/tier**: `isQuotaError` → modal global com mensagem real;
  troque provider/modelo `:free`, aguarde reset diário (50/dia), ou use chave própria.
- **CORS (`Failed to fetch`)**: providers com `corsWarning` (OpenAI/DeepSeek)
  vão por último; prefira OpenRouter/9Router/Groq no browser.
- **9Router local offline**: timeout 3,5s → penalizado 60s; suba o gateway em
  `localhost:20128` ou troque o primário.
- **Cloudflare sem Account ID**: erro orienta a preencher
  `cloudflare_account_id` no card; URLs `{account_id}` nunca usam placeholder.
- **Vite reiniciou ao salvar**: normal — gravar `.env` recarrega a página (dev).
- **`:free` fraco**: oscila idioma/divisores — prompts exigem, parsers toleram;
  re-tente ou troque de modelo no pool.
- **Reasoning/JSON vazado**: `callAI` descarta e gira pool; nunca exiba
  `reasoning_content/chatcmpl` cru.
- **`dist/` com segredo**: `vite build` zera os segredos do `define` e o guard
  recusa `.env` com chaves (erro `BLOQUEADO`); audite com `npm run security:bundle`
  e nunca distribua build com `ALLOW_BUNDLE_SECRETS=1`.
- **Produção sem chave no bundle (H1)**: o browser não tem chave — a geração vai
  pelo proxy `/api/ai`. Se vier `503 ... ausente no servidor`, cadastre a
  Environment Variable no dashboard da Vercel (pool `BASE`, `BASE_2`..`BASE_9`);
  se vier 403, o Origin do app não bate com o host; 429 = rate 60/min por IP.
- **Painel vazio no teste**: lembre do keep-alive `display:none` — escopar ao visível.
- **Nota misturada**: confira `|||NOTA_DIVIDER|||` em linha própria + `splitVisualResult`.

## 13. Glossário rápido
- **Sessão/tab**: 1 das 28 ferramentas (`activeTab`); `wallet/settings/home` não contam.
- **Badge T/I**: `Texto` (copia-cola) vs `Prompt imagem` (EN p/ outra IA).
- **Divisor**: marcador textual `|||X_DIVIDER|||` entre entregável/nota/opções.
- **Nota do Estrategista**: janela separada após `|||NOTA_DIVIDER|||` (único lugar com Markdown).
- **Cover/Thumb**: modo visual das suites (usa roteiro como fonte + `coverConfig`).
- **Cofre**: `copymaster_vault:v2` (AES-GCM local).
- **Cérebro**: `copymaster_shared_context:v2` + `copymaster_brain:v2` (memória).
- **ZAFRA-42**: briefing-marcador da auditoria (prova que o seletor fluiu).
- **Gate 70**: Humanizar só a partir de 70% probabilidade IA.
- **Proxy `/api/ai` / sentinel `__copymaster_proxy__`**: function serverless que
  injeta a chave do servidor quando o browser não tem nenhuma (gate: PROD ou flag
  `copymaster_server_keys`; ver §9).

## 14. Manutenção desta doc
- Toda mudança de contrato (novo seletor, divisor, provider, motor, sessão,
  parser, fluxo de chave, modo de auditoria) **exige** atualizar este arquivo
  na mesma PR/commit, incluindo contagens (28), tabela de divisores e âncoras.
- Âncoras `arquivo:linha` são verificadas por `scripts/check-anchors.py`
  (29 âncoras, tolerância ±3 linhas). Ao mover um símbolo, rode
  `npm run doc:check` e atualize a âncora na mesma PR — ou ajuste o script
  se a âncora nova for a verdade.
- Drifts resolvidos em 2026-09-23 (não reintroduzir): `e2e/user-full.spec.ts:31`
  agora exige ≥28 tabs; Auditoria renomeada V22→V23 com 23 módulos
  (rápida 23 / completa 46); `App.tsx` raiz marcado `@deprecated`
  (canônico: `components/App.tsx`); PPT com `outputKind="text"`;
  `utils/translations.ts` com bloco `es: {}` explícito (fallback EN por chave).
- Sessão 28 em 2026-09-27: `PRDStudio` (PRD Vibe Studio, `|||PRD_DIVIDER|||`);
  Auditoria V23→V24 com 24 módulos (rápida 24 / completa 48); âncoras
  `diagnostic.ts` recalibradas (`AuditMode` :50, `MARK` :150,
  `AUDIT_MODULE_IDS` :436, `runStressTestService` :438).
- Elite Loop em 2026-09-28 (10 ondas, 59/59 specs mock verdes + mérito real):
  contratos novos — Email cap 5/geração (`email.ts` + `EmailStudio` options);
  Personas anti-recusa + `[ASSUNÇÃO]`; shop TikTok/Reels bloqueia sem produto
  (UI + serviço, Item 18); `maxTokens` sistêmico (8192 longos, 4096 sexy);
  Notebook cards localizados + `LANGUAGE` em notebook/sexy/personas;
  `images:` ao `callAI` nas 6 visuais com upload; Regra #6 condicional
  (só com foto); LP tech STATIC ONLY + inputs Seções/Interatividade;
  `splitVisualResult` tolera divisor quebrado; skip-link a11y no `App`;
  âncoras `aiClient` recalibradas (strict :504, timeouts :523,
  `testConnection` :617 — `toInlineParts` no fim do arquivo).
  Specs novas (mock, 0 quota): `redteam` (injection/vazio/gigante/URL/upload/
  duplo-clique/research-down), `i18n` (EN/ES/PT + 28 tabs), `a11y-tabs`
  (Axe zero critical 6 tabs + skip-link + teclado), `prompt-harvest`
  (payloads reais → `e2e-evidence/prompts/` + mérito keyless em
  `e2e-evidence/merit/`); 28 relatórios em `.notebook/sessoes/`.
- Fallback robusto em 2026-09-29 (64/64 specs): `keyHealthService.ts`
  (auditoria "Testar todas as chaves", mapa `copymaster_keyhealth:v1` 24h,
  semáforos nos cards + painel Fallback no Centro, toggle turbo opt-in);
  `trackUsage` ligado de verdade (`usage` das respostas → quota real no rank);
  cadeia exclui chaves mortas, afunda gateway morto e saldo zerado
  (short-circuit do primário esgotado), attempt-cap 2 (só com próximo na fila),
  Retry-After até 30s, `touchDead` em 401, `via:{provider,model}` no retorno +
  indicador "via X" no `UsageIndicator`; Ideas distribui 4 seções por provider
  (`providerHint`, round-robin `getTopProviders`); turbo em `callAI` (race
  top-2, default OFF); spec `e2e/fallback.spec.ts` (429→secundário, abort,
  short-circuit, auditoria, turbo); âncoras `aiClient` (strict :583,
  timeouts :602, `testConnection` :721) e `SettingsCenter` (`/api/env` :91,
  `handleSave` :123).
- Pool generalizado 1..N em 2026-09-30: pool `base + _2.._9` estendido de 2 para
  32 providers (`keyPoolService.ts`, `vite.config.ts:POOL_BASES`, `api/env.ts`,
  `aiClient.ts:resolveEnvKey/envMap`, `routerService.ts:hasEnvKey/ENV_PROVIDERS`,
  `keyHealthService.ts:ENV_SINGLE+listConfiguredKeys`); auto-escala 1..N chaves
  vivas por provider + round-robin Ideas `getTopProviders(4)`; turbo permanece
  manual OFF (escolha do especialista); âncoras `aiClient` recalibradas
  (strict :618, timeouts :637, `testConnection` :756).
- Auto-seleção + N chaves por provider em 2026-09-30 (2ª onda): sistema escolhe
  motor sozinho (`aiClient:getBestProvider` rank cota+latência+saúde; selects
  Primários removidos do Centro), bloqueio honesto (`testConnection` com
  `details` e aliases `OPENROUTER_API_KEY/GROQ_API_KEY/NVIDEA_API/MISTRAL_api`),
  cofre multi (`vaultService: copymaster_vault_list:v2`, `getVaultKeys/add/remove`,
  `MAX 9` por provider, ex.: 3 OpenRouter de 3 e-mails com limites independentes),
  fallback gira N chaves × M modelos `:free` com `attempt-cap 2 + Retry-After`,
  UI com chips mascarados + `Adicionar/Remover/Testar` por chave e badge `N chaves`;
  aliases harmonizados em `vite/api/aiClient/router/keyPool/keyHealth`;
  âncoras recalibradas (strict :625, timeouts :644, `testConnection` :763,
  `vaultService:migrateLegacyKeys` :211, `keyPool:isRetriableError` :134,
  `SettingsCenter:handleSave` :135).
- Check-up completo em 2026-09-30: 3 serviços `copy/` órfãos corrigidos
  (`copyTunerClient.ts`, `writingTools.ts`, `dtcpillInsights.ts`) — faltavam
  `await` no `callAI`, `prompt`/`systemInstruction` inexistentes em 3 funções e
  o retorno nunca era convertido do `callAI` p/ o tipo declarado; agora parseiam
  JSON tolerante (cerca de ` ``` `), surfaceiam `error` (`DtcpillResponse.error?`
  + `notes?` em `integrateDtcpillWithCopy`) e `writingTools` ganhou
  `WritingVariantsResponse` (antes o `analysis` de variantes não batia com
  `WritingToolsMCPResponse`). `dist/` reconstruído **sem segredos** (o anterior
  tinha `sk-` em 3 chunks — nunca distribua build local feito com `.env` real;
  valide com `npm run security:bundle`). `payload-audit` canário de `personas`
  atualizado p/ os rótulos EN do template reescrito (`main pain points`,
  `extra info` — `form.pain`/`form.additionalInfo` seguem interpolados) e
  `army-controls` settings apontando p/ a rotação `:free` (V24 auto-seleção).
  Âncoras `aiClient` recalibradas (`callAI` :287, strict :649, timeouts :668,
  `testConnection` :787, GOLDEN :27, VISUAL :270).
- Auditoria completa + restauração em 2026-09-30 (3 subagentes: segurança,
  code-review, varredura de código morto/drift). Contratos novos:
  **P0 cofre** — `aiClient` destructurava o *retorno* de `getVaultKey` (string)
  em vez do módulo → `undefined` + `catch` engolindo → **toda chave só-do-cofre
  era inacessível** (pior em prod, onde `/api/env` é 405) e a migração legada
  apagava o plaintext nessa leitura falhada; também `provider`→`tryProvider`
  na leitura do loop (ver §2 "Ordem de chave").
  `isRetriableError` passou a incluir `status >= 500` (502/503 não aborta a
  cadeia — §9); `getFallbackChain` prefixa `start` quando fora do ranking
  (antes `idx <= 0` descartava o provider pedido → `testConnection` testava
  OUTRO provedor); Anthropic ganhou `max_tokens` default 4096 (`/v1/messages`
  exige o campo → 400 permanente antes); primário gemini com erro agora cai
  na cadeia (gemini vai p/ o FIM, erro entra no rastro) em vez de
  `return {error}`; `SettingsCenter` ganhou `sanitizeDetails` (details nunca
  cru/JSON na UI — §8) e o resumo do Salvar conta falha de `.env` (§8);
  `api/scrape.ts`: redirect `manual` + revalidação por hop, IPv6-mapped
  normalizado, porta só 80/443, sem CORS `*`; `api/env.ts` e o plugin dev:
  sem CORS `*`, CRLF recusado, mask só-prefixo; `IdeaSession` valida
  `href` http(s) no sink (anti `javascript:` escrito pelo modelo).
  `App.tsx` layout único: fim do `return <WelcomeScreen/>` na home (desmontava
  a árvore e perdia estado — ver §2 "Layout ÚNICO"); `QuotaErrorModal`
  agora alcançável na home. `e2e/basic-flow.spec.ts` corrigido (contava abas
  na home = 0 tabs; seletor `[role=tabpanel][aria-hidden=false]` não existe).
  Gate: **74/74 specs determinísticas** (0 quota) + `doc:check` verde.
  Âncoras recalibradas (`strict` :671, `timeouts` :693, `testConnection` :812,
  `SettingsCenter` `/api/env` :107 e `handleSave` :152 — espelhadas em
  `scripts/check-anchors.py`). ALERTA H1 (chaves do dashboard da Vercel no
  bundle) documentado em §9; M1 (mestre do cofre constante) = limitação
  honesta: cofre é cripto-local contra vazamento, não contra XSS.
- Proxy `/api/ai` (H1 FECHADO) em 2026-09-30: `vite.config.ts` ganha
  `embedSecrets = command === 'serve' || ALLOW_BUNDLE_SECRETS` (em build todo
  segredo vira `""`/`[]`; guard de arquivo `.env` mantido como defesa em
  profundidade) + rota dev `/api/ai` no plugin (`ssrLoadModule`); `api/ai.ts`
  (POST-only 405, Origin==Host 403, 60/min/IP 429, 6MB 413, allowlist host-exato
  anti-SSRF, gemini só v1beta, `NEVER_PROXY` 400, pool `base+_2.._9` de
  `process.env`+`.env` → 503 PT-BR, strip de auth do cliente, retry 401/429 ×3,
  `redirect:'error'`, 290s → 504/502, `maxDuration=300`, nunca loga chave);
  `services/serverKeyService.ts` (sentinel `__copymaster_proxy__`, gate
  PROD/flag `copymaster_server_keys`, mapa GET `/api/env` com cache 60s/10s e
  filtro `NOT_PROXYABLE`); `aiClient.ts` (`doFetch`, ordem de chave
  tempApiKey→sentinel→env→cofre→legado, `ensureServerKeys()`+`invalidateRankCache()`
  antes do rank, gemini primário/loop via REST v1beta não-streaming quando
  sentinel, ambos os `fetch(endpointUrl)` viram `doFetch`);
  `routerService.hasEnvKey` conta o mapa do servidor (senão a cadeia de
  fallback de produção encolheria); `api/env.ts` exporta `ENV_KEY_MAP`.
  Spec nova `e2e/server-proxy.spec.ts` (9 testes, 0 quota): contrato cru
  405/403/400/SSRF/503 sem upstream, seam prod ON (flag → geração inteira por
  `/api/ai`, payload sem header de auth, `envHits>0`, `directHits=0`) e seam
  dev OFF (`/api/env` mentindo → chamada direta ao host do provider,
  `aiHits=0`, `envHits=0`). Gate: `tsc` 0, `doc:check` 29 âncoras + 3
  invariantes, suíte determinística **83/83** (17 specs, `--workers=1`), build
  de canário sem `sk-canary*/gsk_canary*` no `dist/` + `security:bundle` limpo
  + guard `BLOQUEADO` (exit 1) com `.env` restaurado. Âncoras `aiClient`
  recalibradas (`callAI` :288, pool+fallback :503, strict :809, timeouts :831,
  `testConnection` :948, GOLDEN :28, VISUAL :271). §0/§1/§2/§6/§7/§12/§13
  atualizados no mesmo commit (contrato doc↔código).
- Higiene de publicação (GitHub) em 2026-09-30: `metadata.json` (esqueleto de
  exportação do Google AI Studio, não referenciado pelo app) + 18 arquivos de
  log/scripts avulsos da raiz apagados (inclui `App.tsx` da raiz obsoleto,
  `check_env.js`, `test_*keys.js`, `mcp_analysis.js`, `run-verification.ps1`,
  `trace-*.txt`/`out*.txt` e o arquivo `null`); PDFs de auditoria movidos para
  `.notebook/`; `.gitignore` só ganhou `*.timestamp-*.mjs` (as regras de
  diretórios locais de trabalho ficam em `.git/info/exclude`, que não é
  versionado); README sem a seção de skills de agente e com as notas
  de Stack/Segurança atualizadas (proxy `/api/ai` já implementado); frase do
  header deste arquivo neutralizada (sem nomear modelos de código).
- Forense local upgrade (MIT, `Jakeschincariol/linkedin-agent-skill`) em
  2026-10-01: léxico novo `data/slopPT.ts` (~62 entradas find/replace com
  auditoria de invariância PT + 7 estruturas regex de engajamento) +
  `services/modules/tools/textForensics.ts` **novo e puro** (`quickLocalScan`
  com contagens reais + dedup por índice literal×estrutura, `burstinessOf`,
  `localEstimate`, `autoCleanText`, `stripInvisibleChars` — testável direto
  no Node sem browser); `aiDetection.ts` ganha `mode: 'llm'|'local'` + fallback
  local honesto (perito morto → estimativa com caveat, **nunca bloqueia** §8) +
  EVIDÊNCIA LOCAL MEDIDA no prompt do perito + cirurgia humana com
  **PRIORIDADE #1 = maior count**; toolbar: passo 0 `autoCleanText` (só
  entradas `safe`, tipografia PT intacta), aviso `mode:'local'`, selo
  "estimativa local", `Pré-limpeza: N termo(s)`. Gate 70 **inalterado** (sobre
  o score LLM ou fallback local). Bugs do loop: `\b` em JS é ASCII-only →
  lookarounds `(?<![\p{L}])`/`(?![\p{L}])` na estrutura `dualidade_nao_e`
  (nunca use `\bé\b` com acento); `pergunta_retorica` com `/i`. Spec nova
  `e2e/humanizer-local.spec.ts` (8 testes: 6 puros Node + 2 browser mock,
  0 quota — calibração MAQUINA ≥70 × HUMANO <40 verificada em loop 5×).
  Gate: `tsc` 0, `doc:check` **31 âncoras** (2 novas: `textForensics`
  `quickLocalScan` :105 / `localEstimate` :226) + 3 invariantes, suíte
  determinística **91/91** (18 specs, `--workers=1`, 12,7min), build canário
  (`.env` movido + `try/finally`) limpo + `security:bundle` OK + `.env`
  restaurado. §5/§6/§9 + `check-anchors.py` atualizados no mesmo commit.
- Áudio/TTS overhaul (sessão 23) em 2026-10-01: novo `data/tts.ts` com
  `TTS_PLATFORMS` (9 provedores — ElevenLabs, Google Cloud TTS, Gemini TTS,
  Amazon Polly, Azure Speech, OpenAI TTS, Murf, PlayHT, Fish Audio — cada um
  com `brief` particular, `durationNote`, modelos reais e banco de vozes
  **exclusivamente PT-BR** com ids usáveis `voice_id`/código, pesquisa nas
  fontes oficiais de cada plataforma) + seletor de **duração 10–120s step 5**
  que injeta `duration_seconds`/`target_words` no JSON de configuração e
  trava o roteiro em `round(seg × 2,6)` palavras (±10%, 156 ppm PT-BR);
  serviço (`audio.ts`) reescrito (clampa duração, injeta `brief` +
  `configTemplate` preenchida, `voice==='auto'` → lista de candidatas na Nota),
  UI com 4 selects (provedor/voz/modelo/duração) filtrados por plataforma e
  modelo (trocar provedor zera voz/modelo p/ `auto`) + hint de palavras, e a
  aba Áudio agora exibe o COMANDO **completo** (antes o split em
  `CONFIG_END` escondia justamente a config com a duração). Arrays antigos
  `ELEVENLABS_VOICES/MODELS`/`GOOGLE_TTS_VOICES` removidos do `data/creative.ts`
  (`GOOGLE_TTS_VOICES` eram vozes Gemini erradamente rotuladas de Google Cloud).
  Spec nova `e2e/media-audio.spec.ts` (6 testes, 0 quota). Gate: `tsc` 0,
  `doc:check` 31 âncoras + 3 invariantes, suíte determinística **97/97**
  (19 specs, `--workers=1`, 11,6min), build canário limpo + `security:bundle`
  OK. §3/§4/§6/§7 + este §14 atualizados no mesmo commit.
- Para vigiar: contagem 28 no título do §4, tabela de divisores completa
  (13 + NOTA), `AUDIT_MODULE_IDS.length === 24`.
