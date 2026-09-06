#!/usr/bin/env python3
"""Corrige mojibake UTF-8 (texto UTF-8 lido como Latin-1 e gravado de novo)."""
import re
from pathlib import Path

MOJI = re.compile(r"Ã§|Ã£|Ã©|Ã³|Ã¡|Ã­|Ãº|Ãµ|Ã¢|Ãª|Ã´|Ã |â€|Â ")
EXTS = {".html", ".js", ".css", ".ejs", ".json", ".md", ".txt"}

def try_fix(text: str):
    before = len(MOJI.findall(text))
    if before == 0:
        return None
    try:
        fixed = text.encode("latin-1").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return None
    after = len(MOJI.findall(fixed))
    if after < before and "\ufffd" not in fixed:
        return fixed
    return None

def main():
    roots = [Path("/opt/conectaking/public"), Path("/opt/conectaking/public_html"), Path("/opt/conectaking/views")]
    changed = []
    skipped = []
    for root in roots:
        if not root.exists():
            continue
        for p in root.rglob("*"):
            if not p.is_file() or p.suffix.lower() not in EXTS:
                continue
            # skip huge bible book data if any under public
            if "data/bible/books" in str(p).replace("\\", "/"):
                continue
            try:
                raw = p.read_bytes()
                text = raw.decode("utf-8")
            except Exception:
                continue
            fixed = try_fix(text)
            if not fixed:
                if MOJI.search(text):
                    skipped.append((str(p), len(MOJI.findall(text))))
                continue
            # preserve BOM if present
            out = fixed.encode("utf-8")
            if raw.startswith(b"\xef\xbb\xbf"):
                out = b"\xef\xbb\xbf" + out
            p.write_bytes(out)
            changed.append((str(p), len(MOJI.findall(text)), len(MOJI.findall(fixed))))

    print(f"CHANGED {len(changed)}")
    for p, b, a in sorted(changed, key=lambda x: -x[1])[:40]:
        print(f"  {b}->{a} {p}")
    print(f"STILL_BROKEN {len(skipped)}")
    for p, n in sorted(skipped, key=lambda x: -x[1])[:30]:
        print(f"  {n} {p}")

if __name__ == "__main__":
    main()
