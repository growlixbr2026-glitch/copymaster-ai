# Segurança — fixes aplicados em 2026-09-25 (uso local, sem breaking)

Veredito para seu cenário (app só em `localhost`, sem `--host`, sem publicar `dist/`): **seguro para continuar usando**. Nada abaixo quebra a aplicação — validado com `tsc`, `build`, `doc:check` e `smoke 3/3`.

## O que foi feito

1. `index.html` — removidos `https://cdn.tailwindcss.com` + config inline e `importmap esm.sh` (React 19 divergente do bundle React 18, sem SRI). Tailwind já é gerado pelo build local (`index.css` + `postcss` + `tailwind.config.js`), então visual não muda.
2. `vercel.json` — CSP sem `esm.sh`/`cdn.tailwindcss.com`; adicionados `object-src 'none'` e `upgrade-insecure-requests`. Mantido `unsafe-inline` (Vite precisa; remover quebraria).
3. `api/pin.ts` — `thumbUrl` (og:image) agora exige `https:` e rejeita host privado (`localhost`, `127/8`, `10/8`, `192.168/16`, `172.16-31/16`, `169.254.169.254`, metadata). Pins legítimos (https pinimg) não são afetados.
4. `vite.config.ts` — comentário de aviso: `define` embute `.env` no bundle. Não mudei o comportamento (remover quebraria `aiClient resolveEnvKey`).
5. `scripts/check-bundle-secrets.py` + `npm run security:bundle` — prova o vazamento: `dist/` gerado com seu `.env` real contém chaves (`sk-…` e `sk-or-v1-…`, prefixos redigidos) em `aiClient-*.js`, `SettingsCenter-*.js`. Para distribuir, rebuild com `.env` vazio/exemplo.
6. `jspdf 2.5.2 → 4.2.1` — zera a crítica (GHSA path-traversal/ReDoS/PDF-JS-injection) e os 12 bypasses de `dompurify` transitiva. `services/pdfService.ts` usa só API básica (`new jsPDF`, `text`, `splitTextToSize`, `save`), estável entre majors. `npm audit`: 6 vulns (1 crítica) → 4 (0 crítica).
7. `package.json` — adicionados `security:bundle` e `security:audit`. `npm update` aplicado (10 pacotes); `gaxios 6.7.1`/`uuid 9.0.1` continuam (fix exige major de `@google/genai` — não feito para não quebrar).

## O que foi deliberadamente NÃO feito (para não quebrar)

- **Vite 5.4.21 → 8.3.1** (cura `esbuild` + `vite` high/moderate): exige `@vitejs/plugin-react` 5, Node 20+ e revalidação de Tailwind 3. Mitigação local suficiente: rode só `npm run dev` em `localhost`, nunca `vite --host` (o CVE esbuild expõe o dev server na rede).
- **Remover `process.env.*` do `define`**: quebraria `aiClient.ts:292-313,395-411`. Alternativa correta seria proxy `/api/ai` server-side — só se um dia publicar.
- **CSP sem `unsafe-inline` / `trusted-types`**: quebraria scripts inline do Vite.

## Como verificar

```bash
npx tsc --noEmit
npm run build
python3 scripts/check-bundle-secrets.py dist  # deve FALHAR com .env real; OK com .env vazio
npm run doc:check
npx playwright test e2e/smoke.spec.ts --project=chromium
```

## Conferência em 2026-09-25 (pós-fixes)

- `npx tsc --noEmit`: limpo.
- `npm run build`: ok (~10s); `dist/` sem `.map` (0 arquivos); CSS Tailwind `index-*.css` 69KB gerado localmente.
- `python3 scripts/check-anchors.py`: `DOC-CHECK OK: 29 ancoras + 3 invariantes`.
- `python3 scripts/check-bundle-secrets.py dist`: FALHA esperada com `.env` real (`aiClient-*`, `SettingsCenter-*`, `TokenDashboard-*` com `sk-`/`sk-or-v1-`) — prova que o guard funciona; uso local ok, distribuição exige rebuild com `.env` vazio.
- `npx playwright test e2e/smoke.spec.ts e2e/qa-core.spec.ts --project=chromium`: **8/8 passou** (welcome, responsivo, 27 sessões sem pageerror, axe zero critical, erro friendly).
- PDF `jspdf 4.2.1`: `new jsPDF + text + splitTextToSize` ok (acentos pt-BR preservados).
- SSRF `api/pin.ts`: guard estendido (IPv4 privados + `0.0.0.0`, `::`/`::1`, `fc00::/7`, `fe80::/10`, metadata) validado contra 15 casos (`SSRF_GUARD_OK`); `i.pinimg.com` e IP público passam.
- `npm audit --omit=dev`: 2 moderate restantes (`uuid` via `gaxios` transitiva de `@google/genai 0.12`) — fix exige major do genai, mantido para não quebrar. Com dev: +`vite`/`esbuild` (mitigação: só `localhost`, nunca `--host`).

## Higiene para uso local

- Nunca rode com `vite --host`; nunca exponha `localhost:5173` na LAN.
- Nunca distribua `dist/` gerado com `.env` real; `.env` segue git-ignorado.
- Cofre (`copymaster_vault:v2`) é obfuscação local (chave derivada de string constante) — protege contra leitura casual, não contra XSS/DevTools. Para seu uso local, o risco real seria uma extensão maliciosa no mesmo perfil do navegador.
