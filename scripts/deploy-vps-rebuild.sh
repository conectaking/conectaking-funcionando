#!/bin/bash
# Rebuild limpo Laravel na VPS — sem docker cp pontual.
# Esperado: /tmp/ck-rebuild.tgz com laravel/, public/, public_html/, docker-compose.prod.yml
set -euo pipefail
BASE=/opt/conectaking
TGZ=/tmp/ck-rebuild.tgz

test -f "$TGZ" || { echo "missing $TGZ"; exit 1; }

cd "$BASE"
# Preserve secrets and uploads data
cp -a .env.prod /tmp/ck-env.prod.bak

tar xzf "$TGZ"
# Never overwrite production secrets from tarball
cp -a /tmp/ck-env.prod.bak .env.prod
rm -f laravel/.env laravel/.env.backup 2>/dev/null || true

chmod +x laravel/docker-entrypoint.sh 2>/dev/null || true
sed -i 's/\r$//' laravel/docker-entrypoint.sh 2>/dev/null || true

# Residual Hostinger / Node / HTML duplicado do ADM
rm -rf public_html/backend public_html/.git public_html/.vscode 2>/dev/null || true
rm -f public/admin/index.html public_html/admin/index.html 2>/dev/null || true
rm -f public_html/*.bat public_html/*.ps1 public_html/*.bak 2>/dev/null || true
rm -f public_html/force-no-cache.php public_html/reparar-sales-pages.js 2>/dev/null || true

docker compose -f docker-compose.prod.yml --env-file .env.prod build laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --remove-orphans

# Confirmar que não voltou Payment/MP nem container api
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
test ! -f "$BASE/public/admin/index.html" && echo 'admin_html_gone=yes'
test ! -d "$BASE/public_html/backend" && echo 'backend_gone=yes'
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
echo DEPLOY_REBUILD_OK
