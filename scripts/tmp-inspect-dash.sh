#!/bin/bash
curl -sS -D - -o /tmp/dash.html http://127.0.0.1:5000/dashboard.html | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 - <<'PY'
h=open('/tmp/dash.html',encoding='utf-8',errors='ignore').read()
print('len', len(h))
for s in ['dashboard.js','dashboard-cartao','dashboard-sortable','dashboard-listeners','items-container','sidebar-overlay','live-preview']:
    print(s, h.count(s))
import re
scripts=re.findall(r"src=[\"']([^\"']+)", h)
print('n_scripts', len(scripts))
for x in scripts:
    if 'dashboard' in x or x.endswith('.js'):
        if 'dashboard' in x or 'global' in x or 'android' in x:
            print(x)
PY
