#!/bin/bash
set -e
cd /opt/conectaking

rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 16
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5; }

PASS=${CK_SMOKE_PASS:-playadryan22}
curl -sS -o /tmp/tok.json -X POST http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}"
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/tok.json')).get('token') or '')")
test -n "$TOKEN"
AUTH="Authorization: Bearer $TOKEN"

PID_ITEM=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT profile_item_id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
NAME="tmp-up-$(date +%s)"
curl -sS -o /tmp/g.json -X POST http://127.0.0.1:5000/api/king-selection/galleries \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"profileItemId\":${PID_ITEM},\"nome_projeto\":\"${NAME}\",\"access_mode\":\"public\"}"
GID=$(python3 -c "import json;o=json.load(open('/tmp/g.json')); print(o['gallery']['id']); assert o.get('success')")
echo "gid=$GID"

# 1x1 jpeg
python3 - <<'PY'
import base64
b=base64.b64decode('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z')
open('/tmp/tiny.jpg','wb').write(b)
print(len(b))
PY

echo '=== upload proxy ==='
curl -sS -D - -o /tmp/up.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/uploads/proxy" \
  -H "$AUTH" -F "file=@/tmp/tiny.jpg;type=image/jpeg" -F "original_name=tiny.jpg" -F "order=1" | hdr
python3 -c "import json;o=json.load(open('/tmp/up.json')); print(o); assert o.get('success') and o.get('photo',{}).get('id')"

echo '=== photos batch (fake key register) ==='
curl -sS -D - -o /tmp/bat.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/photos/batch" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"images\":[{\"key\":\"galleries/${GID}/smoke-batch.jpg\",\"name\":\"batch.jpg\",\"order\":2}]}" | hdr
python3 -c "import json;o=json.load(open('/tmp/bat.json')); print(o); assert o.get('success') and len(o.get('photos') or [])==1"

echo '=== get gallery photos ==='
curl -sS -o /tmp/gg.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}" -H "$AUTH"
python3 -c "import json;o=json.load(open('/tmp/gg.json')); n=len((o.get('gallery') or {}).get('photos') or []); print('photos', n); assert n>=2"

curl -sS -o /tmp/del.json -X DELETE "http://127.0.0.1:5000/api/king-selection/galleries/${GID}" -H "$AUTH"
python3 -c "import json;o=json.load(open('/tmp/del.json')); assert o.get('success')"

echo DONE
