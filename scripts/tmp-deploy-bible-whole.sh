#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .
cp -f /tmp/docker-compose.prod.yml docker-compose.prod.yml 2>/dev/null || true

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 12
hdr() { tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5; }

echo "=== hub ==="
curl -sS -D - -o /tmp/h.html 'http://127.0.0.1:5000/adrianokingg/biblia' | hdr
python3 -c "h=open('/tmp/h.html',encoding='utf-8',errors='replace').read(); print('Bíblia inteira' in h, 'err', 'Server Error' in h)"

echo "=== whole page ==="
curl -sS -D - -o /tmp/w.html 'http://127.0.0.1:5000/adrianokingg/biblia/biblia-inteira' | hdr
python3 -c "h=open('/tmp/w.html',encoding='utf-8',errors='replace').read(); print('ok','Bíblia inteira' in h, 'Reflexão' in h, 'err','Server Error' in h, 'len',len(h))"

echo "=== whole day 1 ==="
curl -sS -D - -o /tmp/w1.html 'http://127.0.0.1:5000/adrianokingg/biblia/biblia-inteira/1' | hdr
python3 -c "h=open('/tmp/w1.html',encoding='utf-8',errors='replace').read(); print('Gênesis' in h or 'Genesis' in h, 'Dia 1' in h, 'err','Server Error' in h)"

echo "=== api sequence ==="
curl -sS -D - -o /tmp/wi.json 'http://127.0.0.1:5000/api/bible/devocional-biblia-inteira?mode=sequence&day=1' | hdr
python3 -c "import json;o=json.load(open('/tmp/wi.json'));d=o.get('data') or {};print('ok',o.get('success'),d.get('bookName'),d.get('chapter'),d.get('verse_ref'),'total',d.get('totalDays'))"

echo "=== api calendar ==="
curl -sS -o /tmp/wc.json 'http://127.0.0.1:5000/api/bible/devocional-biblia-inteira?mode=calendar&month=1&day=1'
python3 -c "import json;o=json.load(open('/tmp/wc.json'));d=o.get('data') or {};print('ok',o.get('success'),d.get('mode'),d.get('bookName'),d.get('chapter'))"

echo DONE
