# CopyMaster AI â€” Guia Completo do Desenvolvedor (humano ou IA)

> Leia este arquivo ANTES de mexer no cÃ³digo. Ele Ã© a fonte canÃ´nica do projeto:
> o que Ã©, para que serve, como funciona, qual o input e output esperado de cada
> mÃ³dulo, e as regras que NUNCA devem ser quebradas. Atualize-o quando mudar contratos.
> Escrito para que qualquer desenvolvedor consiga entender, melhorar e dar
> continuidade sem explorar o repo do zero.

---

## 0. VisÃ£o, objetivo e para que serve

**CopyMaster AI** Ã© uma suÃ­te de criaÃ§Ã£o de conteÃºdo e marketing com IA, focada no
mercado brasileiro: SPA React + Vite na Vercel, sem backend aplicacional (banco,
login, cobranÃ§a, multiusuÃ¡rio), mas com **functions serverless sem estado de apoio**
(`/api/env`, `/api/research`, `/api/pin`, `/api/scrape` e o **proxy `/api/ai`** â€”
ver Â§9) que existem para pesquisa e para manter as chaves LLM fora do bundle (H1).

O usuÃ¡rio escolhe uma das **51 sessÃµes**, preenche
seletores/briefing e recebe **texto pronto para copiar e colar** ou **prompt
tÃ©cnico em inglÃªs para gerar imagens em outra IA** (Midjourney, DALL-E, etc.).

### O que NÃƒO Ã©
- NÃ£o tem backend aplicacional, banco de dados, login, cobranÃ§a ou multiusuÃ¡rio.
  As serverless functions da Vercel (proxy `/api/ai`, `/api/env`, pesquisa, pin,
  scrape) nÃ£o mantÃªm estado â€” ver Â§9.
- A "carteira" (`TokenDashboard`) Ã© 100% local (`localStorage`) â€” controle de
  quota/limites, nÃ£o faturamento.
- NÃ£o gera imagens diretamente (exceto rascunho de Logo via
  `gemini-2.5-flash-image`); sessÃµes visuais entregam **prompt EN** para colar no
  motor escolhido, com `EngineLink` para o site oficial.

### Problemas que resolve
1. **Bloqueio criativo** â€” copy, roteiros, e-mails, anÃºncios, artigos sob demanda.
2. **Falta de equipe** â€” 1 pessoa opera como redator, estrategista, designer de
   prompts e social media.
3. **Prompts visuais ruins** â€” engenharia de prompt por motor (sintaxe de cada um)
   em vez de texto genÃ©rico (`services/modules/visual/platformProfiles.ts`).
4. **DetecÃ§Ã£o de texto-robÃ´** â€” verificador forense + humanizador com gate de 70%.
5. **Custo** â€” rotaÃ§Ã£o de provedores/chaves, modelos `:free`, Cofre local AES-GCM.

### Os dois tipos de saÃ­da (badge `ToolLayout`)
- **T = Texto** (badge azul): texto puro copia-cola em PT (ou idioma da UI).
  Proibido Markdown no entregÃ¡vel (Item 12).
- **I = Prompt imagem** (badge roxo): prompt tÃ©cnico em INGLÃŠS + `EngineLink`
  (`target=_blank`) + legenda/overlay em PT quando houver texto na arte.
- **DinÃ¢mico**: TikTok/Reels/YouTube/Media mudam o badge conforme o modo
  (roteiro=Texto, capa/thumb=Prompt imagem).

---

## 1. Primeiros passos (setup em 5 minutos)

### Stack
React 18 + Vite 5 + Tailwind 3 + TypeScript 5 + `@google/genai` + `jspdf` +
`lucide-react`. Testes: Playwright + `@axe-core/playwright`. Deploy: Vercel (SPA).

### Comandos
```bash
npm install
npm run dev        # http://localhost:5173 (plugin /api/env lÃª/escreve o .env)
npm run build      # tsc && vite build â€” NÃƒO embute segredos (define zerado no build;
                   # guard BLOQUEADO se houver .env com chaves â€” ver Â§9 Chaves)
npm run security:bundle  # varre dist/ por padrÃµes de chave (rode antes de distribuir)
npm run preview
npx playwright test --project=chromium            # suÃ­te completa
npx playwright test e2e/smoke.spec.ts e2e/qa-core.spec.ts  # sem gastar quota
```
NÃ£o existe script `test` no package.json. Specs em `e2e/`:
permanentes `smoke.spec.ts`, `qa-core.spec.ts`, `user-full.spec.ts` (2 geraÃ§Ãµes reais) + mock `full-user.spec.ts`/`full-user-simple.spec.ts` (`ZAFRA-42`, 0 quota, 16 testes) + `payload-audit.spec.ts` (prova seletorâ†’prompt nas 29 sessÃµes via payload real + mock, 0 quota) + auxiliares `mx-live.spec.ts`, `general-user.spec.ts`, `real-dentista.spec.ts` (harness/manuais).

### Gerar seu primeiro conteÃºdo
1. `npm run dev` â†’ abre `http://localhost:5173` â†’ tela `home` (`WelcomeScreen`).
2. Clique `ABRIR SALA DE IDEIAS` ou um card (ex: `Copywriting Pro`).
3. Em `settings` (Centro de Comando): escolha `primary_text_provider`
   (default `openrouter`), cole a chave no card, clique `Testar` (chama
   `testConnection` â†’ `callAI("Responda apenas OK")`) e depois
   `Salvar ConfiguraÃ§Ãµes` (grava cofre + `.env` em dev).
4. Na sessÃ£o, preencha o briefing mÃ­nimo (cada sessÃ£o bloqueia vazio no botÃ£o),
   clique Gerar, aguarde o stream, use as abas + `RefinementToolbar`
   (Copiar / PDF / Verificar IA / Humanizar).
5. Acompanhe quota no `wallet` (`TokenDashboard`) e na barra `Uso {provider}`.

---

## 2. Arquitetura (mapa mental + fluxos)

```
index.tsx (ErrorBoundary + MemoryProvider + ThemeProvider)
â””â”€â”€ components/App.tsx (51 tabs + wallet/settings + home, lazy + visitedTabs keep-alive)
    â”œâ”€â”€ contexts/SharedContext  (activeTab, sharedContext/cÃ©rebro, globalError)
    â”œâ”€â”€ contexts/ThemeContext   (normal/write/color)
    â”œâ”€â”€ contexts/MemoryContext  (histÃ³rico de uso)
    â”œâ”€â”€ hooks/useTranslation    (PT/EN/ES via utils/translations.ts + constants.ts)
    â”œâ”€â”€ hooks/useAIGenerator    (generate/generateStream, erros â€” ver Â§12)
    â”œâ”€â”€ components/ToolLayout   (padrÃ£o visual: sidebar + resultado + badge + EngineLink)
    â””â”€â”€ services/core/aiClient.ts â†’ callAI() = ÃšNICO ponto de I/O com LLMs
```

**Regra de ouro da arquitetura:** todo acesso a LLM passa por `callAI()`.
Nunca chame `fetch` de provider direto em componente. Em produÃ§Ã£o o browser nÃ£o
tem chave nenhuma: o `callAI` POSTa `{provider,url,body}` no proxy server-side
`/api/ai`, que injeta a autenticaÃ§Ã£o (ver Â§9 "Proxy `/api/ai`").

### Como o App monta as tabs
- `components/App.tsx:12-66`: 55 `lazy()` (51 sessÃµes + wallet/settings + home +
  modal). `components = useMemo(..., [language])` recria ao trocar idioma;
  o mapa `components` em si tem **53 entradas** (51 sessÃµes + settings + wallet â€”
  `home`/modal ficam fora e sÃ£o renderizados Ã  parte).
- `activeTab` vive em `SharedContext`; `visitedTabs:Set(['home'])` + `useEffect`
  adiciona cada visita. Render: `Object.entries(components).map` com
  `div style display:block/none` â€” **keep-alive**: painel visitado nunca desmonta
  (preserva form/resultado/scroll), mas fica `display:none` no DOM.
  **Armadilha**: em testes Playwright, escopar asserts ao painel visÃ­vel.
- **Layout ÃšNICO desde 2026-09-30**: nÃ£o existe mais `if (activeTab === 'home')
  return <WelcomeScreen/>`. Early-return trocava a forma da Ã¡rvore raiz e o React
  desmontava tudo â†’ "Voltar ao InÃ­cio" perdia form/resultado/scroll de todas as
  sessÃµes (verificado empiricamente: texto digitado â†’ home â†’ reentra = vazio).
  Agora a home Ã© um overlay `fixed inset-0 z-40` por cima; o `<main>` ganha
  `aria-hidden` na home (e o skip-link/sidebar/hamburger sÃ£o omitidos ali),
  enquanto os painÃ©is ficam montados por baixo. `QuotaErrorModal` (z-50) continua
  acima do overlay e agora **tambÃ©m Ã© alcanÃ§Ã¡vel na home**.
- Sidebar `App.tsx:360-463` (`nav[role=tablist]` em `:360`): 10 grupos (EstratÃ©gia & Core 5, Vendas & ConversÃ£o 5, VÃ­deo Social 3,
  Engajamento 1, Visual & Design 10, Geral & MÃ­dia 4, Marketing AvanÃ§ado 5,
  Growth & MVP 7, RevOps & B2B 10, Sistema 1). `wallet/settings` sÃ£o botÃµes
  no rodapÃ©, nÃ£o tabs. `UsageIndicator` (poll 15s) mostra `Uso {provider} %`.
- `home` (`WelcomeScreen`) Ã© full-screen; demais tabs tÃªm layout
  `aside + main[role=tabpanel]`. `globalError` abre `QuotaErrorModal` com a
  mensagem real. O Ãºnico `App.tsx` Ã© `components/App.tsx` (importado por
  `index.tsx`) â€” a duplicata obsoleta da raiz foi removida em 2026-09-30.

### Fluxo ponta-a-ponta (exemplo Copy)
```
Sidebar click â†’ handleNavClick setActiveTab(id)
â†’ visitedTabs keep-alive (monta 1Âª vez, depois sÃ³ show/hide)
â†’ FormulÃ¡rio (selects de getLocalizedLists + briefing + persona ativa + lock)
â†’ useAIGenerator.generateStream(serviceCall(onChunk), onChunk, onComplete)
â†’ ServiÃ§o (services/modules/*) monta prompt (personaToContext + seletores +
  buildPlatformBlock p/ visuais + divisores exatos em linha prÃ³pria)
â†’ callAI(prompt, system, model, onChunk, {provider, taskType})
â†’ Parser tolerante (stripCopyFormat: split*/strip*)
â†’ Abas + Nota isolada (modal/link Ver Nota)
â†’ RefinementToolbar (Expandir/Encurtar/Simplificar/Emojis, custom+meta,
  Transformar, Verificar IA, Humanizar gate 70, PDF, TTS, Contexto Global, Copiar)
â†’ MemÃ³ria/carteira (addHistory + trackUsage â†’ TokenDashboard/UsageIndicator)
```
- `SharedContext` (`copymaster_shared_context:v2`, seed da persona ativa):
  compartilhamento entre suites **sÃ³ por import explÃ­cito** do usuÃ¡rio
  (`Contexto Global` / `Desenvolver no Editor`). Nunca sync automÃ¡tico.
- Persona ativa (`personaService`, `types.ts:37-46`) prefixa o prompt do Copy
  (`CopyGenerator.tsx:113`) como `MARCA/CLIENTE/TOM/VOCABULÃRIO/MISSÃƒO` e aparece
  na `ActivePersonaBar`.

### `callAI(prompt, systemInstruction, defaultModel, onChunk?, config?)`
`config`: `{ provider, images, tools, responseMimeType, responseSchema,
aspectRatio, tempApiKey, taskType }`.
- `taskType: 'visual'` â†’ usa `primary_prompt_provider`; senÃ£o `primary_text_provider`
  (ambos de `localStorage`, padrÃ£o `'openrouter'`). Provider invÃ¡lido cai para
  `openrouter`.
- Ordem de chave: `tempApiKey` â†’ **sentinel do servidor** (`__copymaster_proxy__`:
  produÃ§Ã£o, mapa vindo do GET `/api/env` via `serverKeyService` â†’ chamada pelo
  proxy `/api/ai`) â†’ `process.env` (embutido sÃ³ no `serve` dev â€” `vite build`
  zera os segredos) â†’ cofre (`vaultService`, AES-GCM, migraÃ§Ã£o legada automÃ¡tica)
  â†’ legado `localStorage` (`<provider>_api_key`). Sem chave â†’ erro PT-BR
  `Chave X nÃ£o configurada`. Endpoint local (9router) nunca usa o sentinel.
  **P0 corrigido em 2026-09-30**: `getVaultKey()` devolve *string*, e o cÃ³digo
  fazia `const { getVaultKey } = await vaultMod.getVaultKey(provider)` â€”
  destructuring de string virava `undefined`, o `catch` engolia o TypeError e
  **toda chave sÃ³-do-cofre era inacessÃ­vel** (pior em produÃ§Ã£o, onde `/api/env`
  Ã© 405 e o cofre Ã© o Ãºnico destino; a migraÃ§Ã£o legada ainda apagava o
  plaintext nessa leitura falhada). Nunca destructure o retorno da funÃ§Ã£o â€”
  destructure o mÃ³dulo: `const { getVaultKey } = vaultMod;`.
- CÃ©rebro: `copymaster_brain:v2` prefixa a instruÃ§Ã£o (se jÃ¡ contÃ©m
  `REGRAS DE OURO`, `brain + system`, senÃ£o `GOLDEN + brain + INSTRUÃ‡Ã•ES`).
- Ramo `gemini` (`@google/genai`, Ãºnico com streaming real
  `generateContentStream` + `imageConfig.aspectRatio` + extraÃ§Ã£o
  `inlineData â†’ imageUrl`). **Falha no primÃ¡rio gemini NÃƒO aborta mais**: o
  erro Ã© anotado, gemini vai para o FIM da cadeia e os demais providers sÃ£o
  tentados antes (antes: `return {error}` direto â†’ quota gemini = geraÃ§Ã£o
  morta mesmo com OpenRouter/Groq saudÃ¡veis).
- Ramo OpenAI-compatÃ­vel: `fallbackChain = routerService.getFallbackChain`
  (ordena por quota restante + latÃªncia; `corsWarning` por Ãºltimo no browser;
  gateway 9Router morto penalizado 60s). Expande pool de chaves
  (`keyPoolService`: base + `_2.._9` + cofre, throttle 2,5s) e pool de modelos
  `:free` OpenRouter em 429/5xx antes de trocar de chave; retry sem
  `response_format` em 400 (alguns `:free` rejeitam `json_object`).
- Provedores estritos (`groq`, `mistral`, `nvidia`, `meta`, `grok`) **rejeitam o
  campo top-level `system`**: para eles a instruÃ§Ã£o vai como
  `messages[0] role:system`. NÃ£o reintroduza `system:` global.
- Grounding automÃ¡tico: se `tools` pede `googleSearch/web_search` e provider nÃ£o
  Ã© gemini, injeta `gatherResearch(prompt)` como `[FONTE N]`.
- Timeouts: 3,5s p/ gateway local, 600s p/ remoto (`:free` sofre throttle;
  Ideas ~40KB pode levar ~360s).
- Defesa anti-vazamento: conteÃºdo vazio ou com `reasoning/chatcmpl` nÃ£o Ã© exibido,
  gira o pool. Erro final Ã© agregado (principal + atÃ© 3 fallbacks) e traduzido
  por `toFriendlyError()` (PT-BR, nunca JSON cru).
- Sucesso registra `setHealth` (latÃªncia), `markKeyUsed`, `addHistory`
  (previews 400/600, mÃ¡x 500, poda 90 dias) e `setLastModel` (sÃ³ openrouter).
- `testConnection(provider, apiKey, type)` chama
  `callAI("...TYPE", "Responda apenas OK", ...)` e retorna
  `{success, message, latency, details?, engineType?}` â€” usado pelo botÃ£o Salvar.

