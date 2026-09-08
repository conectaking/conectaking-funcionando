#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
TMP=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "INSERT INTO king_photos (gallery_id, file_path, original_name, \"order\") VALUES (${GID}, 'r2:galleries/${GID}/smoke/tmp-del4.jpg', 'tmp-del4.jpg', 9996) RETURNING id;" | head -n1 | tr -d '[:space:]')
echo "TMP=[$TMP]"
test -n "$TMP" && echo "$TMP" | grep -Eq '^[0-9]+$'
curl -sS -D - -o /tmp/dp4.json -X DELETE "http://127.0.0.1:5000/api/king-selection/photos/${TMP}" -H "$AUTH" | tr -d '\r' | grep -iE 'HTTP/|x-conecta|content-type'
echo BODY:$(cat /tmp/dp4.json)
python3 -c "import json;o=json.load(open('/tmp/dp4.json')); assert o.get('success'); print('engine_ok')"
PID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_photos WHERE gallery_id=${GID} ORDER BY id DESC LIMIT 1;" | head -n1 | tr -d '[:space:]')
curl -sS -D - -o /tmp/ap2.bin "http://127.0.0.1:5000/api/king-selection/photos/${PID}/preview?wm_mode=none&max=400" -H "$AUTH" | tr -d '\r' | grep -iE 'HTTP/|x-conecta|content-type' | head -6
echo DONE
