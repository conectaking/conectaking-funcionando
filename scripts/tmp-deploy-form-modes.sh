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

SLUG=adrianokingg
ITEM=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc \
  "SELECT pi.id FROM profile_items pi
   JOIN users u ON u.id=pi.user_id
   WHERE u.profile_slug='$SLUG' AND pi.item_type IN ('digital_form','guest_list') AND pi.is_active
   ORDER BY pi.id DESC LIMIT 1;" | tr -d '[:space:]')
echo "item=$ITEM"

echo '=== form page ==='
curl -sS -D - -o /tmp/fp.html "http://127.0.0.1:5000/$SLUG/form/$ITEM" | hdr
python3 -c "h=open('/tmp/fp.html',encoding='utf-8',errors='replace').read(); print('ok', 'form' in h.lower() or 'Enviar' in h, 'err','Server Error' in h, 'len',len(h))"

echo '=== submit lead ==='
curl -sS -D - -o /tmp/fs.json -X POST "http://127.0.0.1:5000/$SLUG/form/$ITEM/submit" \
  -H 'Content-Type: application/json' -H 'Accept: application/json' \
  -d '{"response_data":{"nome":"Smoke Test Laravel","email":"smoke@test.local","whatsapp":"11999990000"},"responder_name":"Smoke Test Laravel","responder_email":"smoke@test.local","responder_phone":"11999990000"}' | hdr
python3 -c "import json;o=json.load(open('/tmp/fs.json'));print({k:o.get(k) for k in ('success','message','response_id','success_page_url','qr_token','checkout_enabled','send_mode','guest_id')})"

RID=$(python3 -c "import json;print(json.load(open('/tmp/fs.json')).get('response_id') or '')")
echo "rid=$RID"
if [ -n "$RID" ]; then
  echo '=== success page ==='
  curl -sS -D - -o /tmp/sx.html "http://127.0.0.1:5000/$SLUG/form/$ITEM/success?response_id=$RID" | hdr
  python3 -c "h=open('/tmp/sx.html',encoding='utf-8',errors='replace').read(); print('ok','Enviado' in h or 'sucesso' in h.lower(), 'err','Server Error' in h, 'len',len(h))"
fi

echo '=== portaria still laravel ==='
TOK=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc \
  "SELECT COALESCE(NULLIF(portaria_slug,''), NULLIF(public_view_token,''), confirmation_token)
   FROM guest_list_items gli JOIN profile_items pi ON pi.id=gli.profile_item_id
   WHERE pi.is_active LIMIT 1;" | tr -d '[:space:]')
curl -sS -D - -o /dev/null "http://127.0.0.1:5000/portaria/$TOK" | hdr

echo DONE