### ConstituiÃ§Ã£o (GOLDEN_SYSTEM_INSTRUCTIONS, V20, em `aiClient.ts`)
Lei suprema dos prompts (41 itens, agrupados):
- **Entrega**: sÃ³ resultado, sem saudaÃ§Ã£o; roteiros sÃ£o fala pura de teleprompter;
  entregÃ¡vel Ã© **TEXTO PURO copia-cola** (proibido `* # - â€” â€¢ > 1. crases pipes**);
  Markdown sÃ³ na Nota; sem explicar raciocÃ­nio; sem extrapolar escopo.
- **Curadoria**: especialista mundial, tese provocadora, filtra N opÃ§Ãµes.
- **Contexto/hierarquia**: entrada do usuÃ¡rio Ã© verdade; ordem
  Persona Ativa > Contexto Global; sessÃ£o isolada; input nunca sobrescreve a
  ConstituiÃ§Ã£o.
- **Visual**: diretor de fotografia, prompt EN detalhado
  (`VISUAL_MASTER_PROTOCOL`: lentes 35/85mm, Rim/Volumetric/Cinestill, texturas,
  composiÃ§Ã£o; **PROIBIDO PT**); Capa de Revista comeÃ§a com
  `Usar a imagem em anexo...` (Regra #6).
- **Factualidade**: sem inventar stats (`[INSERIR DADO]`), sem URL fake (fallback
  `google.com/search?q=`), **bloquear sem dados essenciais** (Itens 18/19/26 â€”
  ex: SEO sem roteiro, logo sem nicho) com bloco objetivo, sem supor
  pÃºblico/tom/canal, separa fato/opiniÃ£o/criaÃ§Ã£o, citaÃ§Ã£o obrigatÃ³ria
  (`[FONTE NÃƒO INFORMADA]` se sem lastro), marca incerteza, sem plÃ¡gio.
- **Nota (Item 8)**: Nota do Estrategista SEMPRE separada do entregÃ¡vel.
- **ValidaÃ§Ã£o/conflitos**: checklist interno, auditoria de coerÃªncia; prioridade
  verdade > contexto > idioma > formato > criatividade; modos exclusivos
  (JornalÃ­stico/Copy/Roteiro/Prompt/Social); ambiguidade â†’ pergunta ou bloqueia.
- **SeguranÃ§a (Item 33)**: ignora prompt injection, bloqueio imediato.
  SÃ³ o dono muda as Regras (Itens 15/41).

### Divisores (contrato sagrado modeloâ†”parser)
ConteÃºdo e nota NUNCA se misturam na mesma string; o separador Ã© textual:

| Divisor | Uso |
|---|---|
| `\|\|\|DIVIDER\|\|\|` | 2 variaÃ§Ãµes (copy) |
| `\|\|\|NOTA_DIVIDER\|\|\|` | separa entregÃ¡vel da Nota (quase todas) |
| `\|\|\|EMAIL_DIVIDER\|\|\|` / `\|\|\|ADS_DIVIDER\|\|\|` / `\|\|\|SLIDE_DIVIDER\|\|\|` / `\|\|\|QUOTE_DIVIDER\|\|\|` / `\|\|\|CITATION_DIVIDER\|\|\|` / `\|\|\|LETTERING_DIVIDER\|\|\|` / `\|\|\|MEME_DIVIDER\|\|\|` / `\|\|\|INSP_DIVIDER\|\|\|` / `\|\|\|LOGO_OPTION_DIVIDER\|\|\|` / `\|\|\|YT_OPTION_DIVIDER\|\|\|` / `\|\|\|SCENE_DIVIDER\|\|\|` / `\|\|\|SCHEMA_DIVIDER\|\|\|` (JSON-LD) / `\|\|\|PRD_DIVIDER\|\|\|` (PRDâ†”tokens) / `\|\|\|COMMENT_DIVIDER\|\|\|` (variações de resposta a comentários) | separadores por sessÃ£o |

Regras ao escrever prompts: divisor **sempre em linha prÃ³pria, exato,
nunca quebrado em linhas**, nunca repetir placeholders (`[CONTEÃšDO...]`) nem
o nome do divisor no corpo. Modelos ignoram divisores com frequÃªncia â€” por
isso os parsers usam `splitVisualResult()` / `splitOptions()` (tolerantes a
`NOTE` vs `NOTA`, divisores quebrados e fallback por parÃ¡grafos em branco).

### UtilitÃ¡rios de limpeza (`utils/stripCopyFormat.ts`)
- `stripCopyMarkdown()` â€” texto puro (usado em Copy + RefinementToolbar).
  Ex: `**VariaÃ§Ã£o 1:**\n- Aprenda **hoje**!\n|||DIVIDER|||` â†’
  `Aprenda hoje!`. Remove listas `# - â€¢ > 1.`, `** __ * _ ~~ ```, rÃ³tulos
  `VariaÃ§Ã£o/OpÃ§Ã£o N`, divisores e linhas sÃ³-sÃ­mbolos; preserva hÃ­fen interno.
- `stripVisualPrompt()` â€” limpa prompt visual **preservando** `--ar`, `::`,
  resoluÃ§Ãµes (`1024x1792`) e steps numerados; remove Markdown leve,
  placeholders `[CONTEÃšDO]` e nota.
- `splitCopyVariants(text, divider)` â€” tolera divisor quebrado
  (`|||\\nDIVIDER|||`), corta a nota, retorna N variaÃ§Ãµes limpas.
- `splitVisualResult(text)` â†’ `{ content, note }` tolerante (`NOTE` vs `NOTA`,
  case-insensitive; guarda anti-JSON `{"id":"chatcmpl...` â†’ content vazio).
- `splitOptions(text, divider, expected)` â†’ N abas Ãºteis mesmo sem divisor
  (divide por parÃ¡grafos `\n\n` e reagrupa; nunca retorna aba vazia se houver texto).

### Componentes compartilhados
- `ToolLayout` (props: `title icon iconColorClass description loading error
  isLocked onToggleLock sidebarContent mainContent hasResults actions
  outputKind?`): `OutputKindBadge` (`Prompt imagem` roxo / `Texto` azul) e
  `EngineLink` (link oficial do motor sob o seletor, `target=_blank`; sÃ³ em
  sessÃµes imagem). Grid `lg:grid-cols-12` (sidebar 4 + main 8); `isLocked`
  aplica `opacity-50 pointer-events-none`.
- `RefinementToolbar` (sÃ³ renderiza se hÃ¡ texto): Verificar IA + Humanizar,
  Expandir/Encurtar/Simplificar/Emojis, instruÃ§Ã£o custom + meta de caracteres,
  Transformar (pivot por plataforma/metodologia/funil/tom), PDF/TTS/Contexto
  Global/**Copiar**. Detalhes no Â§12.
- `SectionHelp` (modal **Guia F1**, `max-w-4xl`): se `sessionId` acha guia
  registrado (`getGuide`), renderiza acordeão de seções detalhadas (O que é /
  Resultado / Inputs / Modos-Subsessões / Fluxo / Dicas / Erros / Integrações /
  Exporta / Limitações / Bloqueios / Exemplos / FAQ) com "Expandir/Recolher
  tudo", TTS e atalhos **F1/Esc** (registro global em módulo: UMA instância
  aberta por vez, F1 abre a da sessão visível â€” keep-alive multi-painel);
  sem guia, cai na `description` legada + aviso "Guia detalhado em construção".
  Guias em `data/guides/*.ts` (7 arquivos, 51 sessões PT-BR), schema
  `SessionGuide` + `registerGuide/getGuide` em `data/guides.ts` (re-exportado
  por `constants.ts` com `export type`); `sessionId` vem de `ToolLayout` e
  `BridgeConfig`. Spec `guide-modal` (4 testes, 0 quota).
- `SpeechInput`, `TextToSpeech`, `VisualPreview`, `ActivePersonaBar`.

---

## 3. CatÃ¡logos e motores

- `data/global.ts` (90 linhas): `GLOBAL_LANGUAGES` (PT-BR/EN-US/ES),
  `IMAGE_AIS` (**22**, Ã­ndice 0 = AutomÃ¡tico: Imagen 4, Nano Banana Pro, Whisk,
  Mixboard, Stitch, Midjourney v6, DALL-E 3, Grok 2, Recraft V3, SD 3.5,
  Firefly, Leonardo, Flux.1 Pro, Ideogram 2, **Meta AI Imagine, Qwen Wanx 2,
  Doubao Seedream, Hunyuan, ERNIE-ViLG**, Kling, Luma), `VIDEO_AIS` (10:
  AutomÃ¡tico, Veo 3.1, Flow, Runway Gen-3, Pika, Sora, Luma, Kling, Haiper,
  Minimax), `VIBE_CODING_PLATFORMS` (22 p/ Landing tech), `VIDEO_RATIOS`
  (`Auto,16:9,9:16,1:1,4:5,21:9,3:4`), `PAPER_SIZES_PT/EN/ES`
  (Digital 1:1/9:16/16:9/4:5/21:9 + Impresso A4V/A4H/A3V/A5V/American Comic).
  Listas globais nÃ£o-localizadas.
- `data/visuals.ts` (557 linhas): estilos/formatos/estÃ©ticas; padrÃ£o item `[0]` =
  `AutomÃ¡tico`. PT mais completo que EN/ES (ex: `IMAGE_STYLES` 46 PT / 30 EN /
  27 ES; `MEME_STYLES` ~45 PT com Flork/Wojak/Gretchen/NazarÃ©; `COMIC_STYLES`
  ~50 PT com Ziraldo/Turma da MÃ´nica). `MAGAZINE_PRESETS/MOODS`,
  `LOGO_AI_PLATFORMS` (17), `LOGO_STYLES` (43 PT), `BRAND_ARCHETYPES` (17),
  `FAMOUS_PAINTERS` (26), `FAMOUS_DESIGNERS` (33), `VISUAL_COLORS` (26),
  `VISUAL_TEXTURES` (32), `QUOTE_STYLES`, `INFOGRAPHIC_STYLES/LAYOUTS`,
  `COMIC_LAYOUTS` (18), `ADULT_ANIMATION` (alias comic + 11 formatos),
  `MEME_FORMATS` (~40: Drake, Distracted, Trade Offer...), `VIDEO_STYLES`,
  `PPT_*`, `LP_*`, `LET_*` (20 estilos/23 tÃ©cnicas/25 superfÃ­cies/19 composiÃ§Ãµes).
- `data/{copywriting,social,creative,citations}.ts`:
  copywriting (`TONES` 23 PT, `METHODOLOGIES` 27 PT: AIDA/PAS/FAB/StoryBrand/JTBD...,
  `TRIGGERS` 16, `FUNNEL_STAGES` 6, `SINS` 8, `EMAIL_TYPES` 10, `VSL_FRAMEWORKS`
  13, `LP_TYPES/FRAMEWORKS` 9, `ARTICLE_TYPES` 11, `PRD_TYPES` 6, `PRD_SECTIONS` 8);
  social (`SOCIAL_PLATFORMS` 28 PT / 29 EN-ES com Reddit, `POST_TYPES` 12,
  `AD_PLATFORMS/AD_GOALS` 8, `INSPIRATION_CATEGORIES` 10 com `id` estÃ¡vel â€”
  usar `id`, nunca `label`);
  creative (`NOTEBOOK_MODES` 3 + 8 objetivos, `SUNO_STYLES` 18 / `MOODS` 15;
  os arrays antigos de voz TTS foram removidos â€” o banco vive em `data/tts.ts`);
  citations (`CITATION_AREA_IDS` 16, `AREAS/TONES` 15 / `SOURCES` 10,
  `CITATION_AUTHORS` ~250 com `getAuthorsByArea(areaId)`; `auto` = todos).
- `data/tts.ts` (**Ãudio, 2026-10-01**): `TTS_PLATFORMS` â€” 9 provedores com
  `brief` (como a plataforma trabalha), `durationNote` (como calibrar segundos),
  `models`, `voices[{id,label,models?}]` **sÃ³ compatÃ­veis com PT-BR** (nenhum
  pt-PT/en-US â€” travado por spec) e `configTemplate` JSON com placeholders
  `{{model}}/{{voice}}/{{duration}}/{{words}}`: ElevenLabs (5 modelos, 50 vozes
  BR com `voice_id` real), Google Cloud (Standard/WaveNet/Neural2/Chirp3-HD â€”
  43 cÃ³digos `pt-BR-*` com gÃªnero), Gemini TTS (3 modelos, 30 vozes estelares),
  Amazon Polly (neural/standard Ã— Camila/VitÃ³ria/Thiago/Ricardo), Azure (18
  vozes `pt-BR-*Neural`, neuralÃ—multilingual), OpenAI (13 vozes, subset 9 em
  `tts-1`), Murf (`falcon-2`/`gen2` Ã— 7 `pt-BR-*`), PlayHT (`play3.0-mini` Ã— 11),
  Fish Audio (S2.1 Pro Ã— 6). Helpers: `TTS_DURATION_OPTIONS` (10..120, step 5),
  `estimateWordsForDuration` (2,6 pal/s â‰ˆ 156 ppm PT-BR), `clampDuration`,
  `getTTSPlatform`, `getVoicesFor` (filtra vozÃ—modelo). Exportado via
  `export * from './data/tts'` em `constants.ts`; `[0]` de cada lista de vozes
  Ã© `auto` (âœ¨ AutomÃ¡tico â€” a IA escolhe na Nota).
- `constants.ts:getLocalizedLists(langCode)`: **Ãºnica fachada** que componentes
  consomem (`const { tones, imageStyles } = getLocalizedLists(langCode)`).
  Pass-through (nÃ£o-localizado): `imageAIs, videoRatios, magPresets, magMoods,
  visualColors, visualTextures, famousPainters/Designers, logoPlatforms`.
  Localizado por ternÃ¡rio `isPt?PT:isEs?ES:EN`. Nunca importar `data/*` direto
  (exceto globais).
- `services/modules/visual/platformProfiles.ts` (321 linhas): 22 perfis
  (`getPlatformProfile` fuzzy-match com fallback `universal`,
  `buildPlatformBlock(engine, {aspectRatio, customText, negative})`,
  `getPlatformLink`/`PLATFORM_LINKS`, `SESSION_HIERARCHY_RULE`,
  `caps{words,chars}` + `noNegative` por motor, negativo universal SD/Leonardo).
  Regra anti-regressÃ£o: NENHUMA sessÃ£o chama `buildPlatformBlock` com `{}` â€”
  aspecto/overlay sempre fluem (logo=marca, carousel=customText/footer,
  inspiration=footer). Trava: harness-contrato motorÃ—sessÃ£o (aspecto presente,
  overlay presente, marcador nativo, divisor sem vazamento).
  Fontes oficiais por perfil (pesquisa 2026): MJ docs.midjourney.com (curto,
  params no fim, `--no`, `::`, aspas); DALL-E OpenAI Cookbook (narrativa, sem
  negativo, rewriting); SD Stability/toolkit (positive/negative, resoluÃ§Ã£o);
  Firefly helpx.adobe (conciso sujeito+descritores, sem cap inventado);
  Imagen ai.google.dev (sujeitoâ†’contextoâ†’estilo, posiÃ§Ã£o/fonte);
  Nano Banana DeepMind (Subjectâ†’Compositionâ†’Actionâ†’Locationâ†’Style);
  Ideogram docs (teto 150-160w, frases, aspas, EN p/ texto, Magic/JSON);
  Flux docs.bfl.ai (**SEM negative**: positive framing, ordem, 30-80w, hex);
  Recraft docs (teto 1000ch, text_layout bbox); Leonardo guides (lista vÃ­rgulas,
  estilo primeiro, character ref); Qwen help.aliyun (negative_prompt,
  prompt_extend); Seedream ByteDance (fÃ³rmula + layout mensurÃ¡vel);
  Hunyuan handbook (prioridade sujeitoâ†’tÃ©cnico); ERNIE Baidu (fÃ³rmula + aspas +
  negative_prompt); Grok docs.x.ai (natural, sem params); Meta ai.meta.com
  (conversa, `imagine`, detalhe). Whisk/Mixboard/Stitch/Kling/Luma: sem doc
  pÃºblica â€” heurÃ­stica marcada. Novo motor exige doc-fonte antes do perfil.
  Helpers: `MJ_ASPECT` (`--ar X:Y`), `DESCRIBE_ASPECT` (frases), `SD_RES`,
  `DALLE_SIZE`. Negativo: default sÃ³ SD/Leonardo; Flux `noNegative` â†’ framing
  positivo; MJ â†’ `--no` no fim.
- Hierarquia nos prompts: **funÃ§Ã£o da sessÃ£o > sintaxe do motor > protocolo
  visual > inglÃªs tÃ©cnico obrigatÃ³rio**.

---

## 4. As 51 sessões (contrato completo)

Legenda: **T** = badge Texto (copiar e colar) Â· **I** = badge Prompt imagem
(prompt EN p/ outra IA). `S` = serviÃ§o, `C` = componente.
Template por sessÃ£o: PARA QUE SERVE / QUANDO USAR / INPUTS / SERVIÃ‡O / DIVISOR /
BADGE / EXEMPLO / BLOQUEIOS.

### EstratÃ©gia
1. **SessÃ£o de Ideias** â€” `C IdeaSession` / `S strategy/ideas.generateIdeaSessionService(niche, language, preSnippets?)` (orquestradora: 4 seÃ§Ãµes em paralelo) + `generateCopyIdeasService` / `generateTrendsService` / `generateContentFormatsService` / `generateEnemiesService` (botÃµes Gerar por aba, ~1,5-2k tok cada). **T**.
   PARA QUE SERVE: virar nicho em pauta completa (tendÃªncias, hashtags, 12 copies
   Topo/Meio/Fundo em texto, formatos, inimigos comuns, fontes). QUANDO USAR:
   inÃ­cio de funil, calendÃ¡rio de conteÃºdo.
   INPUTS: `nicho` (texto, ex: `marketing para dentistas`); seletor de escopo
   `geral/noticias/academico/auto` (default `geral`, persistido em
   `copymaster_research_scope:v1`); aba `Pesquisa InstantÃ¢nea` com filtro
   `top/recent/papers/news` (custo 0 via `quickResearch`, rank TF + recÃªncia,
   cache 6h com chave por escopo).
   OUT: **JSON** `{trends[{title,description,analysis}], hashtags{instagram,tiktok,linkedin,twitter,seoKeywords}, contentIdeas[12: 4 Topo/4 Meio/4 Fundo, cada uma com hook+headline+body+cta], contentFormats{infographic[2],video_script[2],article[2]}, commonEnemies[6: medo|erro|irritacao|mito|vilao|desculpa + angle + exampleHook], sources}` â€”
   **sem divisor por design** (nÃ£o exigir `NOTA_DIVIDER` aqui).
   OTIMIZAÃ‡ÃƒO VELOCIDADE: usa `GOLDEN_IDEAS_SLIM` (subconjunto ~137 tok com
   marcador `REGRAS DE OURO`, que impede `callAI` de prefixar a ConstituiÃ§Ã£o
   integral de 3376 tok) + limites rÃ­gidos no prompt (hook 100/headline 100/
   body 600/cta 100/outline 400/angle 180/hashtags 6 por rede) + slices de
   contrato (formats 2, enemies 6) + `maxTokens: 8192` (via `callAI`, evita
   truncamento no default 4k dos `:free`) + `minItems` no schema
   (contentIdeas 9, enemies 4) + `tryParse` rejeita cauda vazia (forÃ§a repair
   em vez de vazio silencioso). Economia medida: âˆ’12.954 chars (~3.200 tok)
   no input por chamada; teto de output 70kâ†’~29k chars (tÃ­pico ~20k).
   EXEMPLO: IN `odontologia estÃ©tica` â†’ OUT 7 abas (Pesquisa, Ideias de Copy,
   ConteÃºdo, Inimigo Comum, TendÃªncias, Hashtags, Fontes) + cards com
   `Desenvolver no Editor` / `Desenvolver na EdiÃ§Ã£o` (exporta para `sharedContext`).
2. **Copywriting Pro** â€” `C CopyGenerator` / `S copy/general.generateCopyService(params + {briefingContent, language, targetLength})` (+ `generateCorrectionService` p/ correÃ§Ã£o). **T**.
   INPUTS: `platform` (Campo de Batalha), `type` (Formato), `funnelStage`,
   `methodology` (AIDA/PAS/StoryBrand...), `tones[]` multi, `mentalTriggers[]`
   multi, `objective`, `targetLength` (chars), `briefingType` (ideia/referÃªncia/
   imagem/pdf) + `simpleInput/referenceInput` + persona ativa (prefixo automÃ¡tico).
   Aux: `analyzeImageContextService` / `analyzePdfContextService`.
   OUT: **2 variaÃ§Ãµes texto puro** `|||DIVIDER|||** + nota (`splitCopyVariants` +
   `stripCopyMarkdown`). Bloqueio vazio no botÃ£o.
   EXEMPLO: IN `Instagram/Post/Topo/AIDA + "Curso de inglÃªs para adultos"` â†’
   OUT 2 abas + modal `Ver EstratÃ©gia`.
3. **NotebookLM** â€” `C NotebookLMStudio` / `S strategy/notebook.generateNotebookLMService({mode, objective, context, language})`. **T**.
   INPUTS: `mode` (`source_creator`/`audio_instruction`), `objective` (8 cards:
   Resumo Ãudio, Roteiro VÃ­deo, Mapa Mental, RelatÃ³rio, Flashcards, Quiz,
   InfogrÃ¡fico, Slides), `localContext` (ideia principal).
   OUT: fonte pronta p/ colar no NotebookLM + NOTA.
   EXEMPLO: IN `Mapa Mental + "fotossÃ­ntese para 8Âº ano"` â†’ OUT bloco fonte + nota.
4. **Personas** â€” `C PersonaManager` / `S strategy/personas.generatePersonasService({form, quantity, language})`. **T**.
   INPUTS manual: `currentPersona{name*,description,audience,tone,vocabulary,mission,visuals}`;
   auto: `autoGenForm{niche,business,product,pain,differential,location,additionalInfo}` +
   `autoGenQty` (1-3); retrato: `portraitConfig{ai, style, ratio}`.
   OUT: `{personas[{id,name,description,audience,tone,vocabulary,mission,visuals}]}` JSON + nota.
   Retrato via `generateImagePromptService` (sÃ³ `parts[0]` vira prompt).
   EXEMPLO: IN `Fitness + App de treino` â†’ OUT grid cards + botÃ£o `ATIVA`
   (prefixa o Copy) + aba portrait EN.

### Vendas
5. **Email Marketing** â€” `C EmailStudio` / `S copy/email.generateEmailSequenceService({...params, context, language})`. **T**.
   INPUTS: `type` (Boas-vindas...), `count` (1-5), `tone`, `senderName`,
   `targetAudience`, `localContext` (oferta).
   OUT: `|||EMAIL_DIVIDER|||** (N e-mails) + `|||NOTA_DIVIDER|||** por bloco.
   EXEMPLO: IN `Boas-vindas x3 + "LanÃ§amento curso confeitaria"` â†’ OUT abas
   `Email 1..N` + estratÃ©gia amarela inline.
6. **Roteiro VSL** â€” `C VSLStudio` / `S copy/vsl.generateVSLService({...params, context, language})`. **T**.
   INPUTS: `framework` (Benson/Georgi/Hormozi...), `productName*`, `mainPain`,
   `uniqueMechanism`, `offer`, `guarantee`, `localContext*`.
   OUT: fala pura teleprompter + NOTA; **proibido `[Cena N]`**.
   EXEMPLO: IN `MÃ©todo RecomeÃ§o + mulheres endividadas` â†’ OUT bloco corrido + nota.
7. **Landing Pages** â€” `C LandingPageStudio` / `S copy/landingPage.generateLandingPageService` (+ `generateLandingPageTechPromptService` p/ vibe-coding). **T**.
   INPUTS: `mode` (content/tech), `type`, `style`, `framework`, `productName*`,
   `promise`, `offer`, `targetAudience`, `targetPlatform` (22 VIBE_CODING),
   `techParams{visualStyle, sections, interactivity}`, `localContext`.
   OUT content: wireframe Hero/Prova/Oferta + nota (regex `NOTA DO ESTRATEGISTA:`);
   OUT tech: bloco mono p/ Lovable/v0 (sÃ³ Copiar, sem nota).
8. **Gestor de Ads** â€” `C AdsStudio` / `S copy/ads.generateAdsService({...params, context, language})`. **T**.
   INPUTS: `platform` (Meta/Google/TikTok...), `goal`, `productName*`, `offer`,
   `targetAudience`, `localContext*`.
   OUT: `|||ADS_DIVIDER|||** (3 A/B) + nota global.
9. **Sexy Canvas** â€” `C SexyCanvas` / `S strategy/sexyCanvas.generateSexyCanvasService(sin, context, language)`. **T**.
   INPUTS: `selectedSin` (LuxÃºria/Gula/Avareza/PreguiÃ§a/Ira/Inveja/Orgulho),
   `localContext*` (produto). OUT: copy visceral no pecado + NOTA.

### VÃ­deo social (estados 100% locais por suite â€” nunca vazam entre si)
10. **TikTok Studio** â€” `C TikTokSuite` / `S social/tiktok.generateTikTokService({mode,duration,style,engine,aspectRatio,customText,context,language})`. Badge dinÃ¢mico.
    Modos `viral_script|tiktok_shop|seo|cover`. Cover usa o roteiro gerado como
    `[FONTE DE DADOS OBRIGATÃ“RIA]` + `coverConfig{engine,style,ratio 9:16,customText}`.
    `shopParams{productName,targetAudience,painPoint,keyBenefit,offerCTA}`.
    Texto via `|||NOTA_DIVIDER|||`; cover via `splitVisualResult`.
    EXEMPLO: IN `viral_script + "5 dicas de organizaÃ§Ã£o"` â†’ OUT roteiro fala pura.
11. **Reels Studio** â€” `C ReelsSuite` / `S social/reels.generateReelsService` (mesmo padrÃ£o; ratio default 4:5).
    Modos `viral_script|sales_promo|seo|cover`. Nota rotulada `Growth Lab`.
12. **YouTube Studio** â€” `C YouTubeSuite` / `S social/youtube.generateYouTubeService({type,duration,style,engine,aspectRatio,customText,context,language})`. Badge dinÃ¢mico.
    `script|seo|thumbnail`. `seo/thumbnail` herdam `outputs.script.text` como fonte.
    Thumb: **framework MrBeast** (3 elementos, emoÃ§Ã£o extrema, contraste anti-UI,
    texto 3-5 palavras complementar, rosto dominante) â†’ 3 opÃ§Ãµes
    `|||YT_OPTION_DIVIDER|||** + **nota rica em 2Âª chamada dedicada** (parÃ¢metros,
    o que/como/porquÃª, A/B; parse `splitVisualResult` + `splitOptions(...,3)`).
    Compartilhar `sharedContext` entre suites Ã© sÃ³ por import explÃ­cito do usuÃ¡rio.

### Visual & Design (saÃ­da EN salvo legenda; sempre com EngineLink)
13. **Logo** â€” `C LogoStudio` / `S visual/logo.generateLogoBriefService({...params, context, language})`. **I**.
    INPUTS: `brandName*`, `niche` (via localContext), `archetype`, `style`,
    `platform`, `artistInfluence`, `designerStyle`, `aiModel`, ratio 1:1.
    OUT: `|||LOGO_OPTION_DIVIDER|||** (2) + nota (`splitVisualResult` +
    `splitOptions(...,2)`; aba 2 oculta se vazia) + Preview real
    (`callAI gemini-2.5-flash-image`). Aspecto/overlay da marca sempre fluem.
14. **Carrossel** â€” `C CarouselGenerator` / `S social/carousel.generateCarouselService({...params, context, referenceImages, referenceMode, language})`. **I**.
    INPUTS: `slideCount` 3-10, `style`, `platform`, `aiModel`, `aspectRatio`,
    `footer` (@usuario), `customText` (hook), `localTopic*`, `refImages[]`.
    OUT: `|||SLIDE_DIVIDER|||`; por lÃ¢mina: COPY PT + VISUAL PROMPT EN + nota.
15. **Capa de Revista** â€” `C MagazineCoverStudio` / `S visual/magazine.generateMagazineCoverService({...params, context, referenceImages, referenceMode, language})`. **I**.
    INPUTS: `magazine` (19 presets), `mood` (19), `headline`, `subheadline`,
    `footerText`, `aiModel`, `localContext*` + upload foto (resize 1024,
    `refMode=high_fidelity`).
    OUT: prompt EN Ãºnico comeÃ§ando com **Regra #6: `Usar a imagem em anexo...`** + nota.
16. **Frases (Quote)** â€” `C QuoteGenerator` / `S social/quote.generateQuoteCardService({count,style,context,platform,aspectRatio,footer,aiModel,customText,referenceImages,referenceMode,language})`. **I**.
    INPUTS: `count` (fixo 3), `style`, `aiModel`, `aspectRatio`, `platform`,
    `footer`, `customText` (frase pronta opcional), `localTopic`, `refImages`.
    OUT: `|||QUOTE_DIVIDER|||** + NOTA (`splitVisualResult` + `splitOptions(...,3)`).
    EXEMPLO: IN `disciplina` ou `"Feito Ã© melhor que perfeito"` â†’ OUT N abas
    (legenda PT + visual EN + watermark).
17. **CitaÃ§Ãµes Verificadas (Citation)** â€” `C CitationGenerator` / `S social/citation.generateCitationService` + `S social/citationVerify.verifyCitationService` (juiz batch 2Âº pass, selo por opÃ§Ã£o). **I**.
    INPUTS: `areaId` (16 + auto), `author` (`getAuthorsByArea`, auto=todos),
    `tone` (15), `source` (10), `count`, `style`, `platform`, `aspectRatio`,
    `footer`, `context`, `showAuthor` (toggle ON default), modelo visual opcional
    (`modelMode none/link/upload/preset`, `modelLink/modelImage/modelDna/modelRef`).
    OUT: `|||CITATION_DIVIDER|||** (N) + NOTA com ficha tÃ©cnica + ficha de
    verificaÃ§Ã£o. Selos: `CONFIRMADA` / `TRADUCAO-LIVRE` / `FALSA` / `DUVIDOSA`.
    Modelo: `api/pin.ts` resolve Pin (og:image, rejeita `/ideas/`),
    `S vision/modelDna.analyzeModelImage` (Gemini, cache session) +
    `buildModelDnaBlock` (traduÃ§Ã£o por motor),
    `S pinterestRef.buildReferenceRule` (Gemini vÃª pixels, outros preset+link);
    sem modelo = sem preset no prompt. Custo: 2 calls.
18. **Lettering** â€” `C LetteringStudio` / `S visual/lettering.generateLetteringService({...params, context, footerText, language})`. **I**.
    INPUTS: `text*` (frase protagonista), `style` (20), `technique` (23),
    `surface` (25), `composition` (19), `platform`, `aiModel`, `aspectRatio`
    (1:1 default), `footer`, `localContext` â€” exige `text OU localContext`.
    OUT: `|||LETTERING_DIVIDER|||** (2) + nota.
19. **HQ/Comic** â€” `C ComicGenerator` / `S creative/comic.generateComicService` (+ `generateComicNoteService` sob demanda). **I**.
    INPUTS: `style` (~50 PT: Ziraldo, Kirby, Shonen...), `layout` (18),
    `aiModel`, `platform`, `aspectRatio`, `footer`, `localStory*`, `refImages`.
    OUT: `PAINELâ†’AÃ‡ÃƒOâ†’DIÃLOGOâ†’PROMPT IA` (roteiro PT + prompt EN; gramÃ¡tica
    painel/tier/sarjeta). BotÃ£o "Ver Nota / Gerar nota" (2Âª chamada) + modal â€”
    a nota SEMPRE Ã© verificÃ¡vel.
20. **FÃ¡brica de Memes** â€” `C MemeGenerator` / `S social/meme.generateMemeService({...params, context, referenceImages, referenceMode, language})`. **I**.
    INPUTS: `style` (~45 PT: Flork/Wojak/Gretchen...), `format` (~40: Drake,
    Distracted...), `aiModel`, `platform`, `aspectRatio` (1:1), `footer`
    (watermark), `localContext*`.
    OUT: `|||MEME_DIVIDER|||** (2) + nota. Teoria: setupâ†’punch, fidelidade ao
    template, legenda PT + visual EN.
21. **InfogrÃ¡fico** â€” `C InfographicGenerator` / `S creative/presentation.generateInfographicService({...params, context, referenceImages, referenceMode, language})`. **I**.
    INPUTS: `style` (14), `layout` (11), `aiModel`, `platform`, `aspectRatio`,
    `footer`, `localData*` (tÃ³pico/dados brutos).
    OUT: plano Ãºnico (hierarquia + visual por bloco) + NOTA (sem `SLIDE_DIVIDER`).
22. **ApresentaÃ§Ã£o (PPT)** â€” `C PresentationGenerator` / `S creative/presentation.generatePresentationService({...params, context, language})`. Badge `Texto` (corrigido de `outputKind="image"`: a saÃ­da Ã© roteiro texto).
    INPUTS: `platform` (8), `slideCount` (5/8/10/12/15/20/25), `style` (8),
    `purpose`/`audience` (8), `localData*`.
    OUT: `[SLIDE NN: TÃTULO]` obrigatÃ³rio por lÃ¢mina + NOTA.
23. **Media Prompts** â€” `C MediaPrompts` / `S visual/image.generateImagePromptService` + `S visual/video.generateVideoPromptService` + `S creative/audio.generateAudioScriptService/generateSunoPromptService` + `platformProfiles`. Badge dinÃ¢mico.
    INPUTS imagem: `ai` (22 IMAGE_AIS), `style`, `ratio`, `text`, `footer`,
    `platform`, `localContext*`; vÃ­deo: `aiModel` (10 VIDEO_AIS), `duration`
    (5s/10s), `ratio`, `style` (14), `sceneCount` (1-5), `text`; Ã¡udio:
    `provider` (9 TTS de `TTS_PLATFORMS`), `voice` (banco sÃ³-PT-BR filtrado por
    modelo; `auto` = IA escolhe), `model` (por plataforma/famÃ­lia), `duration`
    (seletor 10â€“120s step 5, hint "â‰ˆ N palavras" @156 ppm);
    mÃºsica: `mode`, `style` (18 Suno), `mood` (15).
    OUT imagem (matriz 10-steps) / vÃ­deo (`|||SCENE_DIVIDER|||` por cena) /
    Ã¡udio (config JSON da plataforma com `duration_seconds`/`target_words` jÃ¡
    preenchidos + `|||CONFIG_END|||` + roteiro no alvo de palavras + NOTA; a UI
    exibe o COMANDO **completo**, config visÃ­vel) / mÃºsica (prompt Suno) + NOTA.
24. **InspiraÃ§Ã£o** â€” `C InspirationStudio` / `S social/inspiration.generateInspirationService({category,subCategory,visualStyle,platform,format,quantity,aiModel,aspectRatio,footer,bgColor,fontColor,texture,context,language})`. **I**.
    INPUTS: `category/subCategory` (10 categorias, `id` estÃ¡vel), `visualStyle`,
    `platform`, `quantity=3`, `aiModel`, `aspectRatio`, `footer`, `bgColor/fontColor`
    (26 cores), `texture` (32), `localContext*`.
    OUT: `|||INSP_DIVIDER|||** (3) + NOTA; exige **citaÃ§Ãµes reais verificadas**
    (Item 32; pode bloquear por Item 18).
25. **AnimaÃ§Ã£o Adulta** â€” `C AdultAnimationGenerator` / `S creative/comic.generateAdultAnimationService({...params, context, referenceImages, referenceMode, language})`. **T**.
    INPUTS: `style` (alias comic), `format` (11), `aiModel`, `platform`,
    `aspectRatio`, `footer`, `localPremise*`.
    OUT: roteiro humor Ã¡cido (Regra de TrÃªs) + NOTA.
26. **Artigos** â€” `C ArticleGenerator` / `S copy/article.generateArticleService({...params, context, language})`. **T**.
    INPUTS: `type` (11: Blog Post...), `tone`, `citeSources`, `includeBibliography`,
    `targetLength`, `writerStyle` (Journalist/Copywriter/Prompt Engineer/Editor),
    `localTopic*`.
    OUT: artigo SEO+AEO + `|||SCHEMA_DIVIDER|||** (JSON-LD, toggle Ver JSON-LD) + NOTA.
27. **PRD Vibe Studio** â€” `C PRDStudio` / `S copy/prd.generatePRDService(params + {businessName*, niche*, promise*, audience*, q1..q5?, siteRefUrl?, siteDnaBlock?, language})`. **T**.
    INPUTS: negÃ³cio (`name/niche/promise/audience*` + `differential`), 5 Qs opcionais (accordion; puladas viram `[ASSUNÃ‡ÃƒO]` na Nota), site ref opcional (`siteRefUrl` https + `screenshots[]` 1024 â†’ `GET /api/scrape` texto/SEO + `analyzeSiteImage` SITE_DNA visÃ£o; DNA **sobrescreve** AutomÃ¡tico), `prdType` (LP ConversÃ£o/Institucional/One-pager/Docs/Custom), `prdPlatform` (21 VIBE_CODING), `sections[]` checklist IA, `tone/methodology`, estilo override (`visualStyle/bgColor/fontColor/texture` â€” perde p/ DNA), `integrations` (sÃ³ estÃ¡tico), `localContext`.
    OUT: PRD.md PT-BR P0-P2 + `|||PRD_DIVIDER|||** (tokens.json) + `|||NOTA_DIVIDER|||` (decisÃµes + `[ASSUNÃ‡Ã•ES]` + riscos); abas `PRD/Tokens` + `Exportar p/ Centro` (alimenta Landing tech). Bloqueio vazio no botÃ£o.
    EXEMPLO: IN `Studio Lume + estÃ©tica premium + linear.app` â†’ OUT PRD PT-BR + tokens hex + nota.
28. **Auditoria V46** â€" `C StressDiagnostic` / `S tools/diagnostic.runStressTestService(modId, language, mode)`. Ferramenta sistema (sem badge).
    47 mÃ³dulos no cÃ³digo (`ideas,copy,notebook,personas,email,vsl,lp,ads,sexy,tiktok,reels,youtube,carousel,logo,magazine,quote,citation,lettering,comic,meme,infographic,article,ppt,prd,revops,pricing,coldEmail,battleCard,enablement,dealDesk,aePrep,salesEngineer,customerSuccess,salesOps,leadMagnet,launch,churn,pmf,flywheel,partnerships,channelEconomics,seoAudit,keywords,contentBrief,competitor,outreach,commentResponder`)
    executam o **serviÃ§o real** com briefing-marcador (`ZAFRA-42`, CafÃ© ZAFRA-42
    p/ baristas) e asserts determinÃ­sticos (sem saudaÃ§Ã£o 40c, divisor exacto,
    marcador do seletor case/acento-insensÃ­vel, nota isolada, corpo mÃ­nimo).
    Fora do harness: Media (matriz + SCENE), InspiraÃ§Ã£o (pode bloquear),
    AnimaÃ§Ã£o Adulta e a prÃ³pria Auditoria (recursÃ£o). O rÃ³tulo Ã© dinÃ¢mico
    (`V{AUDIT_MODULE_IDS.length}` no cabeÃ§alho; histÃ³rico: V23=23, V24=24, V46=46, V47=47).
    Modos: **rÃ¡pida** (47 chamadas) / **completa** (+juiz LLM = 94,
    `det*0,7 + juiz*0,3`). BotÃ£o "Re-testar Reprovados" (honesto; sem placebo).
    OUT: dashboard compliance + cards por categoria + modal `Inspecionar RAW`.

### Marketing AvanÃ§ado (novas sessÃµes 2026-10-02)
29. **SEO/AEO/GEO Audit** â€” `C SEOAuditStudio` / `S strategy/seoAudit.generateSEOAuditService({siteUrl, focusArea, competitorUrl, notes, language, crewPersona})`. **T**.
    INPUTS: `siteUrl` (obrigatÃ³rio), `focusArea` (all/technical/onpage/content/local/ai/aeo/geo), `competitorUrl` (opcional), `notes` (opcional).
    OUT: texto puro com Resumo, Pontos CrÃ­ticos, Checklist TÃ©cnico, Checklist On-page, Checklist AEO, Checklist GEO, Oportunidades, PriorizaÃ§Ã£o P0/P1/P2 + `|||NOTA_DIVIDER|||`.
    Bloqueio: sem URL vÃ¡lida.
30. **Keyword Discovery** â€” `C KeywordStudio` / `S strategy/keywords.generateKeywordService({niche, location, language, quantity, intentFilter, crewPersona})`. **T**.
    INPUTS: `niche` (obrigatÃ³rio), `location` (default Brasil), `quantity` (10/20/50), `intentFilter` (all/informational/commercial/transactional).
    OUT: JSON com seeds, opportunities (keyword, intent, estimatedVolume, difficulty, contentType, priorityScore), clusters + `|||NOTA_DIVIDER|||`.
    Bloqueio: sem nicho.
31. **Search Content Brief** â€” `C ContentBriefStudio` / `S strategy/contentBrief.generateContentBriefService({primaryKeyword, topic, targetAudience, searchIntent, answerIntent, secondaryKeywords, brandVoice, wordCountRange, language, crewPersona})`. **T**.
    INPUTS: `primaryKeyword` (obrigatÃ³rio), `topic` (obrigatÃ³rio), `targetAudience`, `searchIntent`, `answerIntent`, `secondaryKeywords`, `brandVoice`, `wordCountRange`.
    OUT: texto com TÃ­tulo, Meta Description, Estrutura H1-H3, SubtÃ³picos, Perguntas, Links Internos, Fontes, Schema Markup, CritÃ©rios de AceitaÃ§Ã£o + `|||NOTA_DIVIDER|||`.
    Bloqueio: sem keyword ou tÃ³pico.
32. **Competitor Alternatives** â€” `C CompetitorStudio` / `S strategy/competitor.generateCompetitorService({productName, productBrief, competitors, focusCriteria, language, crewPersona})`. **T**.
    INPUTS: `productName` (obrigatÃ³rio), `productBrief`, `competitors` (obrigatÃ³rio, 2-5), `focusCriteria` (all/price/features/ux/support).
    OUT: texto com Matriz de ComparaÃ§Ã£o, Pontos Fortes, Gaps, Diferencial, SWOT, Posicionamento + `|||NOTA_DIVIDER|||`.
    Bloqueio: sem produto ou concorrentes.
33. **Sales Outreach** â€” `C OutreachStudio` / `S copy/outreach.generateOutreachService({recipientName, recipientCompany, recipientRole, valueProposition, channel, tone, sequenceLength, language, crewPersona})`. **T**.
    INPUTS: `valueProposition` (obrigatÃ³rio), `recipientName`, `recipientCompany`, `recipientRole`, `channel` (email/linkedin/phone), `tone` (consultivo/direto/personalizado/familiar), `sequenceLength` (1/3/5).
    OUT: sequÃªncia de mensagens com `|||EMAIL_DIVIDER|||` + `|||NOTA_DIVIDER|||`.
    Bloqueio: sem proposta de valor.

### Engajamento (nova categoria 2026-10-02)
51. **Responder Comentários** — `C CommentResponder` / `S social/commentResponder.generateCommentResponseService({mode, platform, objective, tone, length, variations, context, extra, language})`. **T**.
    PARA QUE SERVE: virar FONTE (postagem colada, artigo/URL copiado, imagem ou
    PDF da postagem — ou o comentário recebido) em respostas contextuais de
    autoridade: 1-3 variações com a fórmula ouro da pesquisa de engajamento
    2026 (reforçar ponto específico + acrescentar valor novo + pergunta aberta),
    nunca "obrigado!" genérico.
    QUANDO USAR: comentar posts de líderes do nicho (modo `post` = deixar
    comentário NA postagem de terceiro) e responder o que chegou no seu post
    (modo `comment` = responder UM comentário recebido — elogio, pergunta,
    crítica, objeção).
    INPUTS: `mode` (post|comment), `sourceType` (text|image|pdf — imagem/PDF
    passam por `analyzeImageContextService`/`analyzePdfContextService` e só os
    fatos viram fonte), `context`* (fonte obrigatória), `platform` (rede —
    define janela de resposta: X=minutos, LinkedIn=1ª hora, YouTube=dias),
    `objective` (autoridade/engajar/adicionar-valor/concordar-e-ampliar/
    contra-argumentar/pergunta-aberta/agradecer-e-conversa/vender-sutil),
    `tone`, `length` (curto|medio|longo), `variations` (1-3), `extra`.
    OUT: **N variações texto puro** `|||COMMENT_DIVIDER|||` (1 variação =
    sem divisor) + `|||NOTA_DIVIDER|||` (tipo da fonte, janela de resposta,
    personalização, risco). Parser: `splitNotaBlock` + `splitCopyVariants`.
    Bloqueio vazio no botão (Item 18).
    EXEMPLO: IN `modo comment + "Isso não funciona na prática..." + Instagram
    + Discordar com educação` â†’ OUT 2 respostas calmas com contraprova +
    Nota com risco a evitar.

### Assinaturas literais dos serviÃ§os (params por sessÃ£o)
Todos os serviÃ§os seguem `(params: XParams, onChunk?: (text: string) => void)`,
exceto onde indicado. `params: any` no cÃ³digo â€” os campos reais abaixo foram
extraÃ­dos via `grep params.*` de cada serviÃ§o (fonte canÃ´nica em caso de dÃºvida).

```ts
// copy/general.ts
interface CopyParams { briefingContent: string; funnelStage?: string; methodology?: string;
  tones?: string[]; mentalTriggers?: string[]; objective?: string; targetLength?: number; language: string; }
// generateCopyService(params: CopyParams, onChunk?) / generateCorrectionService(params, onChunk?)
// Aux: analyzeImageContextService(base64Image: string, language: string)
//      analyzePdfContextService(base64Pdf: string, language: string)

// strategy/ideas.ts â€” SEM divisor (JSON)
generateIdeaSessionService(niche: string, language: string, preSnippets?: any[])

// strategy/notebook.ts
interface NotebookParams { mode: 'source_creator' | 'audio_instruction'; objective: string;
  context: string; language?: string; }

// strategy/personas.ts â€” SEM divisor no CRUD (JSON)
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
export const PRD_DIVIDER = '|||PRD_DIVIDER|||'; // PRD â†” tokens.json

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

// social/citation.ts (1Âº pass) + citationVerify.ts (2Âº pass, 1 call p/ todas)
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

// creative/comic.ts (HQ + animaÃ§Ã£o; nota via 2Âª chamada)
interface ComicParams { style?: string; layout?: string; format?: string; aiModel?: string;
  platform?: string; aspectRatio?: string; footer?: string; context: string;
  referenceImages?: string[]; referenceMode?: string; language: string; }
generateComicNoteService(params: ComicParams, scriptText: string)

// social/meme.ts
interface MemeParams { style?: string; format?: string; aiModel?: string; platform?: string;
  aspectRatio?: string; footer?: string; context: string;
  referenceImages?: string[]; referenceMode?: string; language: string; }

// creative/presentation.ts (infogrÃ¡fico + PPT)
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
// duration = segundos 10â€“120 (clamp) â†’ targetWords = round(seg Ã— 2,6);

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
// AUDIT_MODULE_IDS.length === 46 (fora do harness: media, inspiration, adultAnimation, stress)

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
> Se um campo novo for adicionado ao serviÃ§o, atualize a interface aqui
> na mesma PR (contrato docâ†”cÃ³digo).

### Sistema (fora das 50 â€” botÃµes, nÃ£o tabs)
- **TokenDashboard** (`wallet`, 282 linhas, 100% local): grid provedores
  (sem chave = `opacity-60 grayscale`), donut ciclo (`getCurrentCycleUsage`,
  verde<75/amarelo<90/vermelho), limites + `renewalDay` editÃ¡veis, diagnÃ³stico
  por provider (`testConnection`), cards Entrada/SaÃ­da, auto-refresh 15s.
- **SettingsCenter** (`settings`, 457 linhas): status 9Router (fetch
  `localhost:20128/v1/models` 2s), motores primÃ¡rios (2 selects â†’
  `localStorage primary_text/prompt_provider`), pool `:free` OpenRouter
  (multi-seleÃ§Ã£o `openrouter_free_pool` + `lastModel`), cards provider
  (`mainLLMs` 11 + `otherLLMs` 18 + `mediaEngines` 3) com selo `.env` (sky) vs
  `Cofre` (emerald), input password + `Pegar Chave` (link oficial),
  `corsWarningâ†’Proxy`, campo extra `cloudflare_account_id` (blur grava `CLOUDFLARE_ACCOUNT_ID` no `.env`), `Testar`
  (`testConnection`) / `Adicionar` (testa antes de gravar) / `Salvar`
  (percorre keys, placeholder = skip, testa antes, grava cofre + `.env`,
  resumo no botÃ£o) / `Resetar Cache` (`localStorage.clear+reload`).
  ConstituiÃ§Ã£o V20 em modal.
- **WelcomeScreen** (`home`): hero + 5 grupos de cards (`onNavigate`) + footer.

---

## 5. Verificar IA / Humanizar (`tools/aiDetection.ts` + `tools/textForensics.ts` + toolbar)
- **Forense local** vive em `tools/textForensics.ts` (puro, 0 rede/0 quota;
  testado direto no Node por `e2e/humanizer-local.spec.ts`): taxonomia PT-BR
  de 8 famÃ­lias + `quickLocalScan()` (literal **+ lÃ©xico `data/slopPT.ts`
  ~75 entradas + 7 estruturas regex + caracteres invisÃ­veis**; conta todas as
  ocorrÃªncias e deduplica por Ã­ndice quando literal e estrutura apanham a mesma
  passagem). FamÃ­lias novas: `slop_lexico`, `caracteres_invisiveis`,
  `mobilizacao_forcada`, `auto_revelacao_ia`, `pergunta_retorica`, `parede_emoji`.
  LÃ©xico: `safe:true` = substituiÃ§Ã£o mecÃ¢nica permitida (invariante ou com
  variantes de gÃªnero/nÃºmero); `safe:false` = sÃ³ sinaliza. Estruturas regex
  (trio/dualidade/hashtags/bait/pergunta retÃ³rica/parede de emoji) **nunca**
  sÃ£o substituÃ­das â€” sÃ³ viram evidÃªncia.
- `checkAIProbabilityService` â†’ `{score, band, signals, reason, caveat, mode}`
  (faixas: <40 humano, 40-69 misto, â‰¥70 provÃ¡vel IA). Badge clicÃ¡vel no toolbar
  abre painel de sinais (famÃ­lia, count, evidÃªncia 120c + caveat). O prompt do
  perito recebe **EVIDÃŠNCIA LOCAL MEDIDA** (contagens + trechos + ritmo
  `burstinessOf` CV) em vez de dica genÃ©rica â€” ele julga sobre nÃºmeros.
- **Fallback honesto**: se o perito LLM falhar (quota/rede/JSON inutilizÃ¡vel),
  devolve `localEstimate()` (determinÃ­stico: densidade de sinais/100 palavras +
  uniformidade de frases) com `mode:'local'` e caveat explÃ­cito â€” a toolbar
  avisa "heurÃ­stica local, nÃ£o veredito". **Verificar IA nunca fica bloqueado**
  (Â§8: erro vira aviso visÃ­vel, nunca silÃªncio).
- `HUMANIZE_THRESHOLD = 70`: **Humanizar auto-verifica** (reusa se texto inalterado);
  abaixo de 70 bloqueia com aviso e nÃ£o altera nada; a partir de 70 aplica
  **passo 0 determinÃ­stico** `autoCleanText()` (remove invisÃ­veis + troca sÃ³ os
  termos `safe` do lÃ©xico, com caixa preservada â€” em dash/aspas curvas sÃ£o
  tipografia PT legÃ­tima e nÃ£o sÃ£o tocados) e depois a cirurgia LLM guiada
  pelos sinais ordenados por count (**PRIORIDADE #1 = maior count**; preserva
  fatos, `[INSERIR DADO]` em vez de inventar). SaÃ­da passa por
  `stripInvisibleChars()` de cinto-e-suspensÃ³rio, re-mede o delta
  (`IA X% â†’ Y%`) e reporta a prÃ©-limpeza no aviso (`PrÃ©-limpeza: N termo(s)`).
- Toolbar: quick actions (Expandir/Encurtar/Simplificar/Emojis via
  `refineCopyService`; `cleanAIOutput` corta divisores/prefixos/`Aqui estÃ¡...`),
  custom + meta de caracteres (meta sÃ³ vale p/ custom/Transformar), Transformar
  (pivot por plataforma/metodologia/funil/tom), PDF (`downloadPDF`: jsPDF header
  16pt, paginaÃ§Ã£o, rodapÃ© `Gerado por CopyMaster AI`), TTS, Contexto Global
  (`setSharedContext` + alert), Copiar (`clipboard` + contagem).
- `useAIGenerator`: `isQuotaError()` normalizado (quota/429/402/credit/rate/
  tier_not_allowed/free-models-per-day); quotaâ†’`setGlobalError` (modal
  `QuotaErrorModal`, que exibe a mensagem real); restoâ†’erro local friendly
  (`toFriendlyError`, nunca JSON cru). `generateStream` entrega `onChunk` final
  mesmo para providers blocking (idempotente).

---

## 6. Testes e QA
- DeterminÃ­sticos (sem quota): `smoke` (21 linhas: `#root`, tÃ­tulo, 1Âº botÃ£o,
  375Ã—667 e 1920Ã—1080), `qa-core` (home sem `pageerror`, Ideas bloqueia
  nicho vazio, 51 tabs renderizam >200 chars â€” escopar ao visÃ­vel por causa do
  keep-alive `display:none`, `AxeBuilder` zero `critical`, falha total providers
  via `route.abort` â†’ `div.bg-red-950` friendly sem `{"object"` + botÃ£o Centro),
  `redteam` (injection/vazio/gigante/URL/duplo-clique/research-down, 0 quota),
  `i18n` (EN/ES/PT + 51 tabs), `a11y-tabs` (Axe zero critical 6 tabs +
  skip-link + teclado), `prompt-harvest` (payloads reais â†’ `e2e-evidence/`),
  `server-proxy` (contrato do `/api/ai`: 405/403/400/SSRF/503 sem upstream +
  seam prod ON roteando a geraÃ§Ã£o por `/api/ai` sem auth + seam dev OFF usando
  chamada direta â€” 9 testes, 0 quota),
  `humanizer-local` (8 testes: forense PT-BR puro no Node â€” gate 70 Ã— faixa
  humano, estruturas regex, dedup lÃ©xico, autoClean, estabilidade 5Ã—, vazio â€”
  + browser mock: fallback `mode:'local'` nunca bloqueia e humanizar com
  prÃ©-limpeza/delta/saÃ­da sem invisÃ­vel), `media-audio` (6 testes: catÃ¡logo TTS
  9 plataformas puro no Node â€” template com `{{duration}}/{{words}}`, 10s=26 /
  60s=156 / 120s=312 palavras, filtro vozÃ—modelo, zero pt-PT â€” + browser mock
  provando duraÃ§Ã£o/plataforma no payload e COMANDO completo visÃ­vel),
  `guide-modal` (4 testes: guia F1 do Copywriting com >3000 chars + acordeão
  Recolher/Expandir + atalho F1/Esc com instância única no keep-alive + guia
  da bridge RevOps, 0 quota).
  SuÃ­te determinÃ­stica = essas 20 specs
  (inclui `full-user`/`fallback`/`army-*` mockadas) com `--workers=1`: 101/101.
- Com quota `:free` (50/dia, reset diÃ¡rio): `user-full` (140 linhas, `retries:1`,
  hero + â‰¥20 `Acessar MÃ³dulo`, navega 51 tabs + wallet/settings, bloqueios,
  2 geraÃ§Ãµes reais â€” Ideas ~40KB/740s polling `Baixar RelatÃ³rio`, Copy 340s
  `VariaÃ§Ã£o 1` â€” erro sempre friendly), `mx-live` (harness manual de visuais com
  log `[MX:tag] LEN STAR DASH DIV PT EN`; nÃ£o Ã© spec permanente), matriz P1
  (harness Node quando browser trava), auditoria rÃ¡pida (47 chamadas â€" agendar).
- Helpers de naveÃ§Ã£o live: `e2e/helpers/sessionTabs.ts` â€" localiza tab por **id OU rÃ¡tulo PT** (`TAB_LABELS` das 51 sessÃµes) e lÃª o painel keep-alive visÃ­vel (`activePanelText`: filho de `[role=tabpanel]` com `display:block` + `aria-hidden="false"` â€" nunca o contÃªiner). Usado por `user-full`, `general-user`, `verification-cycle` e `full-verification`. **NÃ£o use Ã­ndice numÃ©rico de tab** (quebra a cada sessÃ£o nova) nem `[role="tabpanel"][aria-hidden="false"]` (nunca casa â€" ver `basic-flow.spec.ts`).
- PadrÃ£o de spec: briefing mÃ­nimo, asserts de formato (nÃ£o de mÃ©rito), erros
  via `route.abort/fulfill`, `test.setTimeout` generoso (300-740s), workers â‰¤4.
- Armadilhas conhecidas: painÃ©is keep-alive `display:none` no DOM (escopar
  asserts ao visÃ­vel â€” `activeRoot` prefere `display:block` + `aria-hidden="false"`);
  Vite **reinicia ao gravar `.env`** (recarrega a pÃ¡gina);
  modelo `:free` fraco oscila idioma/divisores (prompts exigem, parsers toleram).
  Spec mockada sem chave NÃƒO gera: `callAI` retorna erro antes do fetch e o
  `route.fulfill` nunca dispara (falha silenciosa, 0 quota gasta) â€” todo spec mock
  semeia em `beforeEach` via `addInitScript` a chave dummy `openrouter_api_key`
  (`e2e-mock-key-sem-quota`) + providers primÃ¡rios `openrouter`; briefing de teste
  nunca contÃ©m o marcador (input ecoa e o wait vira vÃ¡cuo); throttle 2,5s/chave
  serializa a fase ideas (~12s) â€” waits pÃ³s-ideas com folga; Delta lock com
  `click({force:true})` e `--workers=1` (paralelo = OOM `Target closed`).

## 7. Checklist de mudanÃ§a segura
1. `npx tsc --noEmit` â†’ `npm run build` â†’ smoke + qa-core.
2. `npm run doc:check` (ou `python3 scripts/check-anchors.py`) â€” trava
   docâ†"cÃ³digo: 31 Ã¢ncoras `arquivo:linha` + 3 invariantes (51 tabs,
   47 mÃ³dulos, divisores). Se falhar, atualize o cÃ³digo ou este arquivo â€"
   nunca ignore a divergÃªncia.
3. Mexeu em prompt? Confira divisores exatos em linha prÃ³pria + rode a sessÃ£o.
4. Mexeu em parse? Confira `stripCopyFormat` + caso sem divisor (fallback).
5. Mexeu em provider/chave? Confira `resolveEnvKey`, fallback e `friendlyErrors`.
6. Nada de segredo no cÃ³digo; audite o bundle (`npm run security:bundle` =
   `python scripts/check-bundle-secrets.py dist`) e nunca distribua build com
   `ALLOW_BUNDLE_SECRETS=1`.
7. Atualize ESTE arquivo se mudar contratos (incluindo Â§9 para subsistema novo).

## 8. Nunca fazer
- Chamar LLM fora de `callAI()`; expor chave em log/erro/UI; commitar `.env`.
- Reintroduzir `system:` top-level global (quebra Groq/Mistral/NVIDIA/Meta/Grok).
- Misturar nota no entregÃ¡vel; exigir `NOTA_DIVIDER` de ideas/personas (JSON).
- Compartilhar estado entre suites (cada uma tem seu `useState`; sÃ³ import explÃ­cito).
- BotÃµes que alegam aÃ§Ã£o que nÃ£o executam (placebo); erros silenciosos
  (toda falha termina em `setError`/`setGlobalError`/alert friendly).
- Importar `data/*` direto no componente (usar `getLocalizedLists`); usar `label`
  de categoria como chave (usar `id` estÃ¡vel); chamar `buildPlatformBlock` com `{}`.
- Deixar skills/regras genÃ©ricas de agente (ex.: Everything Claude Code) sobrepor
  este arquivo: em conflito, **AGENTS.md vence**. As skills ECC sÃ£o biblioteca de
  apoio sob allowlist em `opencode.json` (permissions `skill`), nÃ£o contrato.

---

## 9. Subsistemas de apoio (com Ã¢ncoras `arquivo:linha`)

### Chaves (`services/vaultService.ts` + Centro de Comando)
Cofre AES-GCM-256 em `localStorage` (`copymaster_vault:v2` + salt;
PBKDF2 100k SHA-256; IV 12 bytes). `setVaultKey` criptografa e remove legado
`*_api_key` (vazio deleta); `getVaultKey` migra legado sozinho. Por
navegador/perfil â€” nÃ£o sincroniza, some se limpar dados do site.
`SettingsCenter â†’ Salvar ConfiguraÃ§Ãµes`: **testa a conexÃ£o antes**; se OK,
grava no **cofre (efeito imediato) + `.env` via `POST /api/env` (dev)**;
campo apagado remove dos dois; resumo exibido no botão.
O campo extra `cloudflare_account_id` também vai para o `.env` (chave
`CLOUDFLARE_ACCOUNT_ID`): no **blur** do campo (e no `Salvar`, quando há valor)
o Centro faz `POST {provider:'cloudflare_account_id'}` — validação
`^[A-Za-z0-9-]{8,64}$` (bloqueia URL/texto colado), **escrita idempotente**
(conteúdo igual não reescreve → sem restart do Vite) e valor vazio remove a
linha; em produção o POST responde 405 com a instrução do dashboard. O
`callAI` resolve `{account_id}` como localStorage →
`process.env.CLOUDFLARE_ACCOUNT_ID` (embutido pelo `define` do `vite.config`,
fora do blanking por não ser segredo); feedback no campo sobrevive ao
full-reload via `sessionStorage` one-shot.

### Proxy `/api/ai` (H1 fechado â€” produÃ§Ã£o sem segredos no bundle)
`api/ai.ts` (function Vercel + rota no plugin dev, mesmo canal `ssrLoadModule`
de pin/scrape/research): POST-only (405), Origin host==Host (403), rate 60/min
por IP (429 + `Retry-After`), corpo mÃ¡x 6MB (413). Allowlist anti-SSRF rÃ­gida â€”
provider existe em `ENV_KEY_MAP`/`PROVIDER_CONFIGS`, `https:`, sem credenciais
nem porta, **host exato** do `cfg.url` (gemini restrito a
`generativelanguage.googleapis.com/v1beta/models/`),
`NEVER_PROXY = {9router,huggingface,runway,elevenlabs,stability}` â†’ 400 (gateway
local: o servidor nÃ£o alcanÃ§a o localhost do usuÃ¡rio). Chave do servidor = pool
`base + _2.._9` lido de `process.env` **e** do arquivo `.env` (paridade dev/prod);
sem chave â†’ 503 PT-BR (`... ausente no servidor ...`), nunca loga/retorna segredo.
Headers de auth do cliente sÃ£o descartados; servidor injeta `Bearer`
(anthropic: `x-api-key` + `anthropic-version`; gemini: `x-goog-api-key`).
`forward()` retry 401/429 em atÃ© 3 chaves do pool, `redirect:'error'`, timeout
290s (504/502); repassa status/content-type/`retry-after`/corpo do upstream;
`export const maxDuration = 300`.
Cliente: `services/serverKeyService.ts` â€” sentinel `SERVER_KEY =
'__copymaster_proxy__'`; gate `useServerKeys()` = PROD (`import.meta.env.PROD`,
bundle sem segredos) OU flag `localStorage copymaster_server_keys` (`'1'` forÃ§a,
`'0'` bloqueia). **Dev sem flag â†’ `ensureServerKeys()` devolve `{}` sem rede**
(especificaÃ§Ãµes intactas, 0 quota). Com gate ligado: GET `/api/env` (4s abort,
cache 60s / negativo 10s) filtra `NOT_PROXYABLE` e URL vazia â†’ mapa
`{provider: tem-chave}`. `callAI` aquece `ensureServerKeys()` **antes** do rank
(`invalidateRankCache()` no transiÃ§Ã£o frioâ†’quente), prefere o sentinel na ordem
de chave primÃ¡ria e no loop de fallback (`doFetch`: sentinel â†’ POST `/api/ai` com
auth removida; qualquer outra chave â†’ `fetch` direto de sempre). Gemini com
sentinel vira REST v1beta nÃ£o-streaming com fidelidade do SDK
(`systemInstruction`/`tools`/`responseSchema`/`imageConfig`/`maxOutputTokens`,
`responseModalities` em modelo `*image*`) â€” um Ãºnico `onChunk` final.
`routerService.hasEnvKey` conta o mapa do servidor primeiro (sem isso a cadeia
de fallback da produÃ§Ã£o encolheria para sÃ³-cofre/legado). Specs:
`e2e/server-proxy.spec.ts` (9 testes, 0 quota).

### Provedores de LLM (`services/providerConfig.ts`, 32 entradas)
`Record<key,{name,url,defaultModel,link,description,howTo,corsWarning?}>`.
9Router local (`http://localhost:20128/v1/chat/completions`), NVIDIA, Polin,
Gemini (SDK, sem URL), OpenAI (`corsWarning`), Anthropic (headers prÃ³prios),
DeepSeek (`corsWarning`), Meta/Groq (mesma URL Groq, modelos `gpt-oss-120b`),
Mistral, Cohere, OpenRouter Hub, Qwen, Ernie, Moonshot, Yi, Zhipu/Z.AI, Grok xAI,
HyperCLOVA, Perplexity, HuggingFace (sem endpoint), Together, ElevenLabs (TTS),
Stability (imagem), Runway (vÃ­deo), Cerebras (1M/dia), SambaNova, Chutes,
SiliconFlow, Nebius, Cloudflare (`{account_id}` â†’ `localStorage
cloudflare_account_id`, sem ID = erro orientativo).
Gratuitos sem cartÃ£o: Groq, OpenRouter `:free`, Gemini Flash, Cerebras, SambaNova,
Chutes, SiliconFlow, Zhipu, Nebius (crÃ©ditos), Cloudflare (10k req/dia).
`ENV_KEY_MAP` vive em `vite.config.ts` (dev) espelhado em `api/env.ts`
(prod readonly); `resolveEnvKey` em `aiClient.ts`, `hasEnvKey` em
`routerService.ts`. Ao adicionar provider, atualize os 4 + card em
`SettingsCenter` (`mainLLMs/otherLLMs`) â€” ver Â§16.
`/api/env` (plugin Vite em dev): GET mascarado (**sÃ³ prefixo** `sk-o********` +
count do pool; antes era `4+***+4` com 4 finais expostos), POST grava/remove
(reinicia dev server). **Sem CORS `*`** (same-origin: era CSRF cross-origin +
leitura de mask por qualquer site aberto no browser do dev; o POST tambÃ©m
recusa chave com CRLF). **Em produÃ§Ã£o (Vercel) Ã© read-only
(405)** â€” chaves vÃ£o no dashboard.
**SEGURANÃ‡A (H1 FECHADO em 2026-09-30)**: `vite.config.ts â†’ define` sÃ³ embute
segredos quando `command === 'serve'` (dev local) ou `ALLOW_BUNDLE_SECRETS=1`
(escape efÃªmero, nunca distribuiÃ§Ã£o). Em `vite build` â€” inclusive `vercel build`
local â€” todo segredo vira `""` (pools `*_LIST` viram `[]`); ficam de fora do
blanking sÃ³ o catch-all `process.env` (â†’ `{}`) e os `LITELLM_MODEL_PRIMARY/FALLBACK`
(nÃ£o-sensÃ­veis). A autenticaÃ§Ã£o em produÃ§Ã£o passa a ser server-side via proxy
`/api/ai` (ver "### Proxy `/api/ai`" acima). **Guard ativo (defesa em
profundidade):** `npm run build` ainda bloqueia se ARQUIVO `.env` tem chaves
(erro `BLOQUEADO`, vale tambÃ©m p/ `vercel build` local â€” a CLI seta `VERCEL=1`);
para bundle local efÃªmero use `ALLOW_BUNDLE_SECRETS=1 npm run build`
(PowerShell: `$env:ALLOW_BUNDLE_SECRETS="1"; npm run build`) e valide com
`npm run security:bundle` antes de distribuir. **O ALERTA H1 antigo morreu:**
chaves do dashboard da Vercel em `process.env` nÃ£o chegam mais ao bundle (o
blanking Ã© exatamente o `define` que as embutia). Prova de canÃ¡rio do gate:
mover `.env` â†’ `OPENROUTER_API_KEY=sk-canary... GROQ_API=gsk_canary... npm
run build` â†’ `grep sk-canary dist/` vazio + `npm run security:bundle` limpo â†’
restaurar `.env` (o guard volta a bloquear).

### Pool, ranking e carteira
- `keyPoolService.ts`: pool `base + _2.._9` (todos os 32 providers, atÃ© 9 chaves cada;
  `MAX_POOL_KEYS=9`), `getEnvKeyList` (1Âº `*_LIST` do build, senÃ£o varredura),
  `getApiKeys` (env + cofre, dedup), `keyFingerprint` p/ logs sem vazar,
  `isRetriableError` (**`status >= 500`**/401/429/402/404/400/410/403 +
  `tier_not_allowed/quota/rate/
  model_not_found...` sempre giram â€” 5xx entrou em 2026-09-30: um 502/503 do
  primÃ¡rio nÃ£o pode abortar a cadeia, que Ã© o que Â§2 promete), throttle 2,5s por chave.
