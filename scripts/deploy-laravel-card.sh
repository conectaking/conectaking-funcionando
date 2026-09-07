#!/bin/bash
# Deploy seguro: Laravel cartão + proxy Node (sem trocar /:slug)
set -euo pipefail
cd /opt/conectaking

# APP key se faltar
if ! grep -q '^LARAVEL_APP_KEY=base64:' .env.prod 2>/dev/null; then
  KEY=$(docker run --rm php:8.3-cli php -r "echo 'base64:'.base64_encode(random_bytes(32));")
  echo "LARAVEL_APP_KEY=$KEY" >> .env.prod
  echo "LARAVEL_APP_KEY gerada"
fi
grep -q '^LARAVEL_CARD_ENABLED=' .env.prod || echo 'LARAVEL_CARD_ENABLED=true' >> .env.prod

docker compose -f docker-compose.prod.yml --env-file .env.prod build laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d laravel

# Recriar API para pegar LARAVEL_HOST=laravel + ficheiros novos
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps --build api || \
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --no-deps api

# Fallback: pelo menos copiar proxy e env via restart com network
docker cp /opt/conectaking/server.js conectaking-api:/app/server.js
docker cp /opt/conectaking/middleware/laravelProxy.js conectaking-api:/app/middleware/laravelProxy.js
docker cp /opt/conectaking/modules/cartaoVirtual/cartaoVirtual.routes.js conectaking-api:/app/modules/cartaoVirtual/cartaoVirtual.routes.js

# Garantir env Laravel no api (sem rebuild se image antiga)
docker inspect conectaking-api --format '{{range .Config.Env}}{{println .}}{{end}}' | grep LARAVEL || true
# Se LARAVEL_HOST não for laravel, força recreate
if ! docker inspect conectaking-api --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -q 'LARAVEL_HOST=laravel'; then
  echo "Recriando api com LARAVEL_HOST..."
  docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
fi

docker restart conectaking-api
sleep 10
echo "=== health ==="
curl -sS -o /dev/null -w "node:%{http_code}\n" http://127.0.0.1:5000/health || true
curl -sS -o /dev/null -w "laravel-direct:%{http_code}\n" http://127.0.0.1:8080/up || true
curl -sS -o /dev/null -w "node-card:%{http_code}\n" http://127.0.0.1:5000/adrianokingg
curl -sS -o /dev/null -w "laravel-card:%{http_code}\n" http://127.0.0.1:5000/l/card/adrianokingg
echo -n "laravel-api: "; curl -sS http://127.0.0.1:5000/l/api/card/adrianokingg | head -c 320; echo
echo -n "node-api: "; curl -sS -w " [%{http_code}]\n" http://127.0.0.1:5000/api/adrianokingg | head -c 220; echo
docker ps --format '{{.Names}} {{.Status}}' | grep conectaking
echo DONE
