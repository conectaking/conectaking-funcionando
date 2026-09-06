#!/bin/bash
set -e
sed -i 's/\r$//' /tmp/fix2.py
python3 /tmp/fix2.py
python3 <<'PY'
from pathlib import Path
import re
def c(t):
    return len(re.findall(r"Ã§|Ã£|Ã©|Ã³|Ã¡|Ã\xad|Ãµ|Ã¢|Ãª|Ã´|Ã\xba|â€.", t))
n=0; f=0
for root in [Path('/opt/conectaking/public'), Path('/opt/conectaking/public_html')]:
    for p in root.rglob('*'):
        if p.suffix.lower() not in {'.html','.js','.css'}:
            continue
        t=p.read_text(encoding='utf-8', errors='replace')
        x=c(t)
        if x:
            f+=1; n+=x
print('remaining_files', f, 'markers', n)
t=Path('/opt/conectaking/public/admin-devocionais-365.html').read_text(encoding='utf-8')
print('bible_ok', 'Bíblia' in t and 'Ativação' in t and 'AtivaÃ§' not in t)
# sample formPageEdit after
p=Path('/opt/conectaking/public_html/formPageEdit.js')
t=p.read_text(encoding='utf-8', errors='replace')
i=t.find('simult')
print('formPage sample', repr(t[max(0,i-20):i+30]))
PY
date > /opt/conectaking/.deploy-stamp
cd /opt/conectaking
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build api
for i in $(seq 1 15); do curl -sf http://127.0.0.1:5000/health >/dev/null && break; sleep 2; done
curl -sS http://127.0.0.1:5000/admin-devocionais-365.html | python3 -c "import sys;t=sys.stdin.read();print('SERVED', 'Bíblia' in t, 'Ativação' in t, 'mojibake', 'AtivaÃ§' in t)"
