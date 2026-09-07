#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
# sync proxy from repo if present in tarball root — middleware is outside laravel/
# (middleware deployed via api rebuild from git checkout or separate copy)

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 10

TOKEN=$(docker exec conectaking-api node -e "const jwt=require('jsonwebtoken');process.stdout.write(jwt.sign({userId:'seed-admin-FNpGSFmV2bHm',email:'test@local'}, process.env.JWT_SECRET, {expiresIn:'1h'}));")
AUTH="Authorization: Bearer $TOKEN"

hdr() { tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5; }

echo "=== POST link (base) ==="
curl -sS -D - -o /tmp/created.json -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  --data '{"item_type":"link","title":"Typed Base","destination_url":"https://example.com"}' \
  'http://127.0.0.1:5000/api/profile/items' | hdr
LINK_ID=$(python3 -c "import json;print(json.load(open('/tmp/created.json')).get('id',''))")
echo "link_id=$LINK_ID"

echo "=== PUT typed link ==="
curl -sS -D - -o /tmp/link.json -X PUT -H "$AUTH" -H 'Content-Type: application/json' \
  --data '{"title":"Typed Link OK","destination_url":"https://example.org","icon_class":"fab fa-instagram"}' \
  "http://127.0.0.1:5000/api/profile/items/link/$LINK_ID" | hdr
python3 -c "import json;o=json.load(open('/tmp/link.json'));print({k:o.get(k) for k in ['id','title','item_type','destination_url']})"

echo "=== POST banner ==="
curl -sS -D - -o /tmp/ban.json -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  --data '{"item_type":"banner","title":"Banner T"}' \
  'http://127.0.0.1:5000/api/profile/items' | hdr
BAN_ID=$(python3 -c "import json;print(json.load(open('/tmp/ban.json')).get('id',''))")
echo "ban_id=$BAN_ID"

echo "=== PUT typed banner ==="
curl -sS -D - -o /tmp/ban2.json -X PUT -H "$AUTH" -H 'Content-Type: application/json' \
  --data '{"title":"Banner OK","destination_url":"https://example.com","aspect_ratio":"16:9","is_active":true}' \
  "http://127.0.0.1:5000/api/profile/items/banner/$BAN_ID" | hdr
python3 -c "import json;o=json.load(open('/tmp/ban2.json'));print({k:o.get(k) for k in ['id','title','item_type','aspect_ratio']})"

echo "=== POST pix ==="
curl -sS -D - -o /tmp/pix.json -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  --data '{"item_type":"pix","title":"PIX T"}' \
  'http://127.0.0.1:5000/api/profile/items' | hdr
PIX_ID=$(python3 -c "import json;print(json.load(open('/tmp/pix.json')).get('id',''))")
echo "pix_id=$PIX_ID"

echo "=== PUT typed pix ==="
curl -sS -D - -o /tmp/pix2.json -X PUT -H "$AUTH" -H 'Content-Type: application/json' \
  --data '{"title":"PIX OK","pix_key":"teste@pix.com","recipient_name":"Teste","pix_amount":10.5}' \
  "http://127.0.0.1:5000/api/profile/items/pix/$PIX_ID" | hdr
python3 -c "import json;o=json.load(open('/tmp/pix2.json'));print({k:o.get(k) for k in ['id','title','pix_key','recipient_name','pix_amount']})"

echo "=== POST digital_form ==="
curl -sS -D - -o /tmp/df.json -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  --data '{"item_type":"digital_form","title":"Form T"}' \
  'http://127.0.0.1:5000/api/profile/items' | hdr
DF_ID=$(python3 -c "import json;print(json.load(open('/tmp/df.json')).get('id',''))")
echo "df_id=$DF_ID"

echo "=== PUT typed digital_form ==="
curl -sS -D - -o /tmp/df2.json -X PUT -H "$AUTH" -H 'Content-Type: application/json' \
  --data '{"title":"Form OK","form_title":"Formulário Smoke","primary_color":"#112233","form_fields":[{"id":"f1","label":"Nome","type":"text"}]}' \
  "http://127.0.0.1:5000/api/profile/items/digital_form/$DF_ID" | hdr
python3 -c "import json;o=json.load(open('/tmp/df2.json'));d=o.get('digital_form_data') or {};print({'id':o.get('id'),'title':o.get('title'),'form_title':d.get('form_title'),'primary':d.get('primary_color'),'fields':len(d.get('form_fields') or [])})"

echo "=== duplicate link ==="
curl -sS -D - -o /tmp/dup.json -X POST -H "$AUTH" \
  "http://127.0.0.1:5000/api/profile/items/$LINK_ID/duplicate" | hdr
DUP_ID=$(python3 -c "import json;print(json.load(open('/tmp/dup.json')).get('id',''))")
echo "dup_id=$DUP_ID"

echo "=== avatar-format ==="
curl -sS -D - -o /tmp/av.json -X PUT -H "$AUTH" -H 'Content-Type: application/json' \
  --data '{"avatar_format":"square-full"}' \
  'http://127.0.0.1:5000/api/profile/avatar-format' | hdr
cat /tmp/av.json; echo

echo "=== share-image (null clear) ==="
curl -sS -D - -o /tmp/sh.json -X PUT -H "$AUTH" -H 'Content-Type: application/json' \
  --data '{"share_image_url":null}' \
  'http://127.0.0.1:5000/api/profile/share-image' | hdr
cat /tmp/sh.json; echo

echo "=== cleanup ==="
for id in $LINK_ID $BAN_ID $PIX_ID $DF_ID $DUP_ID; do
  [ -n "$id" ] && curl -sS -X DELETE -H "$AUTH" "http://127.0.0.1:5000/api/profile/items/$id" >/dev/null || true
done
# restore avatar
curl -sS -X PUT -H "$AUTH" -H 'Content-Type: application/json' \
  --data '{"avatar_format":"circular"}' \
  'http://127.0.0.1:5000/api/profile/avatar-format' >/dev/null || true
echo DONE
