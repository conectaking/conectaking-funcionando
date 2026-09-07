#!/bin/bash
set -e
echo "=== headers PIX ==="
curl -sS -D - -o /tmp/pix.json 'http://127.0.0.1:5000/api/pix/qrcode/4' | tr -d '\r' | head -20
echo "=== body ==="; cat /tmp/pix.json; echo
echo "=== headers verse ==="
curl -sS -D - -o /tmp/v.json 'http://127.0.0.1:5000/api/bible/verse-of-day' | tr -d '\r' | head -20
echo "=== laravel routes file has pix? ==="
docker exec conectaking-laravel grep -n 'pix/qrcode' /app/routes/web.php || echo 'NO PIX ROUTE IN CONTAINER'
docker exec conectaking-laravel ls /app/app/Http/Controllers/CartaoVirtual/ || true
docker exec conectaking-api grep -n 'LARAVEL_CARD_APIS\|isLaravelCardApiPath' /app/middleware/laravelProxy.js | head -10 || true
