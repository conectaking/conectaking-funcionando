#!/bin/bash
# Rebuild limpo Laravel na VPS — sem docker cp pontual.
# Esperado: /tmp/ck-rebuild.tgz com laravel/, public/, docker-compose.prod.yml
set -euo pipefail
BASE=/opt/conectaking
TGZ=/tmp/ck-rebuild.tgz

test -f "$TGZ" || { echo "missing $TGZ"; exit 1; }

cd "$BASE"
cp -a .env.prod /tmp/ck-env.prod.bak

tar xzf "$TGZ"
cp -a /tmp/ck-env.prod.bak .env.prod
rm -f laravel/.env laravel/.env.backup 2>/dev/null || true

chmod +x laravel/docker-entrypoint.sh 2>/dev/null || true
sed -i 's/\r$//' laravel/docker-entrypoint.sh 2>/dev/null || true

rm -f public/admin/index.html 2>/dev/null || true

docker compose -f docker-compose.prod.yml --env-file .env.prod build laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --remove-orphans

docker exec conectaking-laravel rm -rf /app/app/Http/Controllers/Payment /app/app/Services/Payment /app/public/ks-spa 2>/dev/null || true
docker exec conectaking-laravel php artisan optimize:clear

sleep 12
echo '---SMOKE---'
curl -sS http://127.0.0.1:8080/health; echo
curl -sSI http://127.0.0.1:8080/admin | tr -d '\r' | grep -Ei 'HTTP/|X-Conecta-Engine'
curl -sS -o /dev/null -w 'login:%{http_code}\n' http://127.0.0.1:8080/login
curl -sS -o /dev/null -w 'dashboard:%{http_code}\n' http://127.0.0.1:8080/dashboard
curl -sS -o /dev/null -w 'checkout:%{http_code}\n' http://127.0.0.1:8080/checkoutConfig
curl -sS -o /dev/null -w 'mp:%{http_code}\n' -X POST http://127.0.0.1:8080/api/payment/create-preference
curl -sS -o /dev/null -w 'forms:%{http_code}\n' http://127.0.0.1:8080/kingForms
curl -sS -o /dev/null -w 'ks:%{http_code}\n' http://127.0.0.1:8080/kingSelection
curl -sS -o /dev/null -w 'dashboard.js:%{http_code}\n' http://127.0.0.1:8080/dashboard.js
curl -sS -o /dev/null -w 'manifest:%{http_code}\n' http://127.0.0.1:8080/manifest.json
curl -sS -o /dev/null -w 'ui.css:%{http_code}\n' http://127.0.0.1:8080/assets/css/ui.css
test ! -f "$BASE/public/admin/index.html" && echo 'admin_html_gone=yes'
docker exec conectaking-laravel sh -c 'test -z "${LEGACY_PUBLIC_HTML_PATH:-}" && echo public_html_env_off=yes || echo public_html_env=${LEGACY_PUBLIC_HTML_PATH}'
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
echo DEPLOY_REBUILD_OK
