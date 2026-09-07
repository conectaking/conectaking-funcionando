#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz

grep -q '^LARAVEL_CARD_APIS=' .env.prod && sed -i 's/^LARAVEL_CARD_APIS=.*/LARAVEL_CARD_APIS=true/' .env.prod || echo 'LARAVEL_CARD_APIS=true' >> .env.prod

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
# API precisa do middleware novo — rebuild sem cache se necessário
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 8

# user id do adrianokingg
UID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM users WHERE profile_slug='adrianokingg' LIMIT 1;" | tr -d '[:space:]')
echo "uid=$UID"

echo "=== vcard ==="
curl -sS -D - -o /tmp/v.vcf "http://127.0.0.1:5000/vcard/adrianokingg" | tr -d '\r' | grep -iE 'HTTP/|x-conecta|content-type' | head -10
head -5 /tmp/v.vcf; echo

echo "=== log view ==="
curl -sS -D - -o /dev/null -X POST "http://127.0.0.1:5000/log/view/$UID" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -10

echo "=== log click ==="
curl -sS -D - -o /dev/null -X POST "http://127.0.0.1:5000/log/click/item/4" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -10

echo "=== log vcard ==="
curl -sS -D - -o /dev/null -X POST "http://127.0.0.1:5000/log/vcard/$UID" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -10

PDF_ID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM profile_items WHERE item_type='pdf' AND is_active LIMIT 1;" | tr -d '[:space:]')
echo "pdf_id=$PDF_ID"
if [ -n "$PDF_ID" ]; then
  echo "=== pdf ==="
  curl -sS -D - -o /tmp/x.pdf "http://127.0.0.1:5000/download/pdf/$PDF_ID" | tr -d '\r' | grep -iE 'HTTP/|x-conecta|content-type|content-disposition' | head -10
  ls -la /tmp/x.pdf
fi

echo "=== pix still laravel ==="
curl -sS -D - -o /dev/null 'http://127.0.0.1:5000/api/pix/qrcode/4' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
echo DONE
