#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 12
hdr() { tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5; }

echo "=== hub ==="
curl -sS -D - -o /tmp/h.html 'http://127.0.0.1:5000/adrianokingg/biblia' | hdr
python3 - <<'PY'
h=open('/tmp/h.html',encoding='utf-8',errors='replace').read()
print('Salmo', 'Salmo' in h, 'Plano' in h, 'err', 'Server Error' in h, 'len', len(h))
PY

echo "=== salmo page ==="
curl -sS -D - -o /tmp/s.html 'http://127.0.0.1:5000/adrianokingg/biblia/salmo' | hdr
python3 -c "h=open('/tmp/s.html',encoding='utf-8',errors='replace').read(); print('ok', 'Salmo do dia' in h, 'texto-ish', len(h)>800, 'err','Server Error' in h)"

echo "=== plan page ==="
curl -sS -D - -o /tmp/p.html 'http://127.0.0.1:5000/adrianokingg/biblia/plano' | hdr
python3 -c "h=open('/tmp/p.html',encoding='utf-8',errors='replace').read(); print('ok','Plano' in h, 'Abrir' in h or 'Leitura' in h, 'err','Server Error' in h, 'len',len(h))"

echo "=== api salmo ==="
curl -sS -D - -o /tmp/sa.json 'http://127.0.0.1:5000/api/bible/salmo-do-dia' | hdr
python3 -c "import json;o=json.load(open('/tmp/sa.json'));d=o.get('data') or {};print('ok',o.get('success'),d.get('ref'),(d.get('texto') or '')[:50])"

echo "=== api plan day1 ==="
curl -sS -D - -o /tmp/rp.json 'http://127.0.0.1:5000/api/bible/reading-plan/day/1' | hdr
python3 -c "import json;o=json.load(open('/tmp/rp.json'));d=o.get('data') or {};print('ok',o.get('success'),'book',d.get('book_id'),'sum',d.get('summary'),'src',d.get('source'),'dev',bool(d.get('devocional')))"

echo DONE
