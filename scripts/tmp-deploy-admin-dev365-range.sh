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

echo '=== range validation (>31) via Laravel ==='
curl -sS -D - -o /tmp/d365r.json -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  'http://127.0.0.1:5000/api/admin/bible/devotionals-365/generate-range-ai' \
  -d '{"start":1,"end":40,"year":'"$YEAR"',"delayMs":0}' | hdr
python3 -c "import json;o=json.load(open('/tmp/d365r.json')); print('range',o.get('success'), o.get('message') or o.get('data'))"

echo '=== month route wired (invalid month) ==='
curl -sS -D - -o /tmp/d365m.json -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  "http://127.0.0.1:5000/api/admin/bible/devotionals-365/generate-month-ai/$YEAR/13" \
  -d '{"delayMs":0}' | hdr
python3 -c "import json;o=json.load(open('/tmp/d365m.json')); print('month13',o.get('success'), o.get('message'))"

echo '=== async still Node ==='
curl -sS -D - -o /tmp/d365a.json -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  'http://127.0.0.1:5000/api/admin/bible/devotionals-365/generate-calendar-months-async' \
  -d '{"year":'"$YEAR"',"months":[12],"delayMs":0}' | hdr
python3 -c "import json;o=json.load(open('/tmp/d365a.json')); print('async',o.get('success'), list(o.keys())[:6], (o.get('data') or {}).get('jobId') or (o.get('data') or {}).get('job_id') or o.get('message'))"

echo DONE
