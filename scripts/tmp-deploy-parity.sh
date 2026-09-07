#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
sleep 7
curl -sS -o /tmp/lcard.html -w 'HTTP:%{http_code}\n' 'http://127.0.0.1:5000/l/card/adrianokingg'
echo "engine_header:"
curl -sS -D - -o /dev/null 'http://127.0.0.1:5000/adrianokingg?laravel=1' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' || true
echo "pix=$(grep -c profile-button-pix-qrcode /tmp/lcard.html || true)"
echo "form=$(grep -c 'fa-wpforms\|/form/' /tmp/lcard.html || true)"
echo "carousel=$(grep -c carousel-container-public /tmp/lcard.html || true)"
echo "catalog=$(grep -c product-catalog-btn /tmp/lcard.html || true)"
echo "logview=$(grep -c 'log/view' /tmp/lcard.html || true)"
echo "ogproxy=$(grep -c 'api/image/profile-image' /tmp/lcard.html || true)"
echo "store=$(grep -c 'fa-store\|sales_page' /tmp/lcard.html || true)"
echo "--- laravel logs ---"
docker logs conectaking-laravel --tail 25 2>&1 | tail -25
