#!/bin/bash
set -e
cd /opt/conectaking
# Ensure middleware on host
grep -n 'LARAVEL_CARD_APIS\|isLaravelCardApiPath' middleware/laravelProxy.js | head -15 || echo 'HOST middleware OLD'
# Force api rebuild without cache for middleware
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 6
echo "=== middleware in container ==="
docker exec conectaking-api grep -n 'LARAVEL_CARD_APIS\|isLaravelCardApiPath' /app/middleware/laravelProxy.js | head -15 || echo 'CONTAINER middleware OLD'
echo "=== PIX headers ==="
curl -sS -D - -o /tmp/pix.json 'http://127.0.0.1:5000/api/pix/qrcode/4' | tr -d '\r' | grep -iE 'HTTP/|x-conecta|ratelimit-limit' || true
echo "body=$(cat /tmp/pix.json)"
echo "=== verse headers ==="
curl -sS -D - -o /tmp/v.json 'http://127.0.0.1:5000/api/bible/verse-of-day' | tr -d '\r' | grep -iE 'HTTP/|x-conecta|ratelimit-limit' || true
