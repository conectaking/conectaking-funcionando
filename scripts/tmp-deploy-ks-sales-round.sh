#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 14
PASS=${CK_SMOKE_PASS:-playadryan22}
curl -sS -o /tmp/tok.json -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}"
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/tok.json'))['token'])")
AUTH="Authorization: Bearer $TOKEN"
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
echo "gid=$GID"
# ensure a client
CID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_gallery_clients WHERE gallery_id=$GID ORDER BY id ASC LIMIT 1;" | tr -d '[:space:]')
if [ -z "$CID" ]; then
  curl -sS -o /tmp/c.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/clients" \
    -H "$AUTH" -H 'Content-Type: application/json' \
    -d '{"nome":"Smoke Sales","email":"smoke.sales@test.local","telefone":"11999990000"}'
  CID=$(python3 -c "import json;o=json.load(open('/tmp/c.json')); print(o.get('client',{}).get('id') or o.get('id') or '')")
fi
echo "cid=$CID"
curl -sS -D - -o /tmp/rnd.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/sales/clients/${CID}/round/1" -H "$AUTH" | tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5
python3 -c "import json;o=json.load(open('/tmp/rnd.json')); assert o.get('success'); print('selected',len(o.get('selected') or []))"
curl -sS -D - -o /tmp/pt.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/sales/clients/${CID}/round/1/payment-terms" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"negotiated_total_cents":15000,"down_payment_cents":5000,"installment_count":2}' | tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5
python3 -c "import json;o=json.load(open('/tmp/pt.json')); assert o.get('success') and o['payment']['negotiated_total_cents']==15000; print('terms ok')"
curl -sS -D - -o /tmp/pr.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/sales/clients/${CID}/round/1/payment-review" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"status":"pending","note_admin":"smoke pending"}' | tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5
python3 -c "import json;o=json.load(open('/tmp/pr.json')); assert o.get('success') and o['payment']['status']=='pending'; print('review pending ok')"
curl -sS -o /tmp/aa.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/sales/clients/${CID}/round/1/approve-all" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"status":"approved"}'
python3 -c "import json;o=json.load(open('/tmp/aa.json')); print('approve-all',o); assert o.get('success') or o.get('message')"
echo DONE
