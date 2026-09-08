#!/bin/bash
set -e
cd /opt/conectaking

grep -q '^LARAVEL_KS=' .env.prod && sed -i 's/^LARAVEL_KS=.*/LARAVEL_KS=true/' .env.prod || echo 'LARAVEL_KS=true' >> .env.prod
if grep -q '^LARAVEL_KS_SLUGS=' .env.prod; then
  sed -i 's/^LARAVEL_KS_SLUGS=.*/LARAVEL_KS_SLUGS=/' .env.prod
else
  echo 'LARAVEL_KS_SLUGS=' >> .env.prod
fi

rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 14
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5; }

echo '=== signup-enter ==='
curl -sS -D - -o /tmp/f2tok.json -X POST http://127.0.0.1:5000/api/king-selection/client/signup-enter \
  -H 'Content-Type: application/json' -d '{"slug":"eliseu"}' | hdr
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/f2tok.json')).get('token') or '')")
echo "token_len=${#TOKEN}"
test -n "$TOKEN"

PID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT p.id FROM king_photos p JOIN king_galleries g ON g.id=p.gallery_id WHERE lower(g.slug)='eliseu' ORDER BY p.id LIMIT 1;" | tr -d '[:space:]')
echo "photo=$PID"
test -n "$PID"

echo '=== select ==='
curl -sS -D - -o /tmp/f2sel.json -X POST http://127.0.0.1:5000/api/king-selection/client/select \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"slug\":\"eliseu\",\"photo_id\":$PID}" | hdr
python3 -c "import json;o=json.load(open('/tmp/f2sel.json'));print(o); assert o.get('success') and o.get('selected') is True"

echo '=== gallery ==='
curl -sS -D - -o /tmp/f2gal.json "http://127.0.0.1:5000/api/king-selection/client/gallery?slug=eliseu" \
  -H "Authorization: Bearer $TOKEN" | hdr
python3 -c "import json;o=json.load(open('/tmp/f2gal.json'));g=o.get('gallery') or {}; ids=o.get('selectedPhotoIds') or []; print('locked',g.get('locked'),'selected',ids,'deferred',g.get('deferredSignupActive')); assert $PID in ids"

echo '=== select toggle off ==='
curl -sS -D - -o /tmp/f2sel2.json -X POST http://127.0.0.1:5000/api/king-selection/client/select \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"slug\":\"eliseu\",\"photo_id\":$PID}" | hdr
python3 -c "import json;o=json.load(open('/tmp/f2sel2.json'));print(o); assert o.get('selected') is False"

echo '=== select-bulk ==='
curl -sS -D - -o /tmp/f2bulk.json -X POST http://127.0.0.1:5000/api/king-selection/client/select-bulk \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"slug\":\"eliseu\",\"mode\":\"select\",\"photo_ids\":[$PID]}" | hdr
python3 -c "import json;o=json.load(open('/tmp/f2bulk.json'));print(o); assert o.get('success')"

echo '=== select-bulk unselect ==='
curl -sS -D - -o /tmp/f2bulk2.json -X POST http://127.0.0.1:5000/api/king-selection/client/select-bulk \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"slug\":\"eliseu\",\"mode\":\"unselect\",\"photo_ids\":[$PID]}" | hdr
python3 -c "import json;o=json.load(open('/tmp/f2bulk2.json'));print(o); assert o.get('success')"

echo '=== finalize missing fields ==='
curl -sS -D - -o /tmp/f2fin.json -X POST http://127.0.0.1:5000/api/king-selection/client/finalize \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"slug":"eliseu"}' | hdr
python3 -c "import json;o=json.load(open('/tmp/f2fin.json'));print(o); assert 'nome' in (o.get('message') or '').lower() or 'email' in (o.get('message') or '').lower()"

echo DONE
