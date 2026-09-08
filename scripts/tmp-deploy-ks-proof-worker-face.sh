#!/bin/bash
set -e
cd /opt/conectaking
# compose (volume compartilhado uploads)
cp -f /tmp/docker-compose.prod.yml docker-compose.prod.yml 2>/dev/null || true
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 16
PASS=${CK_SMOKE_PASS:-playadryan22}
curl -sS -o /tmp/tok.json -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}"
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/tok.json'))['token'])")
AUTH="Authorization: Bearer $TOKEN"
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
CID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_gallery_clients WHERE gallery_id=$GID AND enabled IS DISTINCT FROM false ORDER BY id ASC LIMIT 1;" | tr -d '[:space:]')
echo "gid=$GID cid=$CID"

echo '=== worker-token ==='
curl -sS -D - -o /tmp/wt.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/uploads/worker-token" -H "$AUTH" -H 'Content-Type: application/json' -d '{}' | tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5
python3 -c "import json;o=json.load(open('/tmp/wt.json')); assert o.get('success') and o.get('token'); print('worker ok', o.get('expiresInSeconds'))"

echo '=== enrolled-faces ==='
curl -sS -D - -o /tmp/ef.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/enrolled-faces" -H "$AUTH" | tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5
python3 -c "import json;o=json.load(open('/tmp/ef.json')); assert o.get('success'); print('faces',o.get('clientIds'))"

echo '=== payment-proof GET (expect 404 if none) ==='
curl -sS -D - -o /tmp/pp.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/sales/payment-proof/999999" -H "$AUTH" | tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5
python3 -c "import json;o=json.load(open('/tmp/pp.json')); print(o); assert 'message' in o"

echo '=== shared volume ==='
docker exec conectaking-laravel sh -c 'echo KS_UPLOADS_PATH=$KS_UPLOADS_PATH; ls -la /shared/uploads 2>/dev/null | head -5 || echo no-shared'
echo DONE
