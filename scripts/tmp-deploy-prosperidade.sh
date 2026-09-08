#!/bin/bash
set -e
cd /opt/conectaking

rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .
cp -f /tmp/docker-compose.prod.yml docker-compose.prod.yml

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 12
hdr() { tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5; }

echo "=== DB published count ==="
docker exec conectaking-db psql -U conectaking -d conectaking -tAc \
  "SELECT COUNT(*) FILTER (WHERE published) AS pub, COUNT(*) AS total FROM bible_prosperidade_ativacoes;"

echo "=== page today ==="
curl -sS -D - -o /tmp/pros.html 'http://127.0.0.1:5000/adrianokingg/biblia/prosperidade' | hdr
python3 -c "h=open('/tmp/pros.html',encoding='utf-8',errors='replace').read(); print('Prosperidade' in h, 'Ativação' in h, 'err','Server Error' in h, 'len',len(h))"

echo "=== api hoje ==="
curl -sS -D - -o /tmp/ph.json 'http://127.0.0.1:5000/api/bible/prosperidade/hoje' | hdr
python3 -c "import json;o=json.load(open('/tmp/ph.json'));d=o.get('data') or {};a=d.get('ativacao') or {};print('ok',o.get('success'), 'n',d.get('activation_number'), 'pub',not d.get('not_published'), 'titulo',(a.get('titulo') or '')[:50])"

echo "=== api list ==="
curl -sS -D - -o /tmp/pl.json 'http://127.0.0.1:5000/api/bible/prosperidade/list' | hdr
python3 -c "import json;o=json.load(open('/tmp/pl.json'));acts=(o.get('data') or {}).get('activations') or [];print('ok',o.get('success'),'n',len(acts),'pub',sum(1 for x in acts if x.get('published')))"

echo "=== mark-read ==="
curl -sS -D - -o /tmp/pm.json -X POST 'http://127.0.0.1:5000/api/bible/prosperidade/mark-read' \
  -H 'Content-Type: application/json' \
  -d '{"visitor_id":"smoke-test-vid","activation_number":1,"slug":"adrianokingg"}' | hdr
python3 -c "import json;o=json.load(open('/tmp/pm.json'));print('ok',o.get('success'),o.get('data'),o.get('message'))"

echo "=== hub link ==="
curl -sS -o /tmp/hub.html 'http://127.0.0.1:5000/adrianokingg/biblia'
python3 -c "h=open('/tmp/hub.html',encoding='utf-8',errors='replace').read(); print('pros-link', '/adrianokingg/biblia/prosperidade' in h)"

echo DONE
