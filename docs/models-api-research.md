# Pesquisa: Modelos com API Gratuita para CopyMaster AI (PT-BR Global)

> Varredura 2026-09-28 — 15+ fontes verificadas via WebFetch ao vivo. Foco: **TODAS gratuitas/free**, Ásia+EUA/Europa, entendem PT-BR, utilizáveis via `callAI()` (`services/core/aiClient.ts`).
> Projeto atual: 32 providers em `providerConfig.ts` + `vite.config.ts:8 ENV_KEY_MAP` + `routerService.ts:20 ENV_PROVIDERS`. Todos OpenAI-compat exceto Gemini SDK.

## 1. Inventário Atual (32) — Lacunas

Já cobertos: 9router, openrouter, nvidia, polinai, groq, grok, mistral, gemini, openai, anthropic, deepseek, meta, cohere, qwen, ernie, moonshot, yi, zhipu/zai, hyperclova, perplexity, huggingface, together, elevenlabs, stability, runway, cerebras, sambanova, chutes, siliconflow, nebius, cloudflare.

**Lacunas gratuitas ainda não exploradas:** OpenRouter `:free` pool (12+ modelos), HF Router como agregador, SiliconFlow `免费` (Kolors), Zhipu `glm-4-flash` free eterno.

## 2. EUA/Europa — Texto Gratuito SEM Cartão (OpenAI-compat, PT-BR nativo)

| Provider | Endpoint | Modelo Free PT-BR | Custo Free | CORS | Doc |
|---|---|---|---|---|---|
| **OpenRouter (agregador)** | `https://openrouter.ai/api/v1/chat/completions` | `qwen/qwen3.8-27b:free`, `google/gemma-4-31b-it:free`, `nvidia/nemotron-3-super-120b-a12b:free`, `cohere/north-mini-code:free` (12 curados) | **100% free, 50 req/dia/modelo, 1000/dia conta** | SIM | https://openrouter.ai/models |
| **Groq** | `https://api.groq.com/openai/v1/chat/completions` | `openai/gpt-oss-120b`, `llama-3.3-70b-versatile` (280 t/s), `qwen/qwen3.8-27b` (450 t/s) | **free permanente 30 RPM/1K RPD/200K TPD** sem cartão | NÃO (proxy) | https://console.groq.com/docs/quickstart |
| **Cerebras** | `https://api.cerebras.ai/v1/chat/completions` | `qwen-3.8-27b` (1850 t/s), `gpt-oss-120b` (3000 t/s) | **1M tokens/dia free** sem cartão, 14k req/dia | NÃO | https://inference-docs.cerebras.ai/introduction |
| **Hugging Face Router** | `https://router.huggingface.co/v1/chat/completions` | `openai/gpt-oss-120b:groq`, `Qwen/Qwen3.8-27B:cerebras`, `deepseek-ai/DeepSeek-V3:fireworks` | **$0.10/mês free, $2 PRO** sem cartão, roteia p/ Groq/Cerebras/Fireworks com fallback | SIM (token HF) | https://huggingface.co/docs/inference-providers/index |
| Together/Fireworks/DeepInfra | `https://api.together.ai/v1/chat/completions` etc. | `MiniMax-M3`, `llama-3.8-70b`, `qwen2.5-72b` | **$1 crédito trial** sem cartão inicial, depois exige cartão — não permanente | NÃO | https://docs.together.ai/docs/quickstart |

> Todos PT-BR excelente: Qwen3/Gemma4/Llama3.3/GPT-OSS multilíngues com Português no top-10.

## 3. Ásia — Texto Gratuito SEM Cartão

