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
CID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_gallery_clients WHERE gallery_id=$GID AND enabled IS DISTINCT FROM false ORDER BY id ASC LIMIT 1;" | tr -d '[:space:]')
echo "gid=$GID cid=$CID"
curl -sS -D - -o /tmp/al.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/clients/${CID}/access-link" -H "$AUTH" -H 'Content-Type: application/json' -d '{}' | tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5
python3 -c "import json;o=json.load(open('/tmp/al.json')); assert o.get('success') and o.get('token') and 'kingSelection' in o.get('url',''); print('url',o['url'][:80])"
curl -sS -D - -o /tmp/rp.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/clients/${CID}/reset-password" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"senha":"SmokePass99"}' | tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5
python3 -c "import json;o=json.load(open('/tmp/rp.json')); assert o.get('success') and o.get('client_password')=='SmokePass99'; print('reset ok')"
echo DONE
