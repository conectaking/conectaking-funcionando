#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 12
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -4; }
echo '=== form ==='
curl -sS -D - -o /tmp/form.html 'http://127.0.0.1:5000/adrianokingg/form/9' | hdr
python3 -c "h=open('/tmp/form.html',encoding='utf-8',errors='replace').read(); print('ok', 'ck-form' in h and 'Server Error' not in h, 'len',len(h))"
echo '=== confirm ==='
CT=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT confirmation_token FROM guest_list_items WHERE confirmation_token IS NOT NULL LIMIT 1;" | tr -d '[:space:]')
echo "ct=${CT:0:12}"
if [ -n "$CT" ]; then
  curl -sS -D - -o /tmp/gc.html "http://127.0.0.1:5000/guest-list/confirm/$CT" | hdr
  python3 -c "h=open('/tmp/gc.html',encoding='utf-8',errors='replace').read(); print('ok','Confirma' in h and 'Server Error' not in h)"
fi
echo '=== og ==='
curl -sS -o /tmp/og.jpg -w '%{http_code} %{content_type}\n' 'http://127.0.0.1:5000/api/king-selection/public/og-image?slug=eliseu'
echo DONE
