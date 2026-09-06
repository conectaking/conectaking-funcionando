#!/bin/bash
# Find mojibake in served UI trees on VPS
python3 <<'PY'
from pathlib import Path
import re
pat=re.compile(r'Ã§|Ã£|Ã©|Ã³|Ã¡|Ã­|Ãº|Ãµ|Ã¢|Ãª|Ã´|â€')
roots=[Path('/opt/conectaking/public'), Path('/opt/conectaking/public_html')]
for root in roots:
  print('====', root)
  for p in root.rglob('*'):
    if p.suffix.lower() not in {'.html','.js','.css','.ejs'}: continue
    try: t=p.read_text(encoding='utf-8', errors='replace')
    except: continue
    n=len(pat.findall(t))
    if n:
      print(f'{n:4d} {p}')
PY
