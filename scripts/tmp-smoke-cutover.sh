#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
BASE8080=http://127.0.0.1:8080

echo "=== direct laravel ==="
curl -sS "$BASE8080/health"; echo
for p in /login /dashboard /api-config.js /api/subscription/plans-public /api/documentos/ocr-info /og-image.jpg; do
  curl -sS -o /dev/null -w "%{http_code} $p\n" "$BASE8080$p"
done

TOKEN=$(curl -sS -X POST "$BASE8080/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
AUTH="Authorization: Bearer $TOKEN"
for p in /api/account/status /api/profile /api/documentos /api/king-docs/vault /api/admin/stats; do
  curl -sS -o /tmp/r.json -w "%{http_code} $p\n" -H "$AUTH" "$BASE8080$p"
done

echo "=== via caddy https host ==="
curl -sk -o /tmp/ch.json -w "caddy_health:%{http_code}\n" -H 'Host: www.conectaking.com.br' https://127.0.0.1/health || true
head -c 220 /tmp/ch.json; echo

echo "=== stop api ==="
cd /opt/conectaking
docker compose -f docker-compose.prod.yml --env-file .env.prod stop api
sleep 3

echo "=== laravel-only after api stop ==="
curl -sS "$BASE8080/health"; echo
curl -sS -o /dev/null -w "login:%{http_code}\n" "$BASE8080/login"
TOKEN2=$(curl -sS -X POST "$BASE8080/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
AUTH2="Authorization: Bearer $TOKEN2"
for p in /api/account/status /api/documentos /api/king-docs/files /api/admin/stats /api/subscription/plans-public; do
  curl -sS -o /tmp/r2.json -w "%{http_code} $p\n" -H "$AUTH2" "$BASE8080$p"
done
python3 -c 'import json;o=json.load(open("/tmp/r2.json")); print("last", list(o.keys())[:6])'
curl -sk -o /tmp/ch2.json -w "caddy_health2:%{http_code}\n" -H 'Host: www.conectaking.com.br' https://127.0.0.1/health
head -c 220 /tmp/ch2.json; echo
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
echo CUTOVER_SMOKE_DONE
