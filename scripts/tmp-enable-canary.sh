#!/bin/bash
set -e
cd /opt/conectaking

# Atualiza/insere flags no .env.prod
touch .env.prod
grep -q '^LARAVEL_CARD_PUBLIC=' .env.prod && sed -i 's/^LARAVEL_CARD_PUBLIC=.*/LARAVEL_CARD_PUBLIC=true/' .env.prod || echo 'LARAVEL_CARD_PUBLIC=true' >> .env.prod
grep -q '^LARAVEL_CARD_SLUGS=' .env.prod && sed -i 's/^LARAVEL_CARD_SLUGS=.*/LARAVEL_CARD_SLUGS=adrianokingg/' .env.prod || echo 'LARAVEL_CARD_SLUGS=adrianokingg' >> .env.prod
grep -q '^LARAVEL_CARD_ENABLED=' .env.prod && sed -i 's/^LARAVEL_CARD_ENABLED=.*/LARAVEL_CARD_ENABLED=true/' .env.prod || echo 'LARAVEL_CARD_ENABLED=true' >> .env.prod

echo "=== .env.prod flags ==="
grep -E '^LARAVEL_CARD_' .env.prod

# Recreate API para carregar env (compose já tem as vars)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 8

echo "=== api env ==="
docker exec conectaking-api printenv | grep LARAVEL_CARD || true

echo "=== /adrianokingg (deve ser Laravel, sem banner prévia) ==="
curl -sS -D - -o /tmp/c1.html 'http://127.0.0.1:5000/adrianokingg' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' || true
echo "previa=$(grep -c 'Prévia Laravel' /tmp/c1.html || true)"
echo "pix=$(grep -c profile-button-pix-qrcode /tmp/c1.html || true)"
echo "engine_body_og=$(grep -c 'api/image/profile-image' /tmp/c1.html || true)"

echo "=== outro slug (se existir path genérico: deve ser Node sem x-conecta-engine) ==="
# tenta um slug inexistente / path estático não conta; usa health-like
curl -sS -D - -o /tmp/c2.html 'http://127.0.0.1:5000/conectaking' 2>/dev/null | tr -d '\r' | grep -iE 'HTTP/|x-conecta' || echo '(sem header laravel = Node ou 404 OK)'
echo "other_engine=$(grep -ci 'x-conecta-engine' /tmp/c2.html 2>/dev/null || true)"

echo "DONE"
