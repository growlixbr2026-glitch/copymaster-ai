#!/usr/bin/env python3
"""Falha se dist/ contiver padrões de chave real (evita publicar bundle com .env embutido).

Uso: python3 scripts/check-bundle-secrets.py [dist]
Uso local é seguro com .env real; distribuição/publicação não.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
target = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "dist"
if not target.exists():
    print(f"OK: {target} inexistente (nada para auditar)")
    sys.exit(0)

PATTERNS = {
    "sk-": re.compile(r"sk-[A-Za-z0-9]{8,}"),
    "sk-or-v1-": re.compile(r"sk-or-v1-[A-Za-z0-9]{8,}"),
    "nvapi-": re.compile(r"nvapi-[A-Za-z0-9_\-]{8,}"),
    "gsk_": re.compile(r"gsk_[A-Za-z0-9]{8,}"),
    "mstrl_": re.compile(r"mstrl_[A-Za-z0-9]{8,}"),
    "cohere_": re.compile(r"cohere_[A-Za-z0-9]{8,}"),
}
hits = []
for f in target.rglob("*.js"):
    try:
        text = f.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        continue
    for name, rx in PATTERNS.items():
        if rx.search(text):
            try:
                rel = f.relative_to(ROOT)
            except ValueError:
                rel = f
            hits.append(f"{rel}: padrão {name}")
            break

if hits:
    print("FALHA: possíveis segredos embutidos no bundle:")
    for h in hits:
        print(f" - {h}")
    print("Reconstrua com .env vazio/exemplo antes de distribuir.")
    sys.exit(1)
print(f"OK: nenhum padrão de chave em {target}")
