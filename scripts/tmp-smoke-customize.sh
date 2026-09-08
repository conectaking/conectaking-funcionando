#!/bin/bash
set -e
cd /opt/conectaking
JWT_SECRET=$(grep -E '^JWT_SECRET=' .env.prod | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
UIDN=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc \
  "SELECT u.id FROM users u JOIN profile_items pi ON pi.user_id=u.id JOIN guest_list_items gli ON gli.profile_item_id=pi.id WHERE pi.is_active ORDER BY CASE WHEN u.profile_slug='adrianokingg' THEN 0 ELSE 1 END LIMIT 1;" | tr -d '[:space:]')
ITEM=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc \
  "SELECT pi.id FROM profile_items pi JOIN guest_list_items gli ON gli.profile_item_id=pi.id JOIN users u ON u.id=pi.user_id WHERE pi.is_active ORDER BY CASE WHEN u.profile_slug='adrianokingg' THEN 0 ELSE 1 END, pi.id DESC LIMIT 1;" | tr -d '[:space:]')
echo "uid=$UIDN item=$ITEM secret_len=${#JWT_SECRET}"
TOKEN=$(docker exec -e JWT_SECRET="$JWT_SECRET" -e UIDN="$UIDN" conectaking-api node -e 'const jwt=require("jsonwebtoken"); process.stdout.write(jwt.sign({userId: process.env.UIDN}, process.env.JWT_SECRET, {expiresIn:"2h"}));')
echo "toklen=${#TOKEN}"
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -4; }
echo '=== page ==='
curl -sS -D - -o /tmp/cz.html "http://127.0.0.1:5000/api/guest-lists/$ITEM/customize-portaria?token=$TOKEN" | hdr
python3 -c "h=open('/tmp/cz.html',encoding='utf-8',errors='replace').read(); print('ok','Personalizar' in h, 'err','Server Error' in h, 'len',len(h))"
echo '=== save ==='
curl -sS -D - -o /tmp/czs.json -X PUT "http://127.0.0.1:5000/api/guest-lists/$ITEM/customize-portaria?token=$TOKEN" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"primary_color":"#FFC700","portaria_subtitle":"Smoke Laravel portaria"}' | hdr
python3 -c "import json; print(json.load(open('/tmp/czs.json')))"
echo '=== confirmacao ==='
curl -sS -o /tmp/cc.html -w '%{http_code}\n' "http://127.0.0.1:5000/api/guest-lists/$ITEM/customize-confirmacao?token=$TOKEN"
python3 -c "h=open('/tmp/cc.html',encoding='utf-8',errors='replace').read(); print('conf','Personalizar' in h, len(h))"
echo '=== inscricao ==='
curl -sS -o /tmp/ci.html -w '%{http_code}\n' "http://127.0.0.1:5000/api/guest-lists/$ITEM/customize-inscricao?token=$TOKEN"
python3 -c "h=open('/tmp/ci.html',encoding='utf-8',errors='replace').read(); print('insc','Personalizar' in h, len(h), h[:160].replace(chr(10),' '))"
# ensure laravel has JWT_SECRET
docker exec conectaking-laravel printenv JWT_SECRET | wc -c
echo DONE
