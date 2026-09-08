#!/bin/bash
set -e
cd /opt/conectaking

grep -q '^LARAVEL_DASHBOARD=' .env.prod && sed -i 's/^LARAVEL_DASHBOARD=.*/LARAVEL_DASHBOARD=true/' .env.prod || echo 'LARAVEL_DASHBOARD=true' >> .env.prod

rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 14
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5; }

echo '=== login empty ==='
curl -sS -D - -o /tmp/f3a.json -X POST http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' -d '{}' | hdr
python3 -c "import json;print(json.load(open('/tmp/f3a.json')))"

echo '=== login bad ==='
curl -sS -D - -o /tmp/f3b.json -X POST http://127.0.0.1:5000/api/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"nobody@example.com","password":"x"}' | hdr
python3 -c "import json;print(json.load(open('/tmp/f3b.json')))"

EMAIL=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT email FROM users ORDER BY id LIMIT 1;" | tr -d '[:space:]')
echo "user_email=$EMAIL"

echo '=== login.html ==='
curl -sS -D - -o /tmp/f3login.html http://127.0.0.1:5000/login.html | hdr
python3 -c "h=open('/tmp/f3login.html',encoding='utf-8',errors='ignore').read(); print('login_form', 'login-form' in h, 'len', len(h)); assert 'login-form' in h"

echo '=== dashboard.html ==='
curl -sS -D - -o /tmp/f3dash.html http://127.0.0.1:5000/dashboard.html | hdr
python3 -c "h=open('/tmp/f3dash.html',encoding='utf-8',errors='ignore').read(); print('dash', 'dashboard' in h.lower() or 'conecta' in h.lower(), 'len', len(h)); assert len(h)>1000"

echo DONE
