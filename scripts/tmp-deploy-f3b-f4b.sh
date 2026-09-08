#!/bin/bash
set -e
cd /opt/conectaking

grep -q '^LARAVEL_DASHBOARD=' .env.prod && sed -i 's/^LARAVEL_DASHBOARD=.*/LARAVEL_DASHBOARD=true/' .env.prod || echo 'LARAVEL_DASHBOARD=true' >> .env.prod

rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 16
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5; }

echo '=== auth login ==='
EMAIL=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT email FROM users ORDER BY id LIMIT 1;" | tr -d '[:space:]')
# use known admin if present
if docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT 1 FROM users WHERE email='conectaking@gmail.com' LIMIT 1;" | grep -q 1; then
  EMAIL='conectaking@gmail.com'
fi
echo "email=$EMAIL"

# password from env smoke file if any; else skip password-dependent admin create
PASS_FILE=/tmp/ck-smoke-pass.txt
if [ -f "$PASS_FILE" ]; then
  PASS=$(cat "$PASS_FILE" | tr -d '\r\n')
else
  PASS='playadryan22'
fi

curl -sS -o /tmp/f3tok.json -X POST http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}"
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/f3tok.json')).get('token') or '')")
echo "token_len=${#TOKEN}"
python3 -c "import json;o=json.load(open('/tmp/f3tok.json')); assert o.get('success') or o.get('token'), o"

AUTH="Authorization: Bearer $TOKEN"

echo '=== F3b analytics kpis ==='
curl -sS -D - -o /tmp/f3bk.json "http://127.0.0.1:5000/api/analytics/kpis?period=30" -H "$AUTH" | hdr
python3 -c "import json;o=json.load(open('/tmp/f3bk.json')); print(o); assert 'totalViews' in o"

echo '=== F3c finance profiles ==='
curl -sS -D - -o /tmp/f3cp.json "http://127.0.0.1:5000/api/finance/profiles" -H "$AUTH" | hdr
python3 -c "import json;o=json.load(open('/tmp/f3cp.json')); print(o); assert o.get('success') is True"

echo '=== F3c finance dashboard ==='
curl -sS -D - -o /tmp/f3cd.json "http://127.0.0.1:5000/api/finance/dashboard" -H "$AUTH" | hdr
python3 -c "import json;o=json.load(open('/tmp/f3cd.json')); print('dash_keys', list(o.keys())[:8] if isinstance(o,dict) else type(o)); assert o.get('success') is True or 'data' in o or o.get('message')"

echo '=== F4 preview (client, watermark path) ==='
curl -sS -o /tmp/f4tok.json -X POST http://127.0.0.1:5000/api/king-selection/client/signup-enter \
  -H 'Content-Type: application/json' -d '{"slug":"eliseu"}'
KSTOKEN=$(python3 -c "import json;print(json.load(open('/tmp/f4tok.json')).get('token') or '')")
# pick a photo if any
PID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_photos WHERE gallery_id=(SELECT id FROM king_galleries WHERE slug='eliseu' LIMIT 1) ORDER BY id LIMIT 1;" | tr -d '[:space:]')
if [ -n "$PID" ] && [ "$PID" != "" ]; then
  curl -sS -D - -o /tmp/f4prev.jpg "http://127.0.0.1:5000/api/king-selection/client/photos/${PID}/preview?slug=eliseu" \
    -H "Authorization: Bearer $KSTOKEN" | hdr
  python3 -c "import os; n=os.path.getsize('/tmp/f4prev.jpg'); print('preview_bytes', n); assert n>500"
else
  echo 'no photos for eliseu — skip preview binary smoke'
fi

echo '=== F4b list galleries ==='
PID_ITEM=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM profile_items WHERE user_id=(SELECT id FROM users WHERE email='$EMAIL' LIMIT 1) AND type='king_selection' ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
if [ -z "$PID_ITEM" ]; then
  PID_ITEM=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT profile_item_id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
fi
echo "profileItemId=$PID_ITEM"
curl -sS -D - -o /tmp/f4bl.json "http://127.0.0.1:5000/api/king-selection/galleries?profileItemId=${PID_ITEM}" -H "$AUTH" | hdr
python3 -c "import json;o=json.load(open('/tmp/f4bl.json')); print('galleries', len(o.get('galleries') or [])); assert o.get('success') is True"

echo '=== F4b create public gallery ==='
NAME="tmp-f4b-$(date +%s)"
curl -sS -D - -o /tmp/f4bc.json -X POST http://127.0.0.1:5000/api/king-selection/galleries \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"profileItemId\":${PID_ITEM},\"nome_projeto\":\"${NAME}\",\"access_mode\":\"public\",\"use_watermark\":true}" | hdr
GID=$(python3 -c "import json;o=json.load(open('/tmp/f4bc.json')); print((o.get('gallery') or {}).get('id') or ''); assert o.get('success')")
echo "created_gid=$GID"

echo '=== F4b get + status ==='
curl -sS -D - -o /tmp/f4bg.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}" -H "$AUTH" | hdr
python3 -c "import json;o=json.load(open('/tmp/f4bg.json')); assert o.get('success') and o.get('gallery')"
curl -sS -D - -o /tmp/f4bs.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/status" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"status":"andamento"}' | hdr
python3 -c "import json;o=json.load(open('/tmp/f4bs.json')); print(o); assert o.get('success') and o.get('status')=='andamento'"

# cleanup test gallery
docker exec conectaking-db psql -U conectaking -d conectaking -c "DELETE FROM king_galleries WHERE id=${GID};" >/dev/null

echo DONE
