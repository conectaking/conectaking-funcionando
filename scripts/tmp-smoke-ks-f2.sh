#!/bin/bash
set -e
# cleanup leftover smoke rows
docker exec conectaking-db psql -U conectaking -d conectaking -v ON_ERROR_STOP=1 -c "DELETE FROM king_selections WHERE photo_id IN (SELECT id FROM king_photos WHERE original_name='f2-smoke.jpg'); DELETE FROM king_photos WHERE original_name='f2-smoke.jpg';"

GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries WHERE lower(slug)='eliseu' LIMIT 1;" | tr -d '[:space:]')
test -n "$GID"

docker exec conectaking-db psql -U conectaking -d conectaking -v ON_ERROR_STOP=1 -c "INSERT INTO king_photos (gallery_id, original_name, \"order\", file_path) VALUES ($GID, 'f2-smoke.jpg', 9999, '/tmp/f2-smoke.jpg');"
PID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_photos WHERE original_name='f2-smoke.jpg' AND gallery_id=$GID ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
echo "gallery=$GID photo=$PID"
[[ "$PID" =~ ^[0-9]+$ ]]

cleanup() {
  docker exec conectaking-db psql -U conectaking -d conectaking -c "DELETE FROM king_selections WHERE photo_id=$PID; DELETE FROM king_photos WHERE id=$PID;" >/dev/null 2>&1 || true
}
trap cleanup EXIT

hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5; }

echo '=== signup-enter ==='
curl -sS -D - -o /tmp/f2tok.json -X POST http://127.0.0.1:5000/api/king-selection/client/signup-enter \
  -H 'Content-Type: application/json' -d '{"slug":"eliseu"}' | hdr
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/f2tok.json')).get('token') or '')")
echo "token_len=${#TOKEN}"
test -n "$TOKEN"

echo '=== select ==='
curl -sS -D - -o /tmp/f2sel.json -X POST http://127.0.0.1:5000/api/king-selection/client/select \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"slug\":\"eliseu\",\"photo_id\":$PID}" | hdr
cat /tmp/f2sel.json; echo
python3 -c "import json;o=json.load(open('/tmp/f2sel.json'));print(o); assert o.get('success') and o.get('selected') is True"

echo '=== gallery ==='
curl -sS -D - -o /tmp/f2gal.json "http://127.0.0.1:5000/api/king-selection/client/gallery?slug=eliseu" \
  -H "Authorization: Bearer $TOKEN" | hdr
python3 -c "import json;o=json.load(open('/tmp/f2gal.json'));g=o.get('gallery') or {}; ids=o.get('selectedPhotoIds') or []; print('locked',g.get('locked'),'selected',ids,'deferred',g.get('deferredSignupActive')); assert int('$PID') in [int(x) for x in ids]"

echo '=== select toggle off ==='
curl -sS -D - -o /tmp/f2sel2.json -X POST http://127.0.0.1:5000/api/king-selection/client/select \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"slug\":\"eliseu\",\"photo_id\":$PID}" | hdr
python3 -c "import json;o=json.load(open('/tmp/f2sel2.json'));print(o); assert o.get('selected') is False"

echo '=== select-bulk ==='
curl -sS -D - -o /tmp/f2bulk.json -X POST http://127.0.0.1:5000/api/king-selection/client/select-bulk \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"slug\":\"eliseu\",\"mode\":\"select\",\"photo_ids\":[$PID]}" | hdr
python3 -c "import json;o=json.load(open('/tmp/f2bulk.json'));print(o); assert o.get('success')"

echo '=== select-bulk unselect ==='
curl -sS -D - -o /tmp/f2bulk2.json -X POST http://127.0.0.1:5000/api/king-selection/client/select-bulk \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"slug\":\"eliseu\",\"mode\":\"unselect\",\"photo_ids\":[$PID]}" | hdr
python3 -c "import json;o=json.load(open('/tmp/f2bulk2.json'));print(o); assert o.get('success')"

echo '=== finalize missing fields ==='
curl -sS -D - -o /tmp/f2fin.json -X POST http://127.0.0.1:5000/api/king-selection/client/finalize \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"slug":"eliseu"}' | hdr
python3 -c "import json;o=json.load(open('/tmp/f2fin.json'));print(o); m=(o.get('message') or '').lower(); assert 'nome' in m or 'email' in m or 'telefone' in m"

echo DONE
