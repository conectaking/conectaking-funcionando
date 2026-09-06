#!/bin/bash
set -e
# good bible admin page from local
cp -f /tmp/admin-devocionais-365.html /opt/conectaking/public/admin-devocionais-365.html
cp -f /tmp/admin-devocionais-365.html /opt/conectaking/public_html/admin-devocionais-365.html
# mass fix
python3 /tmp/fix-mojibake-vps.py
# verify bible page
python3 - <<'PY'
from pathlib import Path
t=Path('/opt/conectaking/public/admin-devocionais-365.html').read_text(encoding='utf-8')
print('Bíblia', 'Bíblia' in t)
print('Ativação', 'Ativação' in t)
print('BÃ­blia', 'BÃ­blia' in t)
print('AtivaÃ§', 'AtivaÃ§' in t)
PY
date > /opt/conectaking/.deploy-stamp
cd /opt/conectaking
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build api
for i in $(seq 1 20); do curl -sf http://127.0.0.1:5000/health >/dev/null && break; sleep 2; done
curl -sS http://127.0.0.1:5000/admin-devocionais-365.html | python3 -c "import sys;t=sys.stdin.read();print('SERVED Bíblia', 'Bíblia' in t); print('SERVED Ativação', 'Ativação' in t); print('SERVED mojibake', 'AtivaÃ§' in t or 'BÃ­blia' in t); i=t.find('<title>'); print(repr(t[i:i+55]))"
# remaining count in public after fix+rebuild source
python3 - <<'PY'
import re
from pathlib import Path
pat=re.compile(r'Ã§|Ã£|Ã©|Ã³|Ã¡|Ã­|Ãº|Ãµ|â€')
n=0; files=0
for root in [Path('/opt/conectaking/public'), Path('/opt/conectaking/public_html')]:
  for p in root.rglob('*'):
    if p.suffix.lower() not in {'.html','.js','.css'}: continue
    t=p.read_text(encoding='utf-8', errors='replace')
    c=len(pat.findall(t))
    if c:
      files+=1; n+=c
print('remaining_files', files, 'markers', n)
PY
