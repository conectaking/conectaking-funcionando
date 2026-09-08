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
PASS=${CK_SMOKE_PASS:-playadryan22}
curl -sS -o /tmp/tok.json -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}"
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/tok.json'))['token'])")
AUTH="Authorization: Bearer $TOKEN"
PID_ITEM=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT profile_item_id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
NAME="tmp-f4c-$(date +%s)"
curl -sS -o /tmp/g.json -X POST http://127.0.0.1:5000/api/king-selection/galleries \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"profileItemId\":${PID_ITEM},\"nome_projeto\":\"${NAME}\",\"access_mode\":\"public\"}"
GID=$(python3 -c "import json;print(json.load(open('/tmp/g.json'))['gallery']['id'])")

echo '=== PUT gallery ==='
curl -sS -D - -o /tmp/pu.json -X PUT "http://127.0.0.1:5000/api/king-selection/galleries/${GID}" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"watermark_mode":"tile_dense","mensagem_acesso":"ola"}' | hdr
python3 -c "import json;o=json.load(open('/tmp/pu.json')); assert o.get('success'); print(o['gallery'].get('watermark_mode'), o['gallery'].get('mensagem_acesso'))"

echo '=== folders ==='
curl -sS -D - -o /tmp/fo.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/folders" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Pasta A"}' | hdr
FID=$(python3 -c "import json;o=json.load(open('/tmp/fo.json')); print((o.get('folder') or {}).get('id') or 0); assert o.get('success')")
curl -sS -o /tmp/fl.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/folders" -H "$AUTH"
python3 -c "import json;o=json.load(open('/tmp/fl.json')); assert o.get('success') and len(o.get('folders') or [])>=1"

curl -sS -o /tmp/bat.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/photos/batch" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"images\":[{\"key\":\"galleries/${GID}/x.jpg\",\"name\":\"x.jpg\",\"order\":1}]}"
PID=$(python3 -c "import json;print(json.load(open('/tmp/bat.json'))['photos'][0]['id'])")

echo '=== delete-batch ==='
curl -sS -D - -o /tmp/db.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/photos/delete-batch" \
  -H "$AUTH" -H 'Content-Type: application/json' -d "{\"photo_ids\":[${PID}]}" | hdr
python3 -c "import json;o=json.load(open('/tmp/db.json')); print(o); assert o.get('success') and o.get('deleted')==1"

if [ "$FID" != "0" ]; then
  curl -sS -o /tmp/df.json -X DELETE "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/folders/${FID}" -H "$AUTH"
  python3 -c "import json;assert json.load(open('/tmp/df.json')).get('success')"
fi
curl -sS -X DELETE "http://127.0.0.1:5000/api/king-selection/galleries/${GID}" -H "$AUTH" >/dev/null
echo DONE
