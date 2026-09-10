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

docker compose -f docker-compose.prod.yml --env-file .env.prod build laravel queue
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --remove-orphans

docker exec conectaking-laravel rm -rf /app/app/Http/Controllers/Payment /app/app/Services/Payment /app/public/ks-spa 2>/dev/null || true
docker exec conectaking-laravel php artisan migrate --force --no-interaction
docker exec conectaking-laravel php artisan optimize:clear

sleep 12
echo '---SMOKE---'
curl -sS http://127.0.0.1:8080/health; echo
docker exec conectaking-redis redis-cli ping 2>/dev/null | sed 's/^/redis:/' || echo 'redis:skip'
docker exec conectaking-laravel printenv QUEUE_CONNECTION 2>/dev/null | sed 's/^/queue_conn:/' || true
docker ps --filter name=conectaking-queue --format '{{.Status}}' | sed 's/^/queue_status:/' || echo 'queue_status:missing'
curl -sSI http://127.0.0.1:8080/admin | tr -d '\r' | grep -Ei 'HTTP/|X-Conecta-Engine'
curl -sS http://127.0.0.1:8080/admin | grep -oE 'build/assets/admin-[A-Za-z0-9_-]+\.js' | head -1 | sed 's/^/admin_vite:/'
curl -sS -o /dev/null -w 'admin-planos:%{http_code}\n' http://127.0.0.1:8080/admin-planos
curl -sS -o /dev/null -w 'admin-dev365:%{http_code}\n' http://127.0.0.1:8080/admin-devocionais-365
curl -sS -o /dev/null -w 'conta:%{http_code}\n' http://127.0.0.1:8080/conta
curl -sS http://127.0.0.1:8080/conta | grep -oE 'build/assets/conta-[A-Za-z0-9_-]+\.js' | head -1 | sed 's/^/conta_vite:/'
curl -sS -o /dev/null -w 'salesPageEdit:%{http_code}\n' http://127.0.0.1:8080/salesPageEdit
curl -sS http://127.0.0.1:8080/salesPageEdit | grep -oE 'build/assets/salesPageEdit-[A-Za-z0-9_-]+\.js' | head -1 | sed 's/^/sales_vite:/'
curl -sS -o /dev/null -w 'guestListEdit:%{http_code}\n' http://127.0.0.1:8080/guestListEdit
curl -sS http://127.0.0.1:8080/guestListEdit | grep -oE 'build/assets/guestListEdit-[A-Za-z0-9_-]+\.js' | head -1 | sed 's/^/guest_vite:/'
curl -sS -o /dev/null -w 'index:%{http_code}\n' http://127.0.0.1:8080/
curl -sS http://127.0.0.1:8080/ | grep -oE 'build/assets/index-[A-Za-z0-9_-]+\.js' | head -1 | sed 's/^/index_vite:/'
curl -sS -o /dev/null -w 'responsesList:%{http_code}\n' http://127.0.0.1:8080/responsesList
curl -sS http://127.0.0.1:8080/responsesList | grep -oE 'build/assets/responsesList-[A-Za-z0-9_-]+\.js' | head -1 | sed 's/^/responses_vite:/'
curl -sS -o /dev/null -w 'recibos:%{http_code}\n' http://127.0.0.1:8080/recibos-orcamentos
curl -sS -o /dev/null -w 'doc-preview:%{http_code}\n' http://127.0.0.1:8080/documentos-preview
curl -sS -o /dev/null -w 'conviteEdit:%{http_code}\n' http://127.0.0.1:8080/conviteEdit
curl -sS -o /dev/null -w 'kingDocs:%{http_code}\n' http://127.0.0.1:8080/kingDocs
curl -sS http://127.0.0.1:8080/kingDocs | grep -oE 'build/assets/kingDocs-[A-Za-z0-9_-]+\.js' | head -1 | sed 's/^/kingDocs_vite:/'
curl -sS -o /dev/null -w 'bible:%{http_code}\n' http://127.0.0.1:8080/bible
curl -sS -o /dev/null -w 'zerar-mes:%{http_code}\n' http://127.0.0.1:8080/zerar-mes
curl -sS -o /dev/null -w 'ks-success:%{http_code}\n' http://127.0.0.1:8080/kingSelectionSuccess
curl -sS http://127.0.0.1:8080/login | grep -oE 'build/assets/(style|auth)-[A-Za-z0-9_-]+\.css' | head -3 | sed 's/^/login_css:/'
curl -sS http://127.0.0.1:8080/dashboard | grep -oE 'build/assets/dashboard-[A-Za-z0-9_-]+\.css' | head -2 | sed 's/^/dash_css:/'
curl -sS http://127.0.0.1:8080/admin | grep -oE 'build/assets/admin-[A-Za-z0-9_-]+\.css' | head -1 | sed 's/^/admin_css:/'
curl -sS -o /dev/null -w 'login:%{http_code}\n' http://127.0.0.1:8080/login
curl -sS -o /dev/null -w 'dashboard:%{http_code}\n' http://127.0.0.1:8080/dashboard
curl -sS -o /dev/null -w 'checkout:%{http_code}\n' http://127.0.0.1:8080/checkoutConfig
curl -sS -o /dev/null -w 'mp:%{http_code}\n' -X POST http://127.0.0.1:8080/api/payment/create-preference
curl -sS -o /dev/null -w 'forms:%{http_code}\n' http://127.0.0.1:8080/kingForms
curl -sS -o /dev/null -w 'ks:%{http_code}\n' http://127.0.0.1:8080/kingSelection
curl -sS -o /dev/null -w 'dashboard.js:%{http_code}\n' http://127.0.0.1:8080/dashboard.js
curl -sS -o /dev/null -w 'manifest:%{http_code}\n' http://127.0.0.1:8080/manifest.json
test ! -f "$BASE/public/admin/index.html" && echo 'admin_html_gone=yes'
docker exec conectaking-laravel sh -c 'test -z "${LEGACY_PUBLIC_HTML_PATH:-}" && echo public_html_env_off=yes || echo public_html_env=${LEGACY_PUBLIC_HTML_PATH}'
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
echo DEPLOY_REBUILD_OK
