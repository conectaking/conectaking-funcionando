#!/usr/bin/env python3
"""Corrige mojibake UTF-8 em public/public_html/views no VPS."""
import re
from pathlib import Path

# Sequências típicas de UTF-8 mal interpretado (dois chars)
MOJI = re.compile(
    r"Ã§|Ã£|Ã©|Ã³|Ã¡|Ã­|Ãº|Ãµ|Ã¢|Ãª|Ã´|Ã |Ã‰|Ã |Â |â€“|â€”|â€™|â€œ|â€|â€¦|Ã‡|Ãƒ|Ã•|Ãš|Ãš|Ãš"
)
# Nota: Ãº no padrão acima usa U+00FA; mojibake real de ú costuma ser Ã + º (U+00BA)
MOJI2 = re.compile(
    "Ã§|Ã£|Ã©|Ã³|Ã¡|Ã­|Ãµ|Ã¢|Ãª|Ã´|"
    "Ã\xa0|"  # Ã + NBSP-ish
    "Ãº|Ã¹|"  # variants
    "Ã\xba|"  # Ã + º (mojibake de ú)
    "â€“|â€”|â€™|â€œ|â€|â€¦|"
    "Ã‡|Ãƒ|Ã•|Ãš|Ã‰|Ã |Â "
)

EXTS = {".html", ".js", ".css", ".ejs"}

def count_moji(text: str) -> int:
    # Conta só sequências de 2+ chars típicas de mojibake (não o 'ú' legítimo sozinho)
    return len(re.findall(
        r"Ã§|Ã£|Ã©|Ã³|Ã¡|Ã\xad|Ãµ|Ã¢|Ãª|Ã´|Ã\xba|Ãº|â€.|Â |Ã‡|Ãƒ|Ã•|Ã‰",
        text,
    ))

def try_fix(text: str):
    before = count_moji(text)
    if before == 0:
        return None
    body = text
    had_bom = body.startswith("\ufeff")
    if had_bom:
        body = body.lstrip("\ufeff")
    try:
        fixed = body.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        # tenta ignorar chars fora de latin-1
        try:
            fixed = body.encode("latin-1", errors="ignore").decode("utf-8", errors="ignore")
        except Exception:
            return None
    after = count_moji(fixed)
    if after < before and fixed.count("\ufffd") <= body.count("\ufffd"):
        return ("\ufeff" + fixed) if had_bom else fixed
    return None

def main():
    roots = [
        Path("/opt/conectaking/public"),
        Path("/opt/conectaking/public_html"),
        Path("/opt/conectaking/views"),
    ]
    changed = []
    still = []
    for root in roots:
        if not root.exists():
            continue
        for p in root.rglob("*"):
            if not p.is_file() or p.suffix.lower() not in EXTS:
                continue
            try:
                text = p.read_text(encoding="utf-8")
            except Exception:
                continue
            fixed = try_fix(text)
            if fixed is None:
                c = count_moji(text)
                if c:
                    still.append((c, str(p)))
                continue
            p.write_text(fixed, encoding="utf-8")
            changed.append((count_moji(text), count_moji(fixed), str(p)))

    print(f"CHANGED {len(changed)}")
    for b, a, p in sorted(changed, key=lambda x: -x[0])[:50]:
        print(f"  {b}->{a} {p}")
    print(f"STILL {len(still)}")
    for c, p in sorted(still, key=lambda x: -x[0])[:30]:
        print(f"  {c} {p}")

if __name__ == "__main__":
    main()
