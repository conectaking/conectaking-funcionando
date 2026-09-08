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

TOK=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc \
  "SELECT COALESCE(NULLIF(portaria_slug,''), NULLIF(public_view_token,''), confirmation_token)
   FROM guest_list_items gli
   JOIN profile_items pi ON pi.id=gli.profile_item_id
   WHERE pi.is_active AND (portaria_slug IS NOT NULL OR public_view_token IS NOT NULL OR confirmation_token IS NOT NULL)
   LIMIT 1;" | tr -d '[:space:]')
echo "tok=${TOK:0:16}"

echo '=== portaria page ==='
curl -sS -D - -o /tmp/port.html "http://127.0.0.1:5000/portaria/$TOK" | hdr
python3 -c "h=open('/tmp/port.html',encoding='utf-8',errors='replace').read(); print('ok','Portaria' in h or 'Check-in' in h, 'err','Server Error' in h, 'len',len(h))"

GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc \
  "SELECT g.id FROM guests g
   JOIN guest_list_items gli ON gli.id=g.guest_list_id
   WHERE (gli.portaria_slug='$TOK' OR gli.public_view_token='$TOK' OR gli.confirmation_token='$TOK')
     AND g.status <> 'checked_in' LIMIT 1;" | tr -d '[:space:]')
echo "gid=$GID"
if [ -n "$GID" ]; then
  echo '=== checkin ==='
  curl -sS -D - -o /tmp/ci.json -X POST "http://127.0.0.1:5000/portaria/$TOK/checkin/$GID" | hdr
  python3 -c "import json;o=json.load(open('/tmp/ci.json'));print('ok',o.get('success'),o.get('message'),o.get('guest'))"
fi

echo '=== search ==='
curl -sS -D - -o /tmp/cs.json -X POST 'http://127.0.0.1:5000/guest-list/confirm/cpf' \
  -H 'Content-Type: application/json' \
  -d "{\"token\":\"$TOK\",\"search\":\"a\"}" | hdr
python3 -c "import json;o=json.load(open('/tmp/cs.json'));print('body', {k:o.get(k) for k in ('success','message','partial')})"

echo '=== verify qr short ==='
curl -sS -o /tmp/vq.json -w '%{http_code}\n' 'http://127.0.0.1:5000/guest-list/verify/qr/short'
python3 -c "import json;o=json.load(open('/tmp/vq.json'));print('short',o.get('success'),o.get('message','')[:50])"

echo DONE
