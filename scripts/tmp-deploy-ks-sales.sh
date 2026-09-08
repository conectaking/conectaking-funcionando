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
PASS=${CK_SMOKE_PASS:-playadryan22}
curl -sS -o /tmp/tok.json -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}"
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/tok.json'))['token'])")
AUTH="Authorization: Bearer $TOKEN"
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
echo "gid=$GID"
curl -sS -D - -o /tmp/sc.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/sales-config" -H "$AUTH" | tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5
python3 -c "import json;o=json.load(open('/tmp/sc.json')); print(o); assert o.get('success') and 'salesConfig' in o"
curl -sS -D - -o /tmp/scl.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/sales/clients" -H "$AUTH" | tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5
python3 -c "import json;o=json.load(open('/tmp/scl.json')); print('clients',len(o.get('clients') or [])); assert o.get('success')"
curl -sS -o /tmp/sp.json -X PUT "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/sales-config" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"pix_enabled":true,"pix_key":"smoke@pix.test"}'
python3 -c "import json;o=json.load(open('/tmp/sp.json')); assert o.get('success') and o['salesConfig'].get('pix_key')=='smoke@pix.test'"
echo DONE