| Provider | País | Endpoint | Modelo Free | Custo Free sem Cartão | PT-BR |
|---|---|---|---|---|---|
| **SiliconFlow** ⭐ | CN | `https://api.siliconflow.cn/v1/chat/completions` | `tencent/Hunyuan-MT-7B`, `XingChenAGI/Xing4.0-29B` (**免费 eterno**), `deepseek-ai/DeepSeek-V4-Flash`, `Qwen/Qwen3.5-35B-A3B` via saldo ¥14 free | **Sim eterno p/ 免费** + ¥14 saldo inicial | ⭐⭐⭐⭐ |
| **Zhipu GLM (ZAI)** ⭐ | CN | `https://open.bigmodel.cn/api/paas/v4/chat/completions` | `glm-4-flash` (**FREE eterno, 200 conc. simultâneas**) | **Sim eterno** | ⭐⭐⭐⭐ |
| **DeepSeek** | CN | `https://api.deepseek.com/chat/completions` | `deepseek-chat` (V3.2) | Trial limitado, depois ¥1/M (~R$0,77/M, off-peak -50%) | ⭐⭐⭐⭐⭐ |
| **Alibaba Qwen (DashScope)** | CN | `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` | `qwen-turbo/flash/plus` | **1M tokens free trial** sem cartão (via SiliconFlow evita Alibaba complexo) | ⭐⭐⭐⭐⭐ |
| **Moonshot Kimi** | CN | `https://api.moonshot.cn/v1/chat/completions` | `kimi-k2.6` (256K), `kimi-k3` (1M) | ¥15 trial (~3M tokens), depois pago | ⭐⭐⭐⭐ |
| Baidu ERNIE | CN | `https://qianfan.baidubce.com/v2/chat/completions` | `ernie-3.5/speed` | Trial mas exige celular CN — difícil BR | ⭐⭐⭐ |
| Yi 01.AI / MiniMax | CN | `https://api.lingyiwanwu.com/v1/chat/completions` | `yi-large`, `minimax-m2` | Trial ¥10-20 | ⭐⭐⭐ |

## 4. Imagem / Vídeo / Áudio — Gratuito SEM Cartão

| Provider | Modalidade | Modelo Free | Custo Free sem Cartão | Doc |
|---|---|---|---|---|
| **SiliconFlow Kolors** ⭐ | Imagem | `Kwai-Kolors/Kolors` (`https://api.siliconflow.cn/v1/images/generations`) | **100% free 免费 ilimitado** | https://docs.siliconflow.cn/docs/userguide/capabilities/images |
| **HF Inference** ⭐ | Imagem+Vídeo | `black-forest-labs/FLUX.1-dev/schnell` (imagem), `Wan-AI/Wan2.1-T2V-14B`, `genmo/mochi-1-preview` (vídeo) via `hf-inference/fal-ai` | **$0.10/mês free** (~80 imgs FLUX/mês) | https://huggingface.co/docs/inference-providers/pricing |
| **ElevenLabs** ⭐ | Áudio TTS PT-BR nativo | `eleven_multilingual_v2`, `eleven_flash_v2_5` | **10k créditos/mês (~10min) renovável** | https://elevenlabs.io/pricing |
| Stability AI | Imagem | `sd3.5-large`, `sd3.5-turbo`, `stable-image-ultra` | 25 créditos trial único | https://platform.stability.ai/docs/api-reference |
| Vertex Imagen/Veo | Imagem/Vídeo | `imagen-3.0`, `imagen-4`, `veo-3.1` | $300 trial 90d, depois pago (exige cartão) | https://cloud.google.com/vertex-ai/generative-ai/pricing |
| fal.ai / Replicate | Imagem/Vídeo | `flux-pro`, `wan-2.5`, `kling-2.5` | Pay-per-use, sem free — usar via HF grátis | https://fal.ai/pricing |

## 5. Top-10 Recomendados para Integrar (Gratis + PT-BR + OpenAI-compat)

