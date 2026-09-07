#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 10

TOKEN=$(docker exec conectaking-api node -e "const jwt=require('jsonwebtoken');process.stdout.write(jwt.sign({userId:'seed-admin-FNpGSFmV2bHm',email:'test@local'}, process.env.JWT_SECRET, {expiresIn:'1h'}));")
AUTH="Authorization: Bearer $TOKEN"
hdr() { tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5; }

echo "=== create digital_form ==="
curl -sS -D - -o /tmp/df.json -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  --data '{"item_type":"digital_form","title":"Form Extras"}' \
  'http://127.0.0.1:5000/api/profile/items' | hdr
DF_ID=$(python3 -c "import json;print(json.load(open('/tmp/df.json')).get('id',''))")
echo "df_id=$DF_ID"

echo "=== insert fake response via SQL ==="
docker exec conectaking-db psql -U conectaking -d conectaking -c \
  "INSERT INTO digital_form_responses (profile_item_id, response_data, responder_name, responder_email, submitted_at)
   VALUES ($DF_ID, '{\"nome\":\"Ada\"}'::jsonb, 'Ada', 'ada@test.com', NOW()) RETURNING id;" > /tmp/rid.txt
RID=$(grep -Eo '[0-9]+' /tmp/rid.txt | head -1)
echo "response_id=$RID"

echo "=== GET responses ==="
curl -sS -D - -o /tmp/resp.json -H "$AUTH" \
  "http://127.0.0.1:5000/api/profile/items/digital_form/$DF_ID/responses?mode=lead" | hdr
python3 -c "import json;o=json.load(open('/tmp/resp.json'));print({'n':len(o.get('responses') or []), 'name':(o.get('responses') or [{}])[0].get('responder_name')})"

echo "=== GET dashboard ==="
curl -sS -D - -o /tmp/dash.json -H "$AUTH" \
  "http://127.0.0.1:5000/api/profile/items/digital_form/$DF_ID/dashboard" | hdr
python3 -c "import json;o=json.load(open('/tmp/dash.json'));print({k:o.get(k) for k in ['total_responses','last_7_days','metrics']})"

echo "=== create-import-link ==="
curl -sS -D - -o /tmp/imp.json -X POST -H "$AUTH" \
  "http://127.0.0.1:5000/api/profile/items/digital_form/$DF_ID/create-import-link" | hdr
python3 -c "import json;o=json.load(open('/tmp/imp.json'));print({'token':(o.get('token') or '')[:12],'code':o.get('code')})"
CODE=$(python3 -c "import json;print(json.load(open('/tmp/imp.json')).get('code') or '')")

echo "=== import-form-info (public) ==="
curl -sS -D - -o /tmp/info.json \
  "http://127.0.0.1:5000/api/profile/import-form-info?code=$CODE" | hdr
cat /tmp/info.json; echo

echo "=== import-form (new module) ==="
curl -sS -D - -o /tmp/imported.json -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  --data "{\"code\":\"$CODE\"}" \
  'http://127.0.0.1:5000/api/profile/import-form' | hdr
IMP_ID=$(python3 -c "import json;print(json.load(open('/tmp/imported.json')).get('id',''))")
echo "imported_id=$IMP_ID"

echo "=== DELETE response ==="
curl -sS -D - -o /tmp/delr.json -X DELETE -H "$AUTH" \
  "http://127.0.0.1:5000/api/profile/items/digital_form/$DF_ID/responses/$RID" | hdr
cat /tmp/delr.json; echo

echo "=== repair-sales-pages ==="
curl -sS -D - -o /tmp/rep.json -X POST -H "$AUTH" \
  'http://127.0.0.1:5000/api/profile/items/repair-sales-pages' | hdr
cat /tmp/rep.json; echo

echo "=== cleanup ==="
for id in $DF_ID $IMP_ID; do
  [ -n "$id" ] && curl -sS -X DELETE -H "$AUTH" "http://127.0.0.1:5000/api/profile/items/$id" >/dev/null || true
done
echo DONE