- `routerService.ts`: `healthCache` TTL 60s (morto = 999999), `hasEnvKey`
  (32 providers, incl. `openai/anthropic/qwen/ernie` etc.), `rankProviders` (env âˆª cofre com url/gemini; score = quota
  restante + bÃ´nus openrouter+1M/9router+500k; desempate latÃªncia; `corsWarning`
  por Ãºltimo), `getFallbackChain(start)` (rotaciona p/ comeÃ§ar no preferido;
  `start` fora do ranking â†’ prefixado na frente â€” sem isso `testConnection`
  testava outro provider e dava resultado falso). Auto-escala 1..N: `getTopProviders(N)` distribui seÃ§Ãµes Ideas em round-robin; `callAI` gira N chaves por provider sequencial com `attempt-cap 2 + Retry-After`.
- `usageService.ts` (100% local): `DEFAULT_SETTINGS` (25 providers; 1M p/
  9router/gemini/meta/openrouter/groq, 100k elevenlabs, 1000 stability/runway,
  resto 500k; `renewalDay:1`), `trackUsage` (poda >90 dias â†’
  `copymaster_usage_history`), `getCurrentCycleUsage` (ciclo ancorado em
  `renewalDay`; alimenta ranking + `TokenDashboard`; `App.tsx` consulta antes).
