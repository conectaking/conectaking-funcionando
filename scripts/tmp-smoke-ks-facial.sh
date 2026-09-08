#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
showh(){ tr -d '\r' <"$1" | grep -iE 'HTTP/|x-conecta' | head -5; }

GID=6
echo "=== facial/status galleryId=$GID ==="
curl -sS -D /tmp/hfs.txt -o /tmp/fs.json "http://127.0.0.1:5000/api/king-selection/facial/status?galleryId=$GID" -H "$AUTH"
showh /tmp/hfs.txt
python3 -c "import json;o=json.load(open('/tmp/fs.json')); print(o.get('success'), o.get('totalPhotos'), o.get('rekogOnDemand')); assert o.get('success')"

echo '=== facial/progress ==='
curl -sS -D /tmp/hfp.txt -o /tmp/fp.json "http://127.0.0.1:5000/api/king-selection/facial/progress?galleryId=$GID" -H "$AUTH"
showh /tmp/hfp.txt
python3 -c "import json;o=json.load(open('/tmp/fp.json')); print(o.get('success'), o.get('pct')); assert o.get('success')"

echo '=== facial/clients ==='
curl -sS -D /tmp/hfc.txt -o /tmp/fc.json "http://127.0.0.1:5000/api/king-selection/facial/clients?galleryId=$GID" -H "$AUTH"
showh /tmp/hfc.txt
python3 -c "import json;o=json.load(open('/tmp/fc.json')); print('clients', len(o.get('clients') or [])); assert o.get('success')"

echo '=== facial/jobs ==='
curl -sS -D /tmp/hfj.txt -o /tmp/fj.json "http://127.0.0.1:5000/api/king-selection/facial/jobs?galleryId=$GID&limit=5" -H "$AUTH"
showh /tmp/hfj.txt
python3 -c "import json;o=json.load(open('/tmp/fj.json')); print('jobs', len(o.get('jobs') or [])); assert o.get('success')"

echo '=== facial/diagnose ==='
curl -sS -D /tmp/hfd.txt -o /tmp/fd.json "http://127.0.0.1:5000/api/king-selection/facial/diagnose?galleryId=$GID" -H "$AUTH"
showh /tmp/hfd.txt
python3 -c "import json;o=json.load(open('/tmp/fd.json')); print(o.get('success'), o.get('rekogEnabled')); assert o.get('success') and 'tables' in o"

echo '=== aws-check ==='
curl -sS -D /tmp/hac.txt -o /tmp/ac.json "http://127.0.0.1:5000/api/king-selection/aws-check" -H "$AUTH"
showh /tmp/hac.txt
python3 -c "import json;o=json.load(open('/tmp/ac.json')); print('rekog', (o.get('rekog') or {}).get('enabled')); assert 's3' in o and 'rekog' in o"

echo '=== public/aws-ping ==='
curl -sS -D /tmp/hap.txt -o /tmp/ap.json "http://127.0.0.1:5000/api/king-selection/public/aws-ping"
showh /tmp/hap.txt
python3 -c "import json;o=json.load(open('/tmp/ap.json')); print(o.get('success'), o.get('rekog')); assert o.get('success')"

echo DONE_FACIAL_PANEL
