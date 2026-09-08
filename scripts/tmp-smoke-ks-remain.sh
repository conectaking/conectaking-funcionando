#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .
# force rebuild without cache if FaceService missing enroll in image
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 16
PASS=${CK_SMOKE_PASS:-playadryan22}
printf '%s' "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" > /tmp/login.json
curl -sS -o /tmp/tok.json -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' --data-binary @/tmp/login.json
TOKEN=$(python3 -c 'import json;print(json.load(open("/tmp/tok.json"))["token"])')
AUTH="Authorization: Bearer $TOKEN"
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
echo "gid=$GID"
curl -sS -D - -o /tmp/wt.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/uploads/worker-token" -H "$AUTH" -H 'Content-Type: application/json' -d '{}' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -4
python3 -c 'import json;o=json.load(open("/tmp/wt.json")); assert o.get("success") and o.get("token"); print("worker ok")'
curl -sS -D - -o /tmp/ef.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/enrolled-faces" -H "$AUTH" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -4
python3 -c 'import json;o=json.load(open("/tmp/ef.json")); assert o.get("success"); print("enrolled", o.get("clientIds"))'
code=$(curl -sS -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:5000/api/king-selection/client/promo-verify -H 'Content-Type: application/json' -d '{"slug":"x"}')
echo "promo_noauth=$code"
docker exec conectaking-laravel grep -n 'enrollClientFaceImage\|promoVerify' /app/app/Services/CartaoVirtual/KingSelectionFaceService.php /app/app/Services/CartaoVirtual/KingSelectionClientExtrasService.php | head -5
echo DONE
