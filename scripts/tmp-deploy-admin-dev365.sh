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
UIDN=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc \
  "SELECT id FROM users WHERE COALESCE(is_admin,false)=true OR email='conectaking@gmail.com' ORDER BY CASE WHEN COALESCE(is_admin,false) THEN 0 ELSE 1 END LIMIT 1;" | tr -d '[:space:]')
TOKEN=$(docker exec -e JWT_SECRET="$JWT_SECRET" -e UIDN="$UIDN" conectaking-api node -e 'const jwt=require("jsonwebtoken"); process.stdout.write(jwt.sign({userId: process.env.UIDN, isAdmin:true}, process.env.JWT_SECRET, {expiresIn:"2h"}));')
AUTH="Authorization: Bearer $TOKEN"
YEAR=$(date +%Y)

echo '=== days ==='
curl -sS -D - -o /tmp/d365d.json -H "$AUTH" 'http://127.0.0.1:5000/api/admin/bible/devotionals-365/days' | hdr
python3 -c "import json;o=json.load(open('/tmp/d365d.json'));d=(o.get('data') or {}).get('days') or []; print('ok',o.get('success'),'n',len(d),'has',sum(1 for x in d if x.get('has_devocional')))"

echo '=== day 1 ==='
curl -sS -D - -o /tmp/d3651.json -H "$AUTH" 'http://127.0.0.1:5000/api/admin/bible/devotionals-365/day/1' | hdr
python3 -c "import json;o=json.load(open('/tmp/d3651.json'));d=o.get('data') or {}; print('day',o.get('success'), d.get('day_of_year'), (d.get('titulo') or '')[:40])"

echo '=== themes ==='
curl -sS -D - -o /tmp/d365t.json -H "$AUTH" "http://127.0.0.1:5000/api/admin/bible/devotionals-365/month-themes/$YEAR" | hdr
python3 -c "import json;o=json.load(open('/tmp/d365t.json'));t=(o.get('data') or {}).get('themes') or {}; print('themes',o.get('success'), len(t))"

echo '=== upsert smoke day 365 ==='
curl -sS -D - -o /tmp/d365u.json -X PUT -H "$AUTH" -H 'Content-Type: application/json' \
  'http://127.0.0.1:5000/api/admin/bible/devotionals-365/365' \
  -d '{"titulo":"Smoke Admin Dev365","versiculo_ref":"João 3:16","reflexao":"teste","aplicacao":"a","oracao":"o"}' | hdr
python3 -c "import json; print(json.load(open('/tmp/d365u.json')))"

echo '=== delete 365 ==='
curl -sS -D - -o /tmp/d365x.json -X DELETE -H "$AUTH" 'http://127.0.0.1:5000/api/admin/bible/devotionals-365/365' | hdr
python3 -c "import json; print(json.load(open('/tmp/d365x.json')))"

echo DONE
