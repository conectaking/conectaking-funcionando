#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"
showh(){ tr -d '\r' <"$1" | grep -iE 'HTTP/|x-conecta' | head -5; }

echo '=== create list for export ==='
curl -sS -D /tmp/hxc.txt -o /tmp/xc.json -X POST http://127.0.0.1:5000/api/guest-lists \
  -H "$AUTH" -H "$CT" \
  -d '{"title":"Smoke Export PDF","event_title":"Evento Export","max_guests":5}'
showh /tmp/hxc.txt
GID=$(python3 -c "import json;o=json.load(open('/tmp/xc.json')); print(o.get('id') or o.get('profile_item_id') or ''); assert o.get('id') or o.get('guest_list_item_id'), o")
echo "gid=$GID"

curl -sS -X POST "http://127.0.0.1:5000/api/guest-lists/${GID}/guests" \
  -H "$AUTH" -H "$CT" \
  -d '{"name":"Ana Export","email":"ana@test.local"}' >/tmp/xg.json
python3 -c "import json;o=json.load(open('/tmp/xg.json')); assert o.get('id'), o"

echo '=== GET export/pdf ==='
curl -sS -D /tmp/hxp.txt -o /tmp/xp.json "http://127.0.0.1:5000/api/guest-lists/${GID}/export/pdf" -H "$AUTH"
showh /tmp/hxp.txt
python3 -c "import json;o=json.load(open('/tmp/xp.json')); print(o.get('success'), o.get('event_title'), o.get('total')); assert o.get('success') and o.get('total')>=1 and 'guests' in o"

echo '=== KS galleries?itemId=3 (alias) ==='
curl -sS -D /tmp/hki.txt -o /tmp/ki.json "http://127.0.0.1:5000/api/king-selection/galleries?itemId=3" -H "$AUTH"
showh /tmp/hki.txt
python3 -c "import json;o=json.load(open('/tmp/ki.json')); print('galleries', len(o.get('galleries') or [])); assert o.get('success') is True or 'galleries' in o"

echo '=== cleanup ==='
curl -sS -X DELETE "http://127.0.0.1:5000/api/guest-lists/${GID}" -H "$AUTH" >/dev/null
echo DONE_GL_EXPORT_KS_ALIAS
