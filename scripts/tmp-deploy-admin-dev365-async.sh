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

echo '=== async empty months ==='
curl -sS -D - -o /tmp/d365a0.json -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  'http://127.0.0.1:5000/api/admin/bible/devotionals-365/generate-calendar-months-async' \
  -d '{"year":'"$YEAR"',"months":[]}' | hdr
python3 -c "import json;o=json.load(open('/tmp/d365a0.json')); print('empty',o.get('success'), o.get('message'))"

echo '=== async start + cancel ==='
curl -sS --max-time 30 -D - -o /tmp/d365a1.json -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  'http://127.0.0.1:5000/api/admin/bible/devotionals-365/generate-calendar-months-async' \
  -d '{"year":'"$YEAR"',"months":[12],"delayMs":8000}' | hdr
JOB=$(python3 -c "import json;o=json.load(open('/tmp/d365a1.json')); print((o.get('data') or {}).get('jobId') or '')")
echo "job=$JOB"
if [ -n "$JOB" ]; then
  curl -sS -D - -o /tmp/d365c.json -X POST -H "$AUTH" \
    "http://127.0.0.1:5000/api/admin/bible/devotionals-365/generation-job/$JOB/cancel" | hdr
  python3 -c "import json; print(json.load(open('/tmp/d365c.json')))"
  sleep 2
  curl -sS -D - -o /tmp/d365j.json -H "$AUTH" \
    "http://127.0.0.1:5000/api/admin/bible/devotionals-365/generation-job/$JOB" | hdr
  python3 -c "import json;o=json.load(open('/tmp/d365j.json'));d=o.get('data') or {}; print('status',d.get('status'),'cancel',d.get('cancelRequested'),'proc',d.get('processed'),'total',d.get('total'))"
fi

echo '=== job 404 ==='
curl -sS -D - -o /tmp/d365x.json -H "$AUTH" \
  'http://127.0.0.1:5000/api/admin/bible/devotionals-365/generation-job/no-such' | hdr
python3 -c "import json;o=json.load(open('/tmp/d365x.json')); print('404',o.get('success'), o.get('message'))"

echo DONE
