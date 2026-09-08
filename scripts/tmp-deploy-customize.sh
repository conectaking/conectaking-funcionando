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

# login para JWT
EMAIL=$(grep -E '^ADMIN_EMAIL=|^SMOKE_EMAIL=' .env.prod | head -1 | cut -d= -f2- || true)
# fallback: usuário do canário
LOGIN_EMAIL=${EMAIL:-conectaking@gmail.com}
PASS=$(grep -E '^ADMIN_PASSWORD=|^SMOKE_PASSWORD=' .env.prod | head -1 | cut -d= -f2- || true)
if [ -z "$PASS" ]; then PASS=conectaking; fi

curl -sS -o /tmp/login.json -X POST 'http://127.0.0.1:5000/api/auth/login' \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$LOGIN_EMAIL\",\"password\":\"$PASS\"}" || true
TOKEN=$(python3 -c "import json;o=json.load(open('/tmp/login.json'));print(o.get('token') or o.get('accessToken') or (o.get('data') or {}).get('token') or '')" 2>/dev/null || true)
echo "login_token_len=${#TOKEN}"

ITEM=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc \
  "SELECT pi.id FROM profile_items pi
   JOIN guest_list_items gli ON gli.profile_item_id=pi.id
   JOIN users u ON u.id=pi.user_id
   WHERE pi.is_active
   ORDER BY CASE WHEN u.profile_slug='adrianokingg' THEN 0 ELSE 1 END, pi.id DESC
   LIMIT 1;" | tr -d '[:space:]')
echo "item=$ITEM"

echo '=== customize page ==='
curl -sS -D - -o /tmp/cz.html "http://127.0.0.1:5000/api/guest-lists/$ITEM/customize-portaria?token=$TOKEN" | hdr
python3 -c "h=open('/tmp/cz.html',encoding='utf-8',errors='replace').read(); print('page', 'Personalizar' in h or 'portaria' in h.lower(), 'err','Server Error' in h or 'Não autorizado' in h, 'len',len(h), 'engine_laravel', 'X-Conecta' not in h)"

echo '=== customize save ==='
curl -sS -D - -o /tmp/czs.json -X PUT "http://127.0.0.1:5000/api/guest-lists/$ITEM/customize-portaria?token=$TOKEN" \
  -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d '{"primary_color":"#FFC700","portaria_subtitle":"Smoke Laravel portaria"}' | hdr
python3 -c "import json;o=json.load(open('/tmp/czs.json'));print(o)"

echo '=== form submit no checkout ==='
SLUG=adrianokingg
FITEM=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc \
  "SELECT pi.id FROM profile_items pi JOIN users u ON u.id=pi.user_id
   WHERE u.profile_slug='$SLUG' AND pi.item_type IN ('digital_form','guest_list') AND pi.is_active
   ORDER BY pi.id DESC LIMIT 1;" | tr -d '[:space:]')
curl -sS -o /tmp/fs.json -X POST "http://127.0.0.1:5000/$SLUG/form/$FITEM/submit" \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"response_data":{"nome":"NoCheckout"},"responder_name":"NoCheckout","responder_email":"a@b.c","responder_phone":"11999990001"}'
python3 -c "import json;o=json.load(open('/tmp/fs.json'));print({k:o.get(k) for k in ('success','checkout_enabled','success_page_url','send_mode')}); assert 'checkout' not in (o.get('success_page_url') or '')"

echo DONE
