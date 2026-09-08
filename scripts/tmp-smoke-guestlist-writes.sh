#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"
showh(){ tr -d '\r' <"$1" | grep -iE 'HTTP/|x-conecta' | head -5; }

echo '=== POST create list ==='
curl -sS -D /tmp/hwc.txt -o /tmp/wc.json -X POST http://127.0.0.1:5000/api/guest-lists \
  -H "$AUTH" -H "$CT" \
  -d '{"title":"Smoke GL Write","event_title":"Smoke Event","max_guests":10}'
showh /tmp/hwc.txt
GID=$(python3 -c "import json;o=json.load(open('/tmp/wc.json')); print(o.get('id') or o.get('profile_item_id') or ''); assert o.get('id') or o.get('guest_list_item_id'), o")
echo "gid=$GID"

echo '=== PUT update list ==='
curl -sS -D /tmp/hwu.txt -o /tmp/wu.json -X PUT "http://127.0.0.1:5000/api/guest-lists/${GID}" \
  -H "$AUTH" -H "$CT" \
  -d '{"event_title":"Smoke Event Updated","enable_whatsapp":true}'
showh /tmp/hwu.txt
python3 -c "import json;o=json.load(open('/tmp/wu.json')); print(o.get('event_title'), o.get('message')); assert o.get('event_title')=='Smoke Event Updated' or 'guest_list_data' in o"

echo '=== POST guest ==='
curl -sS -D /tmp/hwg.txt -o /tmp/wg.json -X POST "http://127.0.0.1:5000/api/guest-lists/${GID}/guests" \
  -H "$AUTH" -H "$CT" \
  -d '{"name":"Convidado Smoke","email":"smoke@test.local","whatsapp":"11999999999"}'
showh /tmp/hwg.txt
GUEST=$(python3 -c "import json;o=json.load(open('/tmp/wg.json')); print(o.get('id') or ''); assert o.get('id'), o")
echo "guest=$GUEST"

echo '=== PUT guest check-in ==='
curl -sS -D /tmp/hwgu.txt -o /tmp/wgu.json -X PUT "http://127.0.0.1:5000/api/guest-lists/${GID}/guests/${GUEST}" \
  -H "$AUTH" -H "$CT" \
  -d '{"status":"checked_in"}'
showh /tmp/hwgu.txt
python3 -c "import json;o=json.load(open('/tmp/wgu.json')); print(o.get('status')); assert o.get('status')=='checked_in'"

echo '=== POST generate-qr ==='
curl -sS -D /tmp/hwqr.txt -o /tmp/wqr.json -X POST "http://127.0.0.1:5000/api/guest-lists/${GID}/guests/${GUEST}/generate-qr" \
  -H "$AUTH"
showh /tmp/hwqr.txt
python3 -c "import json;o=json.load(open('/tmp/wqr.json')); print(o.get('success'), bool((o.get('guest') or {}).get('qr_token'))); assert o.get('success')"

echo '=== PUT reset-tokens ==='
curl -sS -D /tmp/hwrt.txt -o /tmp/wrt.json -X PUT "http://127.0.0.1:5000/api/guest-lists/${GID}/reset-tokens" \
  -H "$AUTH"
showh /tmp/hwrt.txt
python3 -c "import json;o=json.load(open('/tmp/wrt.json')); print(o.get('success'), list((o.get('tokens') or {}).keys())); assert o.get('success')"

echo '=== DELETE guest ==='
curl -sS -D /tmp/hwdg.txt -o /tmp/wdg.json -X DELETE "http://127.0.0.1:5000/api/guest-lists/${GID}/guests/${GUEST}" \
  -H "$AUTH"
showh /tmp/hwdg.txt
python3 -c "import json;o=json.load(open('/tmp/wdg.json')); print(o); assert o.get('success')"

echo '=== DELETE list ==='
curl -sS -D /tmp/hwdl.txt -o /tmp/wdl.json -X DELETE "http://127.0.0.1:5000/api/guest-lists/${GID}" \
  -H "$AUTH"
showh /tmp/hwdl.txt
python3 -c "import json;o=json.load(open('/tmp/wdl.json')); print(o); assert o.get('success')"

echo DONE_GL_WRITES
