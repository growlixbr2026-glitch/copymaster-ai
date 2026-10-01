# DEPLOY — V7Master2026 (CopyMaster AI)

Checklist pré-produção (QA verificado em 17/09/2026: tsc + build + 8/8 Playwright + axe 28/28).

## 1. Variáveis de ambiente (Vercel → Settings → Environment Variables)

Obrigatórias (sem elas o app mostra erro amigável, mas não gera):

| Var | Uso |
|---|---|
| `LITELLM_API_KEY_OPENROUTER` | Caminho principal validado (único 200 nos probes) |
| `LITELLM_API_KEY_9ROUTER` | Pool local + modelos `:free` custo 0 |
| `LITELLM_MODEL_PRIMARY` | default `openai/gpt-4o-mini` |
| `LITELLM_MODEL_FALLBACK` | default `openai/gpt-4o-mini` |

Opcionais (pool/fallback): `LITELLM_API_KEY_9ROUTER_2.._9`, `LITELLM_API_KEY_OPENROUTER_2.._9`
(ordem: base → `_2` → … → cofre da UI; 401/403-tier/429/404 giram sozinhas),
`GROQ_API`, `NVIDIA_API`, `MISTRAL_API`, `POLINAI_API`, `GEMINI_API_KEY`/`API_KEY`.

> Em produção `POST /api/env` retorna 405 (filesystem read-only) — configure no dashboard.
> `GET /api/env` retorna `{ has, masked, count }` — nunca valores.

## 2. Comandos

```bash
npm install
npx playwright install chromium   # só p/ testes locais
npm run build                     # tsc + vite (exigido limpo)
npx playwright test               # 8 testes (3 smoke + 5 core)
vercel deploy -y                  # preview (obrigatório antes da prod)
vercel deploy --prod -y           # produção (somente após preview verde)
```

## 3. Armadilhas conhecidas (já mitigadas no código)

- Modelo default `openai/gpt-4o-mini` NÃO existe no daemon 9Router local → app faz
  fallback automático p/ OpenRouter; alternativa custo 0: `openrouter/google/gemma-4-26b-a4b-it:free`
  (ou `openrouter/nvidia/nemotron-3.5-lightning:free`, mais lento).
- CSP `vercel.json` cobre 28 hosts de IA — ao adicionar provider novo, adicione o host
  em `connect-src` ou a chamada falha silenciosa em prod.
- `trackUsage` é contagem local (`localStorage`) — não é cobrança real; zera ao limpar o browser.
- Chaves BYOK ficam em `localStorage` (cofre AES-GCM) — XSS exfiltraria; CSP + `nosniff`
  + `DENY` mitigam. Ideal futuro: proxy `POST /api/ai/:provider` server-side.
