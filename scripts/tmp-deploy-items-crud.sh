#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 8

TOKEN=$(docker exec conectaking-api node -e "const jwt=require('jsonwebtoken');process.stdout.write(jwt.sign({userId:'seed-admin-FNpGSFmV2bHm',email:'test@local'}, process.env.JWT_SECRET, {expiresIn:'1h'}));")
AUTH="Authorization: Bearer $TOKEN"

echo "=== GET items ==="
curl -sS -D - -o /tmp/items.json -H "$AUTH" 'http://127.0.0.1:5000/api/profile/items' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
docker cp /tmp/items.json conectaking-api:/tmp/items.json
docker exec conectaking-api node -e "const a=JSON.parse(require('fs').readFileSync('/tmp/items.json','utf8')); console.log({count:a.length, first:a[0]&&a[0].item_type});"

echo "=== POST link ==="
curl -sS -D - -o /tmp/created.json -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  --data '{"item_type":"link","title":"CK Laravel Test","destination_url":"https://example.com"}' \
  'http://127.0.0.1:5000/api/profile/items' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
docker cp /tmp/created.json conectaking-api:/tmp/created.json
NEW_ID=$(docker exec conectaking-api node -e "const o=JSON.parse(require('fs').readFileSync('/tmp/created.json','utf8')); process.stdout.write(String(o.id||''));")
echo "new_id=$NEW_ID"

echo "=== PUT item ==="
curl -sS -D - -o /tmp/upd.json -X PUT -H "$AUTH" -H 'Content-Type: application/json' \
  --data '{"title":"CK Laravel Test Updated"}' \
  "http://127.0.0.1:5000/api/profile/items/$NEW_ID" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
docker cp /tmp/upd.json conectaking-api:/tmp/upd.json
docker exec conectaking-api node -e "const o=JSON.parse(require('fs').readFileSync('/tmp/upd.json','utf8')); console.log({id:o.id,title:o.title});"

echo "=== GET by id ==="
curl -sS -D - -o /tmp/one.json -H "$AUTH" "http://127.0.0.1:5000/api/profile/items/$NEW_ID" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
docker cp /tmp/one.json conectaking-api:/tmp/one.json
docker exec conectaking-api node -e "const o=JSON.parse(require('fs').readFileSync('/tmp/one.json','utf8')); console.log({success:o.success, title:o.data&&o.data.title});"

echo "=== DELETE ==="
curl -sS -D - -o /tmp/del.json -X DELETE -H "$AUTH" "http://127.0.0.1:5000/api/profile/items/$NEW_ID" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
cat /tmp/del.json; echo
echo DONE
