#!/usr/bin/env python3
"""Trava doc<->codigo do CopyMaster AI.

Verifica que as ancoras `arquivo:linha` citadas em AGENTS.md (secao 9)
ainda apontam para o simbolo correto, e que os invariantes numericos
(50 sessoes, 46 modulos de auditoria, 13 divisores + NOTA) continuam validos.

Uso:  python3 scripts/check-anchors.py   (ou: npm run doc:check)
Saida 0 = tudo certo. Saida 1 = lista as divergencias para corrigir
(no codigo ou no AGENTS.md, nunca ignorar).
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOL = 3  # tolerancia em linhas (edits vizinhos deslocam o simbolo)

# (arquivo, agulha, linha esperada) — recalibrado em 2026-09-30 (aiClient deslocado +24/+28; auto-seleção + N chaves por provider)
# recalibrado em 2026-10-02 (CLOUDFLARE_ACCOUNT_ID → .env: aiClient +2 / SettingsCenter +2)
ANCHORS = [
    ("services/core/aiClient.ts", "export const callAI", 288),
    ("services/core/aiClient.ts", "STRICT_NO_TOP_LEVEL_SYSTEM", 811),
    ("services/core/aiClient.ts", "isLocal ? 3500 : 600000", 833),
    ("services/core/aiClient.ts", "testConnection", 950),
    ("services/core/aiClient.ts", "GOLDEN_SYSTEM_INSTRUCTIONS", 28),
    ("services/core/aiClient.ts", "VISUAL_MASTER_PROTOCOL", 271),
    ("services/vaultService.ts", "copymaster_vault", 1),
    ("services/vaultService.ts", "setVaultKey", 63),
    ("services/vaultService.ts", "migrateLegacyKeys", 211),
    ("services/keyPoolService.ts", "MAX_POOL_KEYS", 12),
    ("services/keyPoolService.ts", "export async function getApiKeys", 101),
    ("services/keyPoolService.ts", "isRetriableError", 134),
    ("services/friendlyErrors.ts", "toFriendlyError", 6),
    ("utils/stripCopyFormat.ts", "stripCopyMarkdown", 11),
    ("utils/stripCopyFormat.ts", "splitCopyVariants", 55),
    ("utils/stripCopyFormat.ts", "stripVisualPrompt", 69),
    ("utils/stripCopyFormat.ts", "splitOptions", 101),
    ("utils/stripCopyFormat.ts", "splitVisualResult", 120),
    ("services/modules/tools/aiDetection.ts", "HUMANIZE_THRESHOLD", 7),
    ("services/modules/tools/textForensics.ts", "export function quickLocalScan", 105),
    ("services/modules/tools/textForensics.ts", "export function localEstimate", 226),
    ("services/modules/tools/diagnostic.ts", "AuditMode", 72),
    ("services/modules/tools/diagnostic.ts", "MARK =", 172),
    ("services/modules/tools/diagnostic.ts", "AUDIT_MODULE_IDS", 672),
    ("services/modules/tools/diagnostic.ts", "runStressTestService", 677),
    ("components/SettingsCenter.tsx", "/api/env", 109),
    ("components/SettingsCenter.tsx", "handleSave", 154),
    ("hooks/useAIGenerator.ts", "isQuotaError", 12),
    ("components/ToolLayout.tsx", "OutputKindBadge", 10),
    ("components/ToolLayout.tsx", "EngineLink", 24),
    ("components/QuotaErrorModal.tsx", "message", 8),
]

failures = []

for rel, needle, expected in ANCHORS:
    p = ROOT / rel
    if not p.exists():
        failures.append(f"{rel}: ARQUIVO SUMIU (AGENTS.md cita :{expected})")
        continue
    lines = p.read_text(encoding="utf-8", errors="replace").splitlines()
    found = next((i + 1 for i, ln in enumerate(lines) if needle in ln), None)
    if found is None:
        failures.append(f"{rel}: simbolo sumiu: {needle!r} (AGENTS.md cita :{expected})")
    elif abs(found - expected) > TOL:
        failures.append(
            f"{rel}: {needle!r} mudou :{expected} -> :{found} "
            f"(atualize o AGENTS.md ou reverta o deslocamento)"
        )

# Invariante 1: 50 NavItems (sessoes) em components/App.tsx
app = (ROOT / "components/App.tsx").read_text(encoding="utf-8", errors="replace")
navs = re.findall(r"<NavItem id=\"(\w+)\"", app)
if len(navs) != 50:
    failures.append(f"components/App.tsx: {len(navs)} NavItems (esperado 50): {navs}")
if "stress" not in navs or "citation" not in navs or "inspiration" not in navs or "prd" not in navs:
    failures.append("components/App.tsx: faltam NavItems criticos (stress/citation/inspiration/prd)")

# Invariante 2: 46 modulos na auditoria
diag = (ROOT / "services/modules/tools/diagnostic.ts").read_text(encoding="utf-8", errors="replace")
mods = re.findall(r"^    (\w+): \{", diag, re.M)
mods = [m for m in mods if m != "purposeValidation"]
if len(mods) != 46:
    failures.append(f"diagnostic.ts: {len(mods)} modulos (esperado 46)")

# Invariante 3: AGENTS.md declara 28 sessoes e lista CITATION_DIVIDER + PRD_DIVIDER
agents = (ROOT / "AGENTS.md").read_text(encoding="utf-8", errors="replace")
if "## 4. As 50 sessões" not in agents:
    failures.append("AGENTS.md: titulo do §4 nao declara 50 sessoes")
sec2 = agents.split("## 2.")[1].split("## 3.")[0]
if "CITATION_DIVIDER" not in sec2:
    failures.append("AGENTS.md: tabela de divisores do §2 sem CITATION_DIVIDER")
if "PRD_DIVIDER" not in sec2:
    failures.append("AGENTS.md: tabela de divisores do §2 sem PRD_DIVIDER")

if failures:
    print(f"DOC-CHECK FALHOU ({len(failures)} divergencias):")
    for f in failures:
        print("  - " + f)
    sys.exit(1)
print(f"DOC-CHECK OK: {len(ANCHORS)} ancoras + 3 invariantes (50 tabs, 46 modulos, divisores).")