- `openRouterCatalog.ts`: `fetchCatalog()` (cache 24h; filtra
  `pricing.prompt == 0` + `:free`; fallback `CURATED_FREE`); pool
  `openrouter_free_pool` (multi-seleÃ§Ã£o); `setLastModel` (visÃ­vel no Centro).

### Pesquisa com fatos reais (`services/research/`)
Grounding anti-alucinaÃ§Ã£o (Itens 14/32):
- `research/quickResearch.ts:114` â€” `quickResearch(niche, language)` (custo 0):
  aba "Pesquisa InstantÃ¢nea" do IdeaSession (`components/IdeaSession.tsx:65`).
  `ResearchScope` (`:12`, `auto|geral|noticias|academico`, default `geral`,
  persistido em `copymaster_research_scope:v1`): `geral` = WEB-ONLY
  (busca Google normal: blogs/guias/sites via `api/research?source=web`,
  que agrega Yahoo RSS + DuckDuckGo lite/html + Bing + SearxNG em paralelo,
  timeout 8s; Google News isolado em `noticias`);
  `noticias` = 1 fonte (news via server-only, 3s); `academico` =
  5 fontes acadÃªmicas (6s, sem penalty); `auto` = 8s com detecÃ§Ã£o comercial.
  `geral` nunca devolve vazio se hÃ¡ algo ranqueado (top parcial + aviso).
  News e web correm DESACOPLADOS (cada um com sua race; web lento nÃ£o descarta
  news); teto 10 resultados (`limit` 10 + `slice(0,10)`); gate relaxado sÃ³ em
  `geral` (scoreâ‰¥2 + coberturaâ‰¥0,2); migalha 0-1 nÃ£o Ã© cacheada (evita stale).
  Parsers DDG/Bing tolerantes (ordem de atributos, aspas, `b_algoBorder`,
  unwrap `uddg=` + URLs protocol-relative `//`).
  URLs validadas (`isValidWebUrl` em `api/research.ts` + `isClickableUrl` em
  `quickResearch.ts`: sÃ³ http(s) pÃºblico clicÃ¡vel, sem scheme/relativo/pÃ¡gina
  de buscador; `news.google.com` permitido). Entities decodificadas ANTES do
  strip (`decodeEntities` + 2Âª passada em `cleanHtml`, fallback p/ title se
  sobrar `href=`); CBMi resolvido p/ canonical via `<source url>` quando
  presente. Engines web com timeout 6s + race `geral` 8s. Fase 2 em
  `IdeaSession.tsx` com try/finally + contador de segundos + auto-salto para
  a aba Ideias â€” nunca trava em "Arquitetando...".
  `rankSnippets` (`:209`, TF tÃ­tuloÃ—3 + cobertura + boost news/blog +
  recÃªncia âˆ’ penalidade comercial em teses, exceto `academico`) e
  `filterSnippets` (`:247`). `detectCommercialIntent` (`:83`) pula PubMed/SciELO
  em queries comerciais; `filterByRelevance` (`:237`, scoreâ‰¥4 + coberturaâ‰¥0,3)
  impede tese sem relaÃ§Ã£o de virar "Mais aderente". Cache 6h com chave por escopo.
