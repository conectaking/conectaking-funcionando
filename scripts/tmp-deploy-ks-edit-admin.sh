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
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
CID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_gallery_clients WHERE gallery_id=${GID} AND enabled IS DISTINCT FROM false ORDER BY id ASC LIMIT 1;" | tr -d '[:space:]')
echo "gid=$GID cid=$CID"

echo '--- edit-requests GET ---'
curl -sS -D - -o /tmp/er.json -X GET "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/edit-requests" \
  -H "Authorization: Bearer $TOKEN" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/er.json')); print('requests',len(o.get('requests') or [])); assert o.get('success') is True"

echo '--- clear-review ---'
curl -sS -D - -o /tmp/cr.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/clients/${CID}/clear-review" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}' \
  | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/cr.json')); print(o); assert o.get('success') is True"

echo '--- delete-selection-batch validation ---'
curl -sS -D - -o /tmp/db.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/clients/${CID}/delete-selection-batch" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"batch":0}' \
  | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/db.json')); print(o); assert 'batch' in o.get('message','').lower() or o.get('success')"

echo '--- reactivate-selection-batch missing ---'
curl -sS -D - -o /tmp/rb.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/clients/${CID}/reactivate-selection-batch" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"batch":999}' \
  | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/rb.json')); print(o); assert o.get('message')"
echo DONE
