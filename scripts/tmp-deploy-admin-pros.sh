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

JWT_SECRET=$(grep -E '^JWT_SECRET=' .env.prod | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
# admin user: prefer is_admin / account
UIDN=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc \
  "SELECT id FROM users WHERE COALESCE(is_admin,false)=true OR email ILIKE '%admin%' OR email='conectaking@gmail.com' ORDER BY CASE WHEN COALESCE(is_admin,false) THEN 0 ELSE 1 END LIMIT 1;" | tr -d '[:space:]')
echo "uid=$UIDN"
TOKEN=$(docker exec -e JWT_SECRET="$JWT_SECRET" -e UIDN="$UIDN" conectaking-api node -e 'const jwt=require("jsonwebtoken"); process.stdout.write(jwt.sign({userId: process.env.UIDN, isAdmin:true}, process.env.JWT_SECRET, {expiresIn:"2h"}));')
echo "toklen=${#TOKEN}"

echo '=== list ==='
curl -sS -D - -o /tmp/ap.json -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:5000/api/admin/bible/prosperidade' | hdr
python3 -c "import json;o=json.load(open('/tmp/ap.json'));d=(o.get('data') or {}).get('activations') or []; print('ok',o.get('success'),'n',len(d), 'engine_msg',o.get('message'))"

echo '=== map ==='
curl -sS -D - -o /tmp/am.json -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:5000/api/admin/bible/prosperidade/storytelling-map' | hdr
python3 -c "import json;o=json.load(open('/tmp/am.json'));print('map',o.get('success'), 'phases', len((o.get('data') or {}).get('phases') or []))"

echo '=== get 1 ==='
curl -sS -D - -o /tmp/ag.json -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:5000/api/admin/bible/prosperidade/1' | hdr
python3 -c "import json;o=json.load(open('/tmp/ag.json'));d=o.get('data') or {}; print({k:d.get(k) for k in ('activation_number','titulo','published','status','can_publish')})"

echo '=== save subtitle ==='
curl -sS -D - -o /tmp/as.json -X PUT -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  'http://127.0.0.1:5000/api/admin/bible/prosperidade/1' \
  -d '{"titulo":"Smoke Admin Laravel"}' | hdr
python3 -c "import json;o=json.load(open('/tmp/as.json'));d=o.get('data') or {}; print('save',o.get('success'), d.get('titulo'))"

echo '=== no token ==='
curl -sS -o /tmp/na.json -w '%{http_code}\n' 'http://127.0.0.1:5000/api/admin/bible/prosperidade'

echo DONE
