#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5; }
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | head -n1 | tr -d '[:space:]')
PID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_photos WHERE gallery_id=${GID} ORDER BY id DESC LIMIT 1;" | head -n1 | tr -d '[:space:]')
echo "gid=$GID pid=$PID"

echo '=== face-process-status ==='
curl -sS -D - -o /tmp/fps.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/face-process-status" -H "$AUTH" | hdr
python3 -c "import json;o=json.load(open('/tmp/fps.json')); print(o); assert o.get('success') and 'jobs' in o"

echo '=== face-results ==='
curl -sS -D - -o /tmp/fr.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/face-results?limit=5" -H "$AUTH" | hdr
python3 -c "import json;o=json.load(open('/tmp/fr.json')); print('photos',len(o.get('photos') or [])); assert o.get('success')"

echo '=== face-detail ==='
curl -sS -D - -o /tmp/fd.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/photos/${PID}/face-detail" -H "$AUTH" | hdr
python3 -c "import json;o=json.load(open('/tmp/fd.json')); print(o.get('processStatus'), 'faces', len(o.get('faces') or [])); assert o.get('success')"

echo '=== auto-separate-job ==='
curl -sS -D - -o /tmp/asj.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/folders/auto-separate-job" -H "$AUTH" | hdr
python3 -c "import json;o=json.load(open('/tmp/asj.json')); print(o); assert o.get('success')"

echo '=== auto-separate-jobs ==='
curl -sS -D - -o /tmp/asjs.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/folders/auto-separate-jobs" -H "$AUTH" | hdr
python3 -c "import json;o=json.load(open('/tmp/asjs.json')); print('jobs',len(o.get('jobs') or [])); assert o.get('success')"
echo DONE