- `research/researchOrchestrator.ts:47` â€” `gatherResearch()`: 6 fontes em
  paralelo (semantic 4, arxiv 3, openalex 3, pubmed 2, crossref 2, news 4),
  dedup por URL, `enrichWithMarkdown(1)`, cache 6h em `localStorage`,
  injeta `[FONTE N]` no prompt (Ideas; fallback automÃ¡tico p/ qualquer prompt
  com `tools:googleSearch` em `aiClient.ts`). `snippetsToGroundingBlock`
  (`:73`), `citingInstructions` (`:79`).
- `research/researchClient.ts:21` â€” `fetchSource()`: tenta `GET /api/research`
  (serverless, sem CORS nem chave, 12s) e cai para `import()` dinÃ¢mico local.
- `api/research.ts`: handlers server (arxiv/semantic/openalex/pubmed/crossref/
  news RSS pt-BR) com fallback `{ok:true,items:[]}`.
- Provedores em `research/providers/*.ts` retornam `SourceSnippet`
  (`{title,url,snippet,sourceType,date,source}`, tipo em `arxiv.ts:1`).

### Personas ativas (`services/personaService.ts`, `localStorage`)
- `:7` get / `:15` save (upsert) / `:28` delete / `:38`+`:46` ativa
  (`copymaster_active_persona_id`) / `:51` resolve / `:58` serializa p/ prompt
  (`MARCA/CLIENTE/TOM/VOCABULÃRIO/MISSÃƒO`).
