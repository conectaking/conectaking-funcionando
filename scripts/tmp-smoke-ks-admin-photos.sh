#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5; }
curl -sS -o /tmp/tok.json -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}"
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/tok.json'))['token'])")
AUTH="Authorization: Bearer $TOKEN"
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
PID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_photos WHERE gallery_id=${GID} ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
if [ -z "$PID" ] || [ "$PID" = "0" ]; then
  PID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "INSERT INTO king_photos (gallery_id, file_path, original_name, \"order\") VALUES (${GID}, 'r2:galleries/${GID}/smoke/placeholder.jpg', 'placeholder.jpg', 0) RETURNING id;" | tr -d '[:space:]')
fi
FID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_photo_folders WHERE gallery_id=${GID} ORDER BY id ASC LIMIT 1;" | tr -d '[:space:]')
echo "gid=$GID pid=$PID fid=$FID"

echo '=== PATCH photo (favorite) ==='
curl -sS -D - -o /tmp/pp.json -X PATCH "http://127.0.0.1:5000/api/king-selection/photos/${PID}" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{"is_favorite":true}' | hdr
python3 -c "import json;o=json.load(open('/tmp/pp.json')); print(o); assert o.get('success')"

echo '=== watermark-suggest-scales ==='
curl -sS -D - -o /tmp/ws.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/watermark-suggest-scales?mode=fill" -H "$AUTH" | hdr
python3 -c "import json;o=json.load(open('/tmp/ws.json')); print(o); assert o.get('success') and o.get('watermark_scale_portrait')"

echo '=== admin preview ==='
CODE=$(curl -sS -o /tmp/ap.bin -w '%{http_code}' "http://127.0.0.1:5000/api/king-selection/photos/${PID}/preview?wm_mode=none&max=400" -H "$AUTH")
ENG=$(curl -sS -D - -o /dev/null "http://127.0.0.1:5000/api/king-selection/photos/${PID}/preview?wm_mode=none&max=400" -H "$AUTH" | tr -d '\r' | grep -i 'x-conecta-engine' | head -1)
echo "preview_http=$CODE $ENG"
python3 -c "code=int('$CODE'); assert code in (200,404,502), code; print('preview_ok', code)"

echo '=== admin download ==='
CODE=$(curl -sS -o /tmp/ad.bin -w '%{http_code}' "http://127.0.0.1:5000/api/king-selection/photos/${PID}/download" -H "$AUTH")
ENG=$(curl -sS -D - -o /dev/null "http://127.0.0.1:5000/api/king-selection/photos/${PID}/download" -H "$AUTH" | tr -d '\r' | grep -i 'x-conecta-engine' | head -1)
echo "download_http=$CODE $ENG"
python3 -c "code=int('$CODE'); assert code in (200,404,500,502), code; print('download_ok', code)"


echo '=== replace validation ==='
curl -sS -D - -o /tmp/rr.json -X POST "http://127.0.0.1:5000/api/king-selection/photos/${PID}/replace-r2" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{}' | hdr
python3 -c "import json;o=json.load(open('/tmp/rr.json')); print(o); assert 'photoId' in o.get('message','') or 'obrigat' in o.get('message','').lower()"

if [ -n "$FID" ] && [ "$FID" != "0" ]; then
  echo '=== PATCH folder ==='
  curl -sS -D - -o /tmp/uf.json -X PATCH "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/folders/${FID}" \
    -H "$AUTH" -H 'Content-Type: application/json' -d '{"name":"Smoke Pasta"}' | hdr
  python3 -c "import json;o=json.load(open('/tmp/uf.json')); print('folders',len(o.get('folders') or [])); assert o.get('success')"
fi

echo '=== DELETE photo (temp) ==='
TMP=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "INSERT INTO king_photos (gallery_id, file_path, original_name, \"order\") VALUES (${GID}, 'r2:galleries/${GID}/smoke/tmp-del.jpg', 'tmp-del.jpg', 9999) RETURNING id;" | head -n1 | tr -d '[:space:]')
echo "TMP=[$TMP]"
echo "$TMP" | grep -Eq '^[0-9]+$'
curl -sS -D - -o /tmp/dp.json -X DELETE "http://127.0.0.1:5000/api/king-selection/photos/${TMP}" -H "$AUTH" | hdr
python3 -c "import json;o=json.load(open('/tmp/dp.json')); print(o); assert o.get('success')"
echo DONE
