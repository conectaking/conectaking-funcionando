#!/bin/bash
set -e
cd /opt/conectaking

rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 14
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5; }

echo '=== SPA page ==='
curl -sS -D - -o /tmp/f2b.html 'http://127.0.0.1:5000/kingSelection/eliseu' | hdr
python3 -c "h=open('/tmp/f2b.html',encoding='utf-8',errors='ignore').read(); print('spa', 'kingSelectionCliente.js' in h, 'laravel_boot', '__KS_LARAVEL_ENGINE' in h, 'len', len(h)); assert 'kingSelectionCliente.js' in h and '__KS_LARAVEL_ENGINE' in h"

echo '=== signup + export ==='
curl -sS -o /tmp/f2btok.json -X POST http://127.0.0.1:5000/api/king-selection/client/signup-enter \
  -H 'Content-Type: application/json' -d '{"slug":"eliseu"}'
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/f2btok.json')).get('token') or '')")
curl -sS -D - -o /tmp/f2bexp.json "http://127.0.0.1:5000/api/king-selection/client/export?slug=eliseu" \
  -H "Authorization: Bearer $TOKEN" | hdr
python3 -c "import json;o=json.load(open('/tmp/f2bexp.json'));print(o); assert o.get('success')"

echo '=== edit-requests list ==='
curl -sS -D - -o /tmp/f2bed.json "http://127.0.0.1:5000/api/king-selection/client/edit-requests?slug=eliseu" \
  -H "Authorization: Bearer $TOKEN" | hdr
python3 -c "import json;o=json.load(open('/tmp/f2bed.json'));print(o); assert o.get('success') is True"

echo DONE