- Formato em `types.ts:37-46`. A persona ativa **prefixa o prompt do Copy**
  (`components/CopyGenerator.tsx:113`) e aparece na `ActivePersonaBar`.
- `api/pin.ts`: proxy Pin p/ Citation (`og:image â†’ pinimg â†’ Microlink`,
  rejeita `/ideas/`, teto 2,5MB, `bytes=1` retorna base64).
- `vision/modelDna.ts`: `analyzeModelLocal` (canvas 64px, sem rede) /
  `analyzeModelImage` (Gemini vision JSON, cache session) + `buildModelDnaBlock`.

### CrewAI / prompts.chat (personas + pipelines sequenciais â€” 2026-10-02)
AdoÃ§Ã£o do padrÃ£o de **task decomposition** do crewAI (sem o framework Python) e
das **personas curadas** do prompts.chat (CC0 1.0 â€” uso comercial livre).
- `data/crewai-personas.ts` â€” `CREWAI_MARKETING_PERSONAS` (9 personas com
  `role/goal/backstory/frameworks/tone/avoid/bestFor[]`) + helpers
  `getCrewAIPersona(id)` / `getCrewAIPersonasForSession(session)`; exportado em
  `constants.ts`. SessÃµes-alvo: copy, vsl, email, landing, ads, article, prd.
- `services/modules/copy/crewaiPersona.ts` â€” `personaBlock(id)`: injeta o
  bloco ROLE/GOAL/BACKSTORY no prompt de qualquer serviÃ§o (persona selecionada
  funciona tambÃ©m no modo tradicional, sem o pipeline).
- `services/modules/copy/crewaiTasks.ts` â€” 5 workflows (`VSL` 4 tasks:
  researchâ†’structureâ†’scriptâ†’review; `email`/`landing`/`article`/`prd` 2 tasks
  cada) com `CrewAITask{agentRole, agentGoal, agentBackstory, expectedOutput,
  dependsOn?, responseSchema?}` + `getCrewWorkflow(session)`.
- `services/modules/copy/crewaiExecutor.ts` â€” `executeCrewWorkflow`: ordena
  por dependÃªncia (topological sort), monta prompt interpolando `{context}` e
  `{taskId.output}`, chama `callAI` com `systemInstruction` = role+goal+
  backstory e `responseSchema` nas tasks JSON.
- `services/modules/copy/crewaiWorkflowService.ts` â€” `runCrewWorkflow(session,
  context, onChunk)`: fachada que executa o workflow e **recompÃµe o entregÃ¡vel
  no contrato da sessÃ£o** (divisores `|||EMAIL_DIVIDER|||`/`|||NOTA_DIVIDER|||`/
  `|||SCHEMA_DIVIDER|||`/`PRD_DIVIDER` preservados) â€” nunca devolve JSON cru.
- **Modo CrewAI na UI** (toggle real, nÃ£o placebo): `VSLStudio` (4 etapas),
  `EmailStudio` e `LandingPageStudio` (2 etapas) â†’ `runCrewWorkflow`.
  `CopyGenerator`, `AdsStudio`, `ArticleGenerator` e `PRDStudio` sÃ³ recebem o
  **seletor de persona** (1 chamada, bloco injetado via `personaBlock`).
- `responseSchema` JSON (`application/json`) disponÃ­vel nos modos CrewAI avulsos
  de `vsl/email/landingPage/article/prd` (`*_RESPONSE_SCHEMA` exportados) â€” o
  JSON sÃ³ Ã© emitido quando `useCrewAI` estÃ¡ ligado; modo tradicional continua
  emitindo texto com divisores (contrato intocado).
- **Prompt Optimizer** (meta-prompt): `services/modules/tools/promptOptimizer.ts`
  (`optimizePromptService`) reestrutura o texto atual em
  ROLE/CONTEXT/TASK/CONSTRAINTS/OUTPUT FORMAT sem inventar fatos; botÃ£o
  "Otimizar Prompt" na `RefinementToolbar` mostra o resultado em painel com
  Copiar/Fechar (nÃ£o substitui o conteÃºdo gerado automaticamente).
- REGRAS: nunca logar chave (Â§8); persona nunca substitui a ConstituiÃ§Ã£o
  (prefixo, nÃ£o override); workflow falha â†’ erro friendly no `setError` do hook.

### MemÃ³ria, PDF e i18n
- `services/memoryService.ts`: `addHistory` (`:65`, previews 400/600, mÃ¡x 500)
  reconstrÃ³i o cÃ©rebro (`:57`: top tons/mÃ©todos/providers + tÃ³picos);
  consumido via `contexts/MemoryContext.tsx` (polling 4s + `storage` event) e
  gravado pelo `aiClient`. Chaves `copymaster_history/profile/brain:v2`.
- `services/pdfService.ts:3` â€” `downloadPDF(title, content)` (jsPDF, header
  16pt, paginaÃ§Ã£o, rodapÃ© "Gerado por CopyMaster AI", `save()` em `:56`).
- i18n: `hooks/useTranslation` (`portuguÃªsâ†’pt, espaÃ±olâ†’es, englishâ†’en`,
  default `en`; `t(key)` com fallback EN) + `utils/translations.ts`
  (**`en` + `pt` + bloco `es: {}` vazio e documentado** â€” `es` cai em EN p/ labels via fallback de `t()`; listas tÃªm triplo PT/EN/ES).
  Idioma global em `App.tsx` via prop. Nova string: adicionar em `en`+`pt`
  (e triplo `data/*` + `getLocalizedLists` se for opÃ§Ã£o de seletor); testar
  trocando o `<select>` do sidebar. Prompts visuais sempre EN tÃ©cnico.

### Ã‚ncoras dos contratos crÃ­ticos (Â§2, Â§5) â€” recalibradas em 2026-09-30
(auto-seleÃ§Ã£o + N chaves por provider + fallback robusto + turbo manual
+ correÃ§Ãµes da auditoria: cofre legÃ­vel, 5xx retriable, geminiâ†’fallback,
max_tokens Anthropic, keep-alive da home â€” ver Â§14)
`aiClient.ts`: `callAI` :288, pool+fallback :503, strict-system :811,
timeouts :833, `testConnection` :950, GOLDEN :28, VISUAL :271. `vaultService.ts`: chaves :1-2,
`setVaultKey` :64, migraÃ§Ã£o :211. `keyPoolService.ts`: `MAX_POOL_KEYS` :12,
`getApiKeys` :101, `isRetriableError` :134.
`friendlyErrors.ts`: `toFriendlyError` :6. `stripCopyFormat.ts`:
`stripCopyMarkdown` :11, `splitCopyVariants` :55, `stripVisualPrompt` :69,
`splitOptions` :101, `splitVisualResult` :120. `aiDetection.ts`:
`HUMANIZE_THRESHOLD` :7. `textForensics.ts`: `quickLocalScan` :105,
`localEstimate` :226.
`tools/diagnostic.ts`: `AuditMode` :67, `MARK` :167, `AUDIT_MODULE_IDS` :608,
`runStressTestService` :438.
`SettingsCenter.tsx`: POST `/api/env` :109, `handleSave` :154.
`hooks/useAIGenerator.ts`: `isQuotaError` :12. `ToolLayout.tsx`:
`OutputKindBadge` :10, `EngineLink` :24. `QuotaErrorModal.tsx`: `message` :8.
Para revalidar: `python3 -c "import pathlib; t=pathlib.Path('services/core/aiClient.ts').read_text().splitlines(); print([i+1 for i,l in enumerate(t) if 'export const callAI' in l])"`.

---

## 10. Como adicionar uma sessÃ£o N+1 (scaffold)
1. **Dados**: se precisar de seletor novo, adicione triplo `X_PT/X_EN/X_ES` em
   `data/<dominio>.ts` (1Âº item `AutomÃ¡tico`) e exponha em
   `constants.ts:getLocalizedLists` (ternÃ¡rio `isPt/isEs`).
2. **ServiÃ§o** `services/modules/<area>/<nome>.ts`: exporte
   `generate<Nome>Service(params, onChunk?)` chamando **sempre `callAI()`**
   (nunca `fetch` direto); monte prompt com seletores + `buildPlatformBlock`
   (visuais, nunca `{}`) + divisor exato em linha prÃ³pria + `SESSION_HIERARCHY_RULE`.
3. **Componente** `components/<Nome>.tsx`: use `ToolLayout` (sidebar + main +
   `outputKind`), `useAIGenerator` (`generate`/`generateStream`), parser de
   `stripCopyFormat`, `RefinementToolbar`, `SectionHelp`; estados locais
   (nunca compartilhe entre suites); bloqueie botÃ£o com briefing vazio;
   erros via `setError`/`setGlobalError` (nunca JSON cru, nunca silencioso).
4. **Registro**: `lazy()` + entrada em `components` + `NavItem` em
   `components/App.tsx` (grupo correto) + card em `WelcomeScreen.toolGroups` +
   strings em `utils/translations.ts` (en+pt).
5. **Auditoria**: adicione o mÃ³dulo em `services/modules/tools/diagnostic.ts`
   (`MODULES[...]`, briefing com `ZAFRA-42`, asserts: sem saudaÃ§Ã£o, divisor
   exato, marcador, nota isolada) e atualize ESTE Â§4 + contagem do tÃ­tulo.
6. **Testes**: rode `npx tsc --noEmit` â†’ `npm run build` â†’ smoke + qa-core;
   adicione a tab no `qa-core` (visÃ­vel) e, se precisar de geraÃ§Ã£o real, no
   `user-full`/`mx-live` com timeout generoso.

## 11. Como adicionar provider / motor visual
- **Provider LLM**: `services/providerConfig.ts` (name/url/model/link/howTo/
  cors?) + `vite.config.ts ENV_KEY_MAP` + `api/env.ts ENV_KEY_MAP` +
  `aiClient resolveEnvKey/envMap` + `routerService hasEnvKey` + card em
  `SettingsCenter` (`mainLLMs/otherLLMs`). Teste com `Testar` antes de Salvar.
- **Motor visual**: novo perfil em `platformProfiles.ts` **exige doc-fonte
  oficial** (sintaxe, caps, negativo, aspecto, overlay) + `match[]` + `aspect()` +
  `textOverlay()` + entrada em `PLATFORM_LINKS`; rode harness motorÃ—sessÃ£o.