| # | Provider | Modelo | Uso CopyMaster | Free Permanente? |
|---|---|---|---|---|
| 1 | **SiliconFlow 免费** | `Hunyuan-MT-7B` / `Xing4.0-29B` | Texto fallback primário (Ideas/Copy/Article) | Sim |
| 2 | **Zhipu GLM** | `glm-4-flash` | Texto fallback 2 (200 concorrência) | Sim |
| 3 | **SiliconFlow Kolors** | `Kwai-Kolors/Kolors` | Imagem (Carrossel/Quote/Meme/Logo) | Sim |
| 4 | **Cerebras** | `qwen-3.8-27b` (1850 t/s) | Texto stream rápido (Ideas 40KB) | 1M/dia |
| 5 | **Groq** | `llama-3.3-70b-versatile` / `gpt-oss-120b` | Copy PT-BR mais natural | Sim free tier |
| 6 | **OpenRouter :free pool** | `qwen/qwen3.8-27b:free` + `gemma-4-31b:free` | Hub com rotação `getSelectedPool` 12 modelos | Sim |
| 7 | **HF Router** | `openai/gpt-oss-120b:groq` | Agregador fallback global | $0.10/mês |
| 8 | **HF FLUX** | `FLUX.1-dev` via hf-inference | Imagem alta qualidade + vídeo Wan 2.1 | $0.10/mês |
| 9 | **ElevenLabs** | `eleven_multilingual_v2` (Antônio/Rachel pt-BR) | Áudio TTS Media Prompts | 10k/mês |
| 10 | **DeepSeek via SiliconFlow** | `deepseek-ai/DeepSeek-V4-Flash` | DeepSeek sem cadastro CN | Via saldo SF |

## 6. Roadmap Integração (4 arquivos por provider)

Para cada novo provider **grátis** (ex.: já cobertos, só validar):

1. **`services/providerConfig.ts`** — entry `{name, url, defaultModel, link, description, howTo, corsWarning?}`
2. **`vite.config.ts:8 ENV_KEY_MAP`** + `api/env.ts ENV_KEY_MAP` (mesma chave)
3. **`services/core/aiClient.ts:resolveEnvKey`** + `vite define process.env.*` + `poolLists`
4. **`services/routerService.ts:20 ENV_PROVIDERS`** + `hasEnvKey(p)` case
5. **`vercel.json:32 CSP connect-src`** — adicionar domínio API
6. **`services/modules/visual/platformProfiles.ts`** se for motor visual (exige doc-fonte)
7. Testar: `Testar` no Centro de Comando (`testConnection` → `callAI("Responda apenas OK")`), depois `getFallbackChain` + `trackUsage` + `TokenDashboard`

> Custo bundle: 0KB — providers são strings de URL + `define`, não import JS.

## 7. Código Exemplo (todos OpenAI-compat no `aiClient`)

```ts
// OpenRouter :free (CORS OK, browser direto)
{ provider: 'openrouter', url: 'https://openrouter.ai/api/v1/chat/completions', model: 'qwen/qwen3.8-27b:free' }
// Groq
{ provider: 'groq', url: 'https://api.groq.com/openai/v1/chat/completions', model: 'openai/gpt-oss-120b' }
// Cerebras
{ provider: 'cerebras', url: 'https://api.cerebras.ai/v1/chat/completions', model: 'qwen-3.8-27b' }
// SiliconFlow texto+imagem
{ provider: 'siliconflow', url: 'https://api.siliconflow.cn/v1/chat/completions', model: 'Qwen/Qwen3.5-35B-A3B' }
{ provider: 'siliconflow', url: 'https://api.siliconflow.cn/v1/images/generations', model: 'Kwai-Kolors/Kolors' }
// Zhipu
{ provider: 'zai', url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4-flash' }
// HF Router
{ provider: 'huggingface', url: 'https://router.huggingface.co/v1/chat/completions', model: 'openai/gpt-oss-120b:groq' }
// ElevenLabs já existe como elevenlabs
```

Fontes verificadas: openrouter.ai/api/v1/models, docs.together.ai, console.groq.com, inference-docs.cerebras.ai, api-docs.deepseek.com, docs.siliconflow.cn, docs.bigmodel.cn, help.aliyun.com, platform.moonshot.cn, platform.stability.ai, fal.ai/pricing, replicate.com/pricing, huggingface.co/docs/inference-providers, elevenlabs.io/pricing.

Atualizado: 2026-09-28. Fallback atual já 5/5 verde (`e2e/fallback.spec.ts`).
