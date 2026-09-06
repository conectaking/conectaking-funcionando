#!/bin/bash
python3 <<'PY'
from pathlib import Path
for p in [
 '/opt/conectaking/public/admin-devocionais-365.html',
 '/opt/conectaking/public_html/admin-devocionais-365.html',
]:
  path=Path(p)
  print('==', p, 'exists', path.exists())
  if not path.exists():
    continue
  t=path.read_text(encoding='utf-8', errors='replace')
  print(' Bíblia', 'Bíblia' in t, 'BÃblia', 'BÃblia' in t or 'BÃ­blia' in t)
  print(' Ativação', 'Ativação' in t, 'AtivaÃ§', 'AtivaÃ§' in t)
  i=t.find('Bíblia')
  if i<0: i=t.find('BÃ')
  print(' snip', repr(t[i:i+50]))
PY
echo '--- served ---'
curl -sS http://127.0.0.1:5000/admin-devocionais-365.html | python3 -c "import sys;t=sys.stdin.read();print('Bíblia', 'Bíblia' in t); print('BÃ­blia', 'BÃ­blia' in t); print('AtivaÃ§', 'AtivaÃ§' in t); i=t.find('B'); print(repr(t[t.find('title'):t.find('title')+60]))"
# content-type
curl -sSI http://127.0.0.1:5000/admin-devocionais-365.html | tr -d '\r' | grep -i content-type
