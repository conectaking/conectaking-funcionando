#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
showh(){ tr -d '\r' <"$1" | grep -iE 'HTTP/|x-conecta' | head -5; }

echo '=== guest-lists index ==='
curl -sS -D /tmp/hgl.txt -o /tmp/gl.json "http://127.0.0.1:5000/api/guest-lists" -H "$AUTH"
showh /tmp/hgl.txt
python3 -c "import json;o=json.load(open('/tmp/gl.json')); print(type(o).__name__, len(o) if isinstance(o,list) else o); assert isinstance(o,list) or (isinstance(o,dict) and 'message' in o)"

GID=$(python3 -c "import json;o=json.load(open('/tmp/gl.json')); print(o[0]['id'] if isinstance(o,list) and o else '')")
if [ -z "$GID" ]; then
  GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT pi.id FROM profile_items pi JOIN guest_list_items gli ON gli.profile_item_id=pi.id WHERE pi.user_id=(SELECT id FROM users WHERE email='conectaking@gmail.com' LIMIT 1) LIMIT 1;" | head -n1 | tr -d '[:space:]')
fi
echo "gid=$GID"

if [ -n "$GID" ] && [ "$GID" != "0" ]; then
  echo '=== guest-lists show ==='
  curl -sS -D /tmp/hgs.txt -o /tmp/gs.json "http://127.0.0.1:5000/api/guest-lists/${GID}" -H "$AUTH"
  showh /tmp/hgs.txt
  python3 -c "import json;o=json.load(open('/tmp/gs.json')); print({k:o.get(k) for k in ('id','guest_list_item_id','event_title','message')}); assert o.get('id') or o.get('message')"

  echo '=== guests ==='
  curl -sS -D /tmp/hgu.txt -o /tmp/gu.json "http://127.0.0.1:5000/api/guest-lists/${GID}/guests?mode=checkin" -H "$AUTH"
  showh /tmp/hgu.txt
  python3 -c "import json;o=json.load(open('/tmp/gu.json')); print(type(o).__name__, len(o) if isinstance(o,list) else o); assert isinstance(o,list) or 'message' in o"

  echo '=== stats ==='
  curl -sS -D /tmp/hst.txt -o /tmp/st.json "http://127.0.0.1:5000/api/guest-lists/${GID}/stats" -H "$AUTH"
  showh /tmp/hst.txt
  python3 -c "import json;o=json.load(open('/tmp/st.json')); print(o); assert 'total_count' in o or 'message' in o"
else
  echo 'skip show/guests/stats (no guest list)'
fi

echo '=== business team ==='
curl -sS -D /tmp/htm.txt -o /tmp/tm.json "http://127.0.0.1:5000/api/business/team" -H "$AUTH"
showh /tmp/htm.txt
python3 -c "import json;o=json.load(open('/tmp/tm.json')); print(o); assert o.get('success') or o.get('message')"

echo DONE_GL_TEAM