## 12. Troubleshooting (erros comuns)
- **Quota/429/402/tier**: `isQuotaError` â†’ modal global com mensagem real;
  troque provider/modelo `:free`, aguarde reset diÃ¡rio (50/dia), ou use chave prÃ³pria.
- **CORS (`Failed to fetch`)**: providers com `corsWarning` (OpenAI/DeepSeek)
  vÃ£o por Ãºltimo; prefira OpenRouter/9Router/Groq no browser.
- **9Router local offline**: timeout 3,5s â†’ penalizado 60s; suba o gateway em
  `localhost:20128` ou troque o primÃ¡rio.
- **Cloudflare sem Account ID**: erro orienta a preencher
  `cloudflare_account_id` no card; **no blur ele grava `CLOUDFLARE_ACCOUNT_ID`
  no `.env`** (dev — prod: dashboard Vercel → Environment Variables) e o
  `callAI` cai de localStorage → `process.env.CLOUDFLARE_ACCOUNT_ID`; URLs
  `{account_id}` nunca usam placeholder.
- **Vite reiniciou ao salvar**: normal â€” gravar `.env` recarrega a pÃ¡gina (dev).
- **`:free` fraco**: oscila idioma/divisores â€” prompts exigem, parsers toleram;
  re-tente ou troque de modelo no pool.
- **Reasoning/JSON vazado**: `callAI` descarta e gira pool; nunca exiba
  `reasoning_content/chatcmpl` cru.
- **`dist/` com segredo**: `vite build` zera os segredos do `define` e o guard
  recusa `.env` com chaves (erro `BLOQUEADO`); audite com `npm run security:bundle`
  e nunca distribua build com `ALLOW_BUNDLE_SECRETS=1`.
- **ProduÃ§Ã£o sem chave no bundle (H1)**: o browser nÃ£o tem chave â€” a geraÃ§Ã£o vai
  pelo proxy `/api/ai`. Se vier `503 ... ausente no servidor`, cadastre a
  Environment Variable no dashboard da Vercel (pool `BASE`, `BASE_2`..`BASE_9`);
  se vier 403, o Origin do app nÃ£o bate com o host; 429 = rate 60/min por IP.
- **Painel vazio no teste**: lembre do keep-alive `display:none` â€” escopar ao visÃ­vel.
- **Nota misturada**: confira `|||NOTA_DIVIDER|||` em linha prÃ³pria + `splitVisualResult`.

## 13. GlossÃ¡rio rÃ¡pido
- **SessÃ£o/tab**: 1 das 51 ferramentas (`activeTab`); `wallet/settings/home` nÃ£o contam.
- **Badge T/I**: `Texto` (copia-cola) vs `Prompt imagem` (EN p/ outra IA).
- **Divisor**: marcador textual `|||X_DIVIDER|||` entre entregÃ¡vel/nota/opÃ§Ãµes.
- **Nota do Estrategista**: janela separada apÃ³s `|||NOTA_DIVIDER|||` (Ãºnico lugar com Markdown).
- **Cover/Thumb**: modo visual das suites (usa roteiro como fonte + `coverConfig`).
- **Cofre**: `copymaster_vault:v2` (AES-GCM local).
- **CÃ©rebro**: `copymaster_shared_context:v2` + `copymaster_brain:v2` (memÃ³ria).
- **ZAFRA-42**: briefing-marcador da auditoria (prova que o seletor fluiu).
- **Gate 70**: Humanizar sÃ³ a partir de 70% probabilidade IA.
- **Proxy `/api/ai` / sentinel `__copymaster_proxy__`**: function serverless que
  injeta a chave do servidor quando o browser nÃ£o tem nenhuma (gate: PROD ou flag
  `copymaster_server_keys`; ver Â§9).

## 14. ManutenÃ§Ã£o desta doc
- Toda mudanÃ§a de contrato (novo seletor, divisor, provider, motor, sessÃ£o,
  parser, fluxo de chave, modo de auditoria) **exige** atualizar este arquivo
  na mesma PR/commit, incluindo contagens (28), tabela de divisores e Ã¢ncoras.
- Ã‚ncoras `arquivo:linha` sÃ£o verificadas por `scripts/check-anchors.py`
  (29 Ã¢ncoras, tolerÃ¢ncia Â±3 linhas). Ao mover um sÃ­mbolo, rode
  `npm run doc:check` e atualize a Ã¢ncora na mesma PR â€” ou ajuste o script
  se a Ã¢ncora nova for a verdade.
- Drifts resolvidos em 2026-09-23 (nÃ£o reintroduzir): `e2e/user-full.spec.ts:31`
  agora exige â‰¥28 tabs; Auditoria renomeada V22â†’V23 com 23 mÃ³dulos
  (rÃ¡pida 23 / completa 46); `App.tsx` raiz marcado `@deprecated`
  (canÃ´nico: `components/App.tsx`); PPT com `outputKind="text"`;
  `utils/translations.ts` com bloco `es: {}` explÃ­cito (fallback EN por chave).
- SessÃ£o 28 em 2026-09-27: `PRDStudio` (PRD Vibe Studio, `|||PRD_DIVIDER|||`);
  Auditoria V23â†’V24 com 24 mÃ³dulos (rÃ¡pida 24 / completa 48); Ã¢ncoras
  `diagnostic.ts` recalibradas (`AuditMode` :67, `MARK` :167, `AUDIT_MODULE_IDS` :608, `runStressTestService` :610).
- Elite Loop em 2026-09-28 (10 ondas, 59/59 specs mock verdes + mÃ©rito real):
  contratos novos â€” Email cap 5/geraÃ§Ã£o (`email.ts` + `EmailStudio` options);
  Personas anti-recusa + `[ASSUNÃ‡ÃƒO]`; shop TikTok/Reels bloqueia sem produto
  (UI + serviÃ§o, Item 18); `maxTokens` sistÃªmico (8192 longos, 4096 sexy);
  Notebook cards localizados + `LANGUAGE` em notebook/sexy/personas;
  `images:` ao `callAI` nas 6 visuais com upload; Regra #6 condicional
  (sÃ³ com foto); LP tech STATIC ONLY + inputs SeÃ§Ãµes/Interatividade;
  `splitVisualResult` tolera divisor quebrado; skip-link a11y no `App`;
  Ã¢ncoras `aiClient` recalibradas (strict :504, timeouts :523,
  `testConnection` :617 â€” `toInlineParts` no fim do arquivo).
  Specs novas (mock, 0 quota): `redteam` (injection/vazio/gigante/URL/upload/
  duplo-clique/research-down), `i18n` (EN/ES/PT + 50 tabs), `a11y-tabs`
  (Axe zero critical 6 tabs + skip-link + teclado), `prompt-harvest`
  (payloads reais â†’ `e2e-evidence/prompts/` + mÃ©rito keyless em
  `e2e-evidence/merit/`); 28 relatÃ³rios em `.notebook/sessoes/`.
- Fallback robusto em 2026-09-29 (64/64 specs): `keyHealthService.ts`
  (auditoria "Testar todas as chaves", mapa `copymaster_keyhealth:v1` 24h,
  semÃ¡foros nos cards + painel Fallback no Centro, toggle turbo opt-in);
  `trackUsage` ligado de verdade (`usage` das respostas â†’ quota real no rank);
  cadeia exclui chaves mortas, afunda gateway morto e saldo zerado
  (short-circuit do primÃ¡rio esgotado), attempt-cap 2 (sÃ³ com prÃ³ximo na fila),
  Retry-After atÃ© 30s, `touchDead` em 401, `via:{provider,model}` no retorno +
  indicador "via X" no `UsageIndicator`; Ideas distribui 4 seÃ§Ãµes por provider
  (`providerHint`, round-robin `getTopProviders`); turbo em `callAI` (race
  top-2, default OFF); spec `e2e/fallback.spec.ts` (429â†’secundÃ¡rio, abort,
  short-circuit, auditoria, turbo); Ã¢ncoras `aiClient` (strict :583,
  timeouts :602, `testConnection` :721) e `SettingsCenter` (`/api/env` :91,
  `handleSave` :123).
- Pool generalizado 1..N em 2026-09-30: pool `base + _2.._9` estendido de 2 para
  32 providers (`keyPoolService.ts`, `vite.config.ts:POOL_BASES`, `api/env.ts`,
  `aiClient.ts:resolveEnvKey/envMap`, `routerService.ts:hasEnvKey/ENV_PROVIDERS`,
  `keyHealthService.ts:ENV_SINGLE+listConfiguredKeys`); auto-escala 1..N chaves
  vivas por provider + round-robin Ideas `getTopProviders(4)`; turbo permanece
  manual OFF (escolha do especialista); Ã¢ncoras `aiClient` recalibradas
  (strict :618, timeouts :637, `testConnection` :756).
- Auto-seleÃ§Ã£o + N chaves por provider em 2026-09-30 (2Âª onda): sistema escolhe
  motor sozinho (`aiClient:getBestProvider` rank cota+latÃªncia+saÃºde; selects
  PrimÃ¡rios removidos do Centro), bloqueio honesto (`testConnection` com
  `details` e aliases `OPENROUTER_API_KEY/GROQ_API_KEY/NVIDEA_API/MISTRAL_api`),
  cofre multi (`vaultService: copymaster_vault_list:v2`, `getVaultKeys/add/remove`,
  `MAX 9` por provider, ex.: 3 OpenRouter de 3 e-mails com limites independentes),
  fallback gira N chaves Ã— M modelos `:free` com `attempt-cap 2 + Retry-After`,
  UI com chips mascarados + `Adicionar/Remover/Testar` por chave e badge `N chaves`;
  aliases harmonizados em `vite/api/aiClient/router/keyPool/keyHealth`;
  Ã¢ncoras recalibradas (strict :625, timeouts :644, `testConnection` :763,
  `vaultService:migrateLegacyKeys` :211, `keyPool:isRetriableError` :134,
  `SettingsCenter:handleSave` :135).
