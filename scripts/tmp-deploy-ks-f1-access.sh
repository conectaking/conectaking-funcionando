#!/bin/bash
set -e
cd /opt/conectaking

# Keep KS on Laravel for all slugs (already open in prod)
grep -q '^LARAVEL_KS=' .env.prod && sed -i 's/^LARAVEL_KS=.*/LARAVEL_KS=true/' .env.prod || echo 'LARAVEL_KS=true' >> .env.prod
if grep -q '^LARAVEL_KS_SLUGS=' .env.prod; then
  sed -i 's/^LARAVEL_KS_SLUGS=.*/LARAVEL_KS_SLUGS=/' .env.prod
else
  echo 'LARAVEL_KS_SLUGS=' >> .env.prod
fi

rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 14
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5; }

echo '=== login-by-details empty ==='
curl -sS -D - -o /tmp/f1a.json -X POST http://127.0.0.1:5000/api/king-selection/client/login-by-details \
  -H 'Content-Type: application/json' -d '{}' | hdr
python3 -c "import json;o=json.load(open('/tmp/f1a.json'));print(o)"

echo '=== public-enter eliseu ==='
curl -sS -D - -o /tmp/f1b.json -X POST http://127.0.0.1:5000/api/king-selection/client/public-enter \
  -H 'Content-Type: application/json' -d '{"slug":"eliseu"}' | hdr
python3 -c "import json;o=json.load(open('/tmp/f1b.json'));print({k:o.get(k) for k in ('success','message','token') if k in o or True}); print('token_len', len(o.get('token') or ''))"

echo '=== signup-enter eliseu ==='
curl -sS -D - -o /tmp/f1c.json -X POST http://127.0.0.1:5000/api/king-selection/client/signup-enter \
  -H 'Content-Type: application/json' -d '{"slug":"eliseu"}' | hdr
python3 -c "import json;o=json.load(open('/tmp/f1c.json'));print('success',o.get('success'),'message',o.get('message'),'token',bool(o.get('token')))"

echo '=== register empty ==='
curl -sS -D - -o /tmp/f1d.json -X POST http://127.0.0.1:5000/api/king-selection/client/register \
  -H 'Content-Type: application/json' -d '{}' | hdr
python3 -c "import json;o=json.load(open('/tmp/f1d.json'));print(o)"

echo DONE
