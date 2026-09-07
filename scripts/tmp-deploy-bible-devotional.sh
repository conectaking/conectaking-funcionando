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

echo "=== hub preview ==="
curl -sS -D - -o /tmp/h.html 'http://127.0.0.1:5000/adrianokingg/biblia' | hdr
python3 - <<'PY'
h=open('/tmp/h.html',encoding='utf-8',errors='replace').read()
print('Devocional', 'Devocional' in h, 'devocional' in h.lower())
print('server error', 'Server Error' in h)
print('len', len(h))
PY

echo "=== page today ==="
curl -sS -D - -o /tmp/d.html 'http://127.0.0.1:5000/adrianokingg/biblia/devocional' | hdr
python3 - <<'PY'
h=open('/tmp/d.html',encoding='utf-8',errors='replace').read()
print('dia label', 'Devocional 365' in h)
print('empty?', 'Não há devocional' in h)
print('reflexao?', 'Reflexão' in h or 'reflexao' in h.lower())
print('len', len(h))
PY

echo "=== page day 1 ==="
curl -sS -D - -o /tmp/d1.html 'http://127.0.0.1:5000/adrianokingg/biblia/devocional/1' | hdr
python3 -c "h=open('/tmp/d1.html',encoding='utf-8',errors='replace').read(); print('day1', 'Dia 1' in h, 'len', len(h), 'err', 'Server Error' in h)"

echo "=== api do-dia ==="
curl -sS -D - -o /tmp/dd.json 'http://127.0.0.1:5000/api/bible/devocional-do-dia' | hdr
python3 -c "import json;o=json.load(open('/tmp/dd.json'));d=o.get('data') or {};print('ok',o.get('success'),'day',d.get('day_of_year'),'title',(d.get('titulo') or '')[:50])"

echo "=== api 365 plain ==="
curl -sS -D - -o /tmp/p.json 'http://127.0.0.1:5000/api/bible/devotionals-365/1?plain=1' | hdr
python3 -c "import json;o=json.load(open('/tmp/p.json'));d=o.get('data') or {};print('ok',o.get('success'),'title',(d.get('titulo') or '')[:50],'ref',d.get('versiculo_ref'))"

echo "=== api reading plan ==="
curl -sS -D - -o /tmp/rp.json 'http://127.0.0.1:5000/api/bible/reading-plan/day/1' | hdr
python3 -c "import json;o=json.load(open('/tmp/rp.json'));d=o.get('data') or {};print('ok',o.get('success'),'book',d.get('book_id'),'has_dev',bool(d.get('devocional')))"

echo DONE