- Check-up completo em 2026-09-30: 3 serviÃ§os `copy/` Ã³rfÃ£os corrigidos
  (`copyTunerClient.ts`, `writingTools.ts`, `dtcpillInsights.ts`) â€” faltavam
  `await` no `callAI`, `prompt`/`systemInstruction` inexistentes em 3 funÃ§Ãµes e
  o retorno nunca era convertido do `callAI` p/ o tipo declarado; agora parseiam
  JSON tolerante (cerca de ` ``` `), surfaceiam `error` (`DtcpillResponse.error?`
  + `notes?` em `integrateDtcpillWithCopy`) e `writingTools` ganhou
  `WritingVariantsResponse` (antes o `analysis` de variantes nÃ£o batia com
  `WritingToolsMCPResponse`). `dist/` reconstruÃ­do **sem segredos** (o anterior
  tinha `sk-` em 3 chunks â€” nunca distribua build local feito com `.env` real;
  valide com `npm run security:bundle`). `payload-audit` canÃ¡rio de `personas`
  atualizado p/ os rÃ³tulos EN do template reescrito (`main pain points`,
  `extra info` â€” `form.pain`/`form.additionalInfo` seguem interpolados) e
  `army-controls` settings apontando p/ a rotaÃ§Ã£o `:free` (V24 auto-seleÃ§Ã£o).
  Ã‚ncoras `aiClient` recalibradas (`callAI` :287, strict :649, timeouts :668,
  `testConnection` :787, GOLDEN :27, VISUAL :270).
- Auditoria completa + restauraÃ§Ã£o em 2026-09-30 (3 subagentes: seguranÃ§a,
  code-review, varredura de cÃ³digo morto/drift). Contratos novos:
  **P0 cofre** â€” `aiClient` destructurava o *retorno* de `getVaultKey` (string)
  em vez do mÃ³dulo â†’ `undefined` + `catch` engolindo â†’ **toda chave sÃ³-do-cofre
  era inacessÃ­vel** (pior em prod, onde `/api/env` Ã© 405) e a migraÃ§Ã£o legada
  apagava o plaintext nessa leitura falhada; tambÃ©m `provider`â†’`tryProvider`
  na leitura do loop (ver Â§2 "Ordem de chave").
  `isRetriableError` passou a incluir `status >= 500` (502/503 nÃ£o aborta a
  cadeia â€” Â§9); `getFallbackChain` prefixa `start` quando fora do ranking
  (antes `idx <= 0` descartava o provider pedido â†’ `testConnection` testava
  OUTRO provedor); Anthropic ganhou `max_tokens` default 4096 (`/v1/messages`
  exige o campo â†’ 400 permanente antes); primÃ¡rio gemini com erro agora cai
  na cadeia (gemini vai p/ o FIM, erro entra no rastro) em vez de
  `return {error}`; `SettingsCenter` ganhou `sanitizeDetails` (details nunca
  cru/JSON na UI â€” Â§8) e o resumo do Salvar conta falha de `.env` (Â§8);
  `api/scrape.ts`: redirect `manual` + revalidaÃ§Ã£o por hop, IPv6-mapped
  normalizado, porta sÃ³ 80/443, sem CORS `*`; `api/env.ts` e o plugin dev:
  sem CORS `*`, CRLF recusado, mask sÃ³-prefixo; `IdeaSession` valida
  `href` http(s) no sink (anti `javascript:` escrito pelo modelo).
  `App.tsx` layout Ãºnico: fim do `return <WelcomeScreen/>` na home (desmontava
  a Ã¡rvore e perdia estado â€” ver Â§2 "Layout ÃšNICO"); `QuotaErrorModal`
  agora alcanÃ§Ã¡vel na home. `e2e/basic-flow.spec.ts` corrigido (contava abas
  na home = 0 tabs; seletor `[role=tabpanel][aria-hidden=false]` nÃ£o existe).
  Gate: **74/74 specs determinÃ­sticas** (0 quota) + `doc:check` verde.
  Ã‚ncoras recalibradas (`strict` :671, `timeouts` :693, `testConnection` :812,
  `SettingsCenter` `/api/env` :107 e `handleSave` :152 â€” espelhadas em
  `scripts/check-anchors.py`). ALERTA H1 (chaves do dashboard da Vercel no
  bundle) documentado em Â§9; M1 (mestre do cofre constante) = limitaÃ§Ã£o
  honesta: cofre Ã© cripto-local contra vazamento, nÃ£o contra XSS.
- Proxy `/api/ai` (H1 FECHADO) em 2026-09-30: `vite.config.ts` ganha
  `embedSecrets = command === 'serve' || ALLOW_BUNDLE_SECRETS` (em build todo
  segredo vira `""`/`[]`; guard de arquivo `.env` mantido como defesa em
  profundidade) + rota dev `/api/ai` no plugin (`ssrLoadModule`); `api/ai.ts`
  (POST-only 405, Origin==Host 403, 60/min/IP 429, 6MB 413, allowlist host-exato
  anti-SSRF, gemini sÃ³ v1beta, `NEVER_PROXY` 400, pool `base+_2.._9` de
  `process.env`+`.env` â†’ 503 PT-BR, strip de auth do cliente, retry 401/429 Ã—3,
  `redirect:'error'`, 290s â†’ 504/502, `maxDuration=300`, nunca loga chave);
  `services/serverKeyService.ts` (sentinel `__copymaster_proxy__`, gate
  PROD/flag `copymaster_server_keys`, mapa GET `/api/env` com cache 60s/10s e
  filtro `NOT_PROXYABLE`); `aiClient.ts` (`doFetch`, ordem de chave
  tempApiKeyâ†’sentinelâ†’envâ†’cofreâ†’legado, `ensureServerKeys()`+`invalidateRankCache()`
  antes do rank, gemini primÃ¡rio/loop via REST v1beta nÃ£o-streaming quando
  sentinel, ambos os `fetch(endpointUrl)` viram `doFetch`);
  `routerService.hasEnvKey` conta o mapa do servidor (senÃ£o a cadeia de
  fallback de produÃ§Ã£o encolheria); `api/env.ts` exporta `ENV_KEY_MAP`.
  Spec nova `e2e/server-proxy.spec.ts` (9 testes, 0 quota): contrato cru
  405/403/400/SSRF/503 sem upstream, seam prod ON (flag â†’ geraÃ§Ã£o inteira por
  `/api/ai`, payload sem header de auth, `envHits>0`, `directHits=0`) e seam
  dev OFF (`/api/env` mentindo â†’ chamada direta ao host do provider,
  `aiHits=0`, `envHits=0`). Gate: `tsc` 0, `doc:check` 29 Ã¢ncoras + 3
  invariantes, suÃ­te determinÃ­stica **83/83** (17 specs, `--workers=1`), build
  de canÃ¡rio sem `sk-canary*/gsk_canary*` no `dist/` + `security:bundle` limpo
  + guard `BLOQUEADO` (exit 1) com `.env` restaurado. Ã‚ncoras `aiClient`
  recalibradas (`callAI` :288, pool+fallback :503, strict :809, timeouts :831,
  `testConnection` :948, GOLDEN :28, VISUAL :271). Â§0/Â§1/Â§2/Â§6/Â§7/Â§12/Â§13
  atualizados no mesmo commit (contrato docâ†”cÃ³digo).
- Higiene de publicaÃ§Ã£o (GitHub) em 2026-09-30: `metadata.json` (esqueleto de
  exportaÃ§Ã£o do Google AI Studio, nÃ£o referenciado pelo app) + 18 arquivos de
  log/scripts avulsos da raiz apagados (inclui `App.tsx` da raiz obsoleto,
  `check_env.js`, `test_*keys.js`, `mcp_analysis.js`, `run-verification.ps1`,
  `trace-*.txt`/`out*.txt` e o arquivo `null`); PDFs de auditoria movidos para
  `.notebook/`; `.gitignore` sÃ³ ganhou `*.timestamp-*.mjs` (as regras de
  diretÃ³rios locais de trabalho ficam em `.git/info/exclude`, que nÃ£o Ã©
  versionado); README sem a seÃ§Ã£o de skills de agente e com as notas
  de Stack/SeguranÃ§a atualizadas (proxy `/api/ai` jÃ¡ implementado); frase do
  header deste arquivo neutralizada (sem nomear modelos de cÃ³digo).
- Forense local upgrade (MIT, `Jakeschincariol/linkedin-agent-skill`) em
  2026-10-01: lÃ©xico novo `data/slopPT.ts` (~62 entradas find/replace com
  auditoria de invariÃ¢ncia PT + 7 estruturas regex de engajamento) +
  `services/modules/tools/textForensics.ts` **novo e puro** (`quickLocalScan`
  com contagens reais + dedup por Ã­ndice literalÃ—estrutura, `burstinessOf`,
  `localEstimate`, `autoCleanText`, `stripInvisibleChars` â€” testÃ¡vel direto
  no Node sem browser); `aiDetection.ts` ganha `mode: 'llm'|'local'` + fallback
  local honesto (perito morto â†’ estimativa com caveat, **nunca bloqueia** Â§8) +
  EVIDÃŠNCIA LOCAL MEDIDA no prompt do perito + cirurgia humana com
  **PRIORIDADE #1 = maior count**; toolbar: passo 0 `autoCleanText` (sÃ³
  entradas `safe`, tipografia PT intacta), aviso `mode:'local'`, selo
  "estimativa local", `PrÃ©-limpeza: N termo(s)`. Gate 70 **inalterado** (sobre
  o score LLM ou fallback local). Bugs do loop: `\b` em JS Ã© ASCII-only â†’
  lookarounds `(?<![\p{L}])`/`(?![\p{L}])` na estrutura `dualidade_nao_e`
  (nunca use `\bÃ©\b` com acento); `pergunta_retorica` com `/i`. Spec nova
  `e2e/humanizer-local.spec.ts` (8 testes: 6 puros Node + 2 browser mock,
  0 quota â€” calibraÃ§Ã£o MAQUINA â‰¥70 Ã— HUMANO <40 verificada em loop 5Ã—).
  Gate: `tsc` 0, `doc:check` **31 Ã¢ncoras** (2 novas: `textForensics`
  `quickLocalScan` :105 / `localEstimate` :226) + 3 invariantes, suÃ­te
  determinÃ­stica **91/91** (18 specs, `--workers=1`, 12,7min), build canÃ¡rio
  (`.env` movido + `try/finally`) limpo + `security:bundle` OK + `.env`
  restaurado. Â§5/Â§6/Â§9 + `check-anchors.py` atualizados no mesmo commit.
- Ãudio/TTS overhaul (sessÃ£o 23) em 2026-10-01: novo `data/tts.ts` com
  `TTS_PLATFORMS` (9 provedores â€” ElevenLabs, Google Cloud TTS, Gemini TTS,
  Amazon Polly, Azure Speech, OpenAI TTS, Murf, PlayHT, Fish Audio â€” cada um
  com `brief` particular, `durationNote`, modelos reais e banco de vozes
  **exclusivamente PT-BR** com ids usÃ¡veis `voice_id`/cÃ³digo, pesquisa nas
  fontes oficiais de cada plataforma) + seletor de **duraÃ§Ã£o 10â€“120s step 5**
  que injeta `duration_seconds`/`target_words` no JSON de configuraÃ§Ã£o e
  trava o roteiro em `round(seg Ã— 2,6)` palavras (Â±10%, 156 ppm PT-BR);
  serviÃ§o (`audio.ts`) reescrito (clampa duraÃ§Ã£o, injeta `brief` +
  `configTemplate` preenchida, `voice==='auto'` â†’ lista de candidatas na Nota),
  UI com 4 selects (provedor/voz/modelo/duraÃ§Ã£o) filtrados por plataforma e
  modelo (trocar provedor zera voz/modelo p/ `auto`) + hint de palavras, e a
  aba Ãudio agora exibe o COMANDO **completo** (antes o split em
  `CONFIG_END` escondia justamente a config com a duraÃ§Ã£o). Arrays antigos
  `ELEVENLABS_VOICES/MODELS`/`GOOGLE_TTS_VOICES` removidos do `data/creative.ts`
  (`GOOGLE_TTS_VOICES` eram vozes Gemini erradamente rotuladas de Google Cloud).
  Spec nova `e2e/media-audio.spec.ts` (6 testes, 0 quota). Gate: `tsc` 0,
  `doc:check` 31 Ã¢ncoras + 3 invariantes, suÃ­te determinÃ­stica **97/97**
  (19 specs, `--workers=1`, 11,6min), build canÃ¡rio limpo + `security:bundle`
  OK. Â§3/Â§4/Â§6/Â§7 + este Â§14 atualizados no mesmo commit.
- Auditoria completa prÃ©-commit em 2026-10-02 (4 canais: dissecÃ£o das 17
  sessÃµes novas, code-review das prÃ©-existentes, seguranÃ§a H1, suÃ­te Playwright
  56/56 em 9 specs). Contratos novos/corrigidos:
  **parser multi-se§Ã£o** â€" `utils/stripCopyFormat.splitNotaBlock` (nota apÃ³s o
  Ãºltimo `|||NOTA_DIVIDER|||`; todas as seÃ§Ãµes ficam no entregÃ¡vel; EMAIL/LAUNCH
  viram rÃ©gua visÃ­vel) adotado por `BridgeStudio` + os 5 estÃºdios Marketing
  AvanÃ§ado; `NOTA_DIVIDER` intermediÃ¡rio colapsado em 17 bridge + seoAudit/
  contentBrief/competitor (antes o split em `parts[1]` descartava seÃ§Ãµes 3+);
  `keywords` passou a emitir `|||NOTA_DIVIDER|||` + Nota (contrato Â§4.30);
  `landingPage` interpola `ESTILO DE PÃ�GINA` (seletor lpStyles nunca chega ao
  prompt); `payload-audit.spec` nÃ£o sonda selects de persona (persona injeta
  ROLE/GOAL, nÃ£o o id). **Auditoria V24 â†' V46**: `seoAudit, keywords,
  contentBrief, competitor, outreach` entraram no harness (46 mÃ³dulos, forÃ£ do
  harness sÃ³ media/inspiration/adultAnimation/stress); `StressDiagnostic` ganhou
  `modules`/`categories`/contagens/`V{n}` **dinÃ¢micos** via `AUDIT_MODULE_IDS` +
  `AUDIT_CATEGORIES` exportados (antes: lista hardcoded de 24 mÃ³dulos â€" os 22
  novos nunca rodavam e 2 categorias nÃ£o renderizavam no dashboard). Â§0/Â§2/Â§4/Â§6/Â§7
  + `check-anchors.py` recalibrados (31 Ã¢ncoras, 46 mÃ³dulos; `diagnostic`
  `AuditMode` :72, `MARK` :172, `AUDIT_MODULE_IDS` :672, `runStressTestService`
  :677); `verify-keys.report.json` com mask sÃ³-prefixo (mesma regra do `/api/env`).
  **Code-review das prÃ©-existentes**: dead branch JSON do `VSLStudio` removido
  (inalcanÃ§avel: `vsl.ts` sÃ³ emite JSON com useCrewAI=true, e nesse caso a UI chama
  `runCrewWorkflow`); `splitNotaBlock` adotado tambÃ©m em `ReelsSuite`,
  `TikTokSuite`, `CopyGenerator`, `LandingPageStudio`, `PersonaManager`,
  `YouTubeSuite`, `RefinementToolbar` (cleanAIOutput usa o Ãºltimo NOTA_DIVIDER) e
  `strategy/personas.ts` (antes 8 pontos com `split(...)[1]` perdiam seÃ§Ãµes 3+);
  helper tolera `NOTA DO ESPECIALISTA` (LP) e rÃ³tulo com Markdown (sem resÃ­duo
  `****`); `textForensics` sem entradas duplicadas em WEAK/STRONG_VERBS.
- Guias F1 detalhados (todas as 50 sessões) em 2026-10-02: schema `SessionGuide`
  em `data/guides.ts` (registry `registerGuide`/`getGuide`, re-exportes
  `export type` em `constants.ts`) + conteúdo em `data/guides/*.ts` (6 arquivos:
  `strategy` 10, `video` 10, `visual` 8, `seo` 5, `sales` 8, `growth` 9 — 50
  guias PT-BR com o que é/resultado/inputs/subsessões explicados, fluxo passo a
  passo, dicas, erros comuns, integrações, limitações, bloqueios, exemplos e
  FAQ; subsessões cobertas: TikTok 4 modos, YouTube 3 tipos, Media 4 abas,
  Notebook 8 objetivos, Ideas abas+escopos, Copy briefingTypes, Persona
  manual/auto/retrato, PRD perguntas+siteDNA, bridges via `config.fields`).
  `SectionHelp` virou modal acordeão (`max-w-4xl`, "Expandir/Recolher tudo",
  TTS, F1/Esc com registro global de instância única — resolve o keep-alive
  multi-painel; `collapseAll` seta `false`, não `{}`); `sessionId` em
  `ToolLayout`, `BridgeConfig` (incl. `aeprep`) e `StressDiagnostic`
  (`stress`); wire 50/50 conferido (diff vazio nos dois sentidos). Correções do
  loop: `IconMap` renderizado como nó (`{IconEl}`, não `<Icon/>`), union
  `outputKind: 'text'|'image_prompt'|'mixed'` (guide) e badge do guia
  `'text'|'image'|'dynamic'`, `constants.ts` `export type` (isolatedModules).
  Gate: `tsc` 0, `doc:check` 31 âncoras + 3 invariantes, build limpo (canário
  `.env` movido + `security:bundle` OK), smoke+qa-core 8/8, spec nova
  `e2e/guide-modal.spec.ts` (4 testes, 0 quota).
- Legibilidade do guia F1 + reparo de drift das specs live em 2026-10-02:
  **modal do guia saiu em CAIXA ALTA bold ilegível** — o `SectionHelp` era
  renderizado dentro dos `<h2>` das sessões (`uppercase font-black`) e
  `text-transform`/`font-weight` herdam pela árvore DOM até em modal `fixed`;
  classes `prose` não faziam nada (plugin `@tailwindcss/typography` ausente).
  Fix: modal via **`createPortal(..., document.body)`** (quebra herança),
  tipografia explícita (`text-[15px] leading-[1.75]`) e guard
  `.guide-help-portal`/`.guide-help-content` no `index.css`.
  **Specs live reparadas** (drift pré-existente, sem relação com o fix acima):
  `user-full`/`verification-cycle`/`full-verification` usavam
  `[role="tabpanel"][aria-hidden="false"]` (nunca casa) e `full-verification`
  exigia igualdade exata rótulo===id + typo `targetBotão` (ReferenceError);
  `general-user` navegava por índice obsoleto (PRD em 2026-09-27 deslocou tudo
  em +1 — email abria o PRD e o `mode:'serial'` pulava 6 testes) — tudo
  migrado para `e2e/helpers/sessionTabs.ts`; `user-full` ganhou
  `test.setTimeout(240s)` (50 tabs), limiar 50 chars (Personas vazio = 86) e
  assert novo do Settings ("Modelos Gratuitos OpenRouter"). Validação:
  suíte completa 119/132 com todas as determinísticas verdes (7 falhas só
  live) + `camada 1` (50 rótulos) e `user-full navega` aprovados.
  **Ambiente**: `mx-live` falha com alerta `Cloudflare: informe seu Account
  ID` — `.env` tem `CLOUDFLARE_API_KEY` sem `CLOUDFLARE_ACCOUNT_ID` e o
  auto-selecionador prioriza o provider (preencher o ID ou tirar a chave).
- CLOUDFLARE_ACCOUNT_ID gravado no `.env` pelo site em 2026-10-02 (fecha o
  achado do item anterior: `mx-live` morria no alerta "informe seu Account
  ID"): o Centro de Comando passou a persistir o valor do card Cloudflare — no
  **blur** do campo (e no `Salvar`, quando há valor) faz `POST /api/env`
  `{provider:'cloudflare_account_id'}` → linha `CLOUDFLARE_ACCOUNT_ID=` no
  `.env` (dev), valor vazio remove. `vite.config.ts` ganhou `EXTRA_ENV_VARS`
  (fora do `ENV_KEY_MAP` — o GET/relatório de chaves não mudou), validação
  `^[A-Za-z0-9-]{8,64}$` (bloqueia URL/texto colado; CRLF já bloqueado) e
  **escrita idempotente** (`out !== content` antes do `writeFileSync` —
  conteúdo igual não reescreve → sem restart do Vite). Bug de simetria
  corrigido no round-trip adicionar→remover: o `split('\n')` de arquivo que
  termina em `\n` deixa um `''` fantasma no fim e o `push` da nova linha o
  transformava em linha em branco → **`+1 \n` por rodada** (apareceu no teste
  live: hash do `.env` não voltava ao original; agora o round-trip é
  byte-idêntico — anexa via `splice` antes do fantasma). `define` embute
  `process.env.CLOUDFLARE_ACCOUNT_ID` (não-segredo, entra na allowlist do
  blanking; guard `SECRET_FILE_KEY_RE` e `security:bundle` não o flagram) e o
  `aiClient` resolve `{account_id}` como localStorage → `process.env` (fallback
  `.env`); feedback no campo ("✓ gravado no .env") sobrevive ao full-reload do
  Vite via `sessionStorage` one-shot; em produção o POST responde 405 →
  instrução do dashboard. Validação: `tsc` 0, `doc:check` (âncoras
  recalibradas: aiClient strict :811 / timeouts :833 / testConnection :950 +
  SettingsCenter :109/:154 — espelhadas em `check-anchors.py`), specs
  smoke+qa-core+server-proxy **17/17**, round-trip live por curl (400
  inválido → gravação → idempotência sem restart → remoção → `.env`
  byte-idêntico ao hash `357EF07F…`).
- Sessão 51 + grupo Engajamento em 2026-10-02 (pesquisa de engajamento/autoridade:
  fórmula ouro "ponto específico + valor novo + pergunta aberta", Buffer ~2M
  posts — responder comentário sobe engajamento Threads +42% / LinkedIn +30% /
  Instagram +21%; janelas X=minutos, LinkedIn=1ª hora, YouTube=dias):
  **`social/commentResponder.ts`** (novo divisor `|||COMMENT_DIVIDER|||` — 1-3
  variações, 1 variação emite só NOTA; guard de fonte vazia Item 18; normas
  por rede + 8 objetivos de autoridade embutidos no prompt) +
  **`CommentResponder.tsx`** (modos `post`/`comment`, fonte texto/imagem/PDF via
  `analyzeImageContextService`/`analyzePdfContextService` com corte da Nota,
  5 seletores, abas por variação, `splitNotaBlock` + `splitCopyVariants`,
  badge T, guia F1 `sessionId="commentResponder"`). Registro: novo grupo
  **Engajamento** na sidebar (grupo 7 → 10 totais) + card em
  `WelcomeScreen.toolGroups` + `nav_commentResponder` (en/pt) + guia em
  `data/guides/engagement.ts` (7º arquivo). Contratos de contagem viraram
  **51 sessões / 47 módulos / 14 divisores + NOTA**: `check-anchors.py`
  (invariantes 51 NavItems + `commentResponder` crítico, 47 módulos, título §4
  "As 51 sessões", checagem nova de COMMENT_DIVIDER na tabela do §2; âncoras
  diagnostic `AuditMode` :73 / `MARK` :173 / `AUDIT_MODULE_IDS` :689 /
  `runStressTestService` :694) e AGENTS.md §0/§1/§2/§4/§6/§7/§13 recalibrados
  (`App.tsx:12-66` 55 lazy, mapa 53 entradas, sidebar `:360-463` 10 grupos).
  Auditoria V47 (47 módulos — `commentResponder` no harness com asserts
  COMMENT_DIVIDER+NOTA exatos e marcador ZAFRA-42 vindo da fonte).
  Specs: `sessionTabs.TAB_LABELS` + `general-user.TABS` + `payload-audit`
  (29 sessões) ganharam `commentResponder`.
- Para vigiar: contagem 51 no tÃ­tulo do Â§4, tabela de divisores completa
  (14 + NOTA), `AUDIT_MODULE_IDS.length === 47`.


