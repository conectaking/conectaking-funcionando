#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
cp -f middleware/laravelProxy.js /opt/conectaking/middleware/laravelProxy.js 2>/dev/null || true
# ensure APIS flag
grep -q '^LARAVEL_CARD_APIS=' .env.prod && sed -i 's/^LARAVEL_CARD_APIS=.*/LARAVEL_CARD_APIS=true/' .env.prod || echo 'LARAVEL_CARD_APIS=true' >> .env.prod
# keep canary
grep -q '^LARAVEL_CARD_PUBLIC=' .env.prod && sed -i 's/^LARAVEL_CARD_PUBLIC=.*/LARAVEL_CARD_PUBLIC=true/' .env.prod || echo 'LARAVEL_CARD_PUBLIC=true' >> .env.prod
grep -q '^LARAVEL_CARD_SLUGS=' .env.prod && sed -i 's/^LARAVEL_CARD_SLUGS=.*/LARAVEL_CARD_SLUGS=adrianokingg/' .env.prod || echo 'LARAVEL_CARD_SLUGS=adrianokingg' >> .env.prod

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps api
sleep 8

echo "=== env ==="
docker exec conectaking-api printenv | grep LARAVEL_CARD

echo "=== PIX via proxy (deve X-Conecta-Engine laravel) ==="
curl -sS -D - -o /tmp/pix.json 'http://127.0.0.1:5000/api/pix/qrcode/4' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' || true
cat /tmp/pix.json; echo

echo "=== verse via proxy ==="
curl -sS -D - -o /tmp/v.json 'http://127.0.0.1:5000/api/bible/verse-of-day?translation=nvi' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' || true
head -c 220 /tmp/v.json; echo

echo "=== card still laravel ==="
curl -sS -D - -o /dev/null 'http://127.0.0.1:5000/adrianokingg' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' || true

echo "=== direct laravel pix ==="
curl -sS 'http://127.0.0.1:8080/api/pix/qrcode/4' | head -c 200; echo
