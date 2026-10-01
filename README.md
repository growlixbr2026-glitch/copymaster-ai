# CopyMaster AI — V7Master2026

Suíte de criação de conteúdo e marketing com IA (SPA client-side). Gere copies de alta conversão, roteiros para YouTube/TikTok/Reels, prompts visuais 10-steps, e estratégias completas — tudo adaptado ao mercado brasileiro.

## Funcionalidades

28 ferramentas em 5 grupos:

- **Estratégia & Core:** Ideias com grounding (tendências + hashtags), Personas (CRUD + geração IA), NotebookLM (curadoria)
- **Vendas & Conversão:** Copy (4 modos briefing + editor sênior), Email (sequências), VSL (teleprompter), Landing Pages (wireframe + vibe-coding), Ads (A/B), SexyCanvas (7 pecados)
- **Vídeo Social:** TikTok, Reels e YouTube Suite (roteiro + SEO + thumbnail)
- **Visual & Design:** Logo (2 conceitos), Carrossel (3–10 lâminas), Magazine Cover, Quote, Lettering, Comic, Adult Animation, Meme, Infográfico, Presentation, Media Prompts
- **Sistema:** Settings (22 provedores), Token Dashboard (custos/latência), Stress Diagnostic (audit V22), Temas (normal/write/color)

## Stack

React 18 + Vite 5 + Tailwind 3 + TypeScript 5 + `@google/genai` + `jspdf` + `lucide-react`. Deploy Vercel com SPA fallback, code-split por vendor e functions serverless sem estado de apoio (proxy de chaves `/api/ai`, pesquisa `/api/research`).

## Comece em 3 passos

1. Instale dependências:
   ```bash
   npm install
   ```
2. Configure a chave Gemini:
   ```bash
   cp .env.example .env.local
   # edite .env.local e defina GEMINI_API_KEY ou API_KEY
   ```
   Ou use sua própria chave via **Settings** (armazenada em `localStorage` por provedor).

3. Rode localmente:
   ```bash
   npm run dev
   # build produção
   npm run build && npm run preview
   ```

## Arquitetura

```
components/App.tsx (lazy 28 tools + Suspense)
├── contexts/SharedContext (persona + activeTab)
├── contexts/ThemeContext (normal/write/color → data-theme)
├── hooks/useTranslation + hooks/useAIGenerator (streaming + quota handling)
├── services/core/aiClient.ts (GOLDEN_SYSTEM_INSTRUCTIONS V20, 22 providers, callAI)
├── services/modules/{copy,visual,social,strategy,creative,tools}/* (28 serviços)
├── data/{copywriting,visuals,social,global,creative}.ts (catálogos PT/EN/ES)
└── components/{CopyGenerator,SexyCanvas,CarouselGenerator,...} (ToolLayout padrão)
```

`aiClient.callAI()` é o único ponto de I/O. `usageService` persiste wallet de tokens em `localStorage`. `personaService` serializa persona ativa em `sharedContext`.

## Segurança

- Chaves BYOK ficam em `localStorage` (cofre AES-GCM `copymaster_vault:v2`) — XSS único exfiltra todas. Mitigação atual: validação allowlist de provider, CSP em `vercel.json`, `sourcemap:false`, `.env` ignorado e **proxy serverless `POST /api/ai`**: o bundle de produção não embute nenhuma chave LLM — o servidor injeta a autenticação a partir das Environment Variables do dashboard (ver `api/ai.ts`).
- Headers em `vercel.json`: `X-Frame-Options DENY`, `nosniff`, `HSTS`, `Referrer-Policy` e `Permissions-Policy` + `Content-Security-Policy` (ajuste `connect-src` ao adicionar novos provedores).

## Deploy

```bash
vercel deploy -y        # preview
vercel deploy --prod -y # produção (apenas quando solicitado)
```

`vercel.json` já contém rewrites SPA e cache imutável para `/assets` e `/fonts`.

## Testes

```bash
# E2E com Playwright (após instalar)
npx playwright install
npx playwright test
```

Exemplos em `e2e/smoke.spec.ts`.

## Estrutura

```
.
├── components/          # 38 componentes (WelcomeScreen, ToolLayout, generators)
├── contexts/            # SharedContext, ThemeContext
├── data/                # catálogos copywriting/visuals/social/global/creative
├── hooks/               # useTranslation, useAIGenerator
├── services/            # core/aiClient + modules/* + persona/usage/pdf
├── utils/               # translations (744 linhas PT/EN), imageUtils
├── fonts/               # Inter woff2
├── vite.config.ts       # define process.env.API_KEY, manualChunks
└── vercel.json
```

## Licença

MIT.
