#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
eng(){ tr -d '\r' <"$1" | grep -iE 'HTTP/|x-conecta' | head -4; }

echo '=== ocr-info ==='
curl -sS -D /tmp/ho.txt -o /tmp/o.json http://127.0.0.1:5000/api/documentos/ocr-info
eng /tmp/ho.txt
python3 -c "import json;o=json.load(open('/tmp/o.json')); d=o.get('data') or o; print(d); assert 'openAiAvailable' in d"

echo '=== warm-ocr ==='
curl -sS -D /tmp/hw.txt -o /tmp/w.json http://127.0.0.1:5000/api/documentos/warm-ocr
eng /tmp/hw.txt
python3 -c "import json;o=json.load(open('/tmp/w.json')); print(o.get('data') or o)"

echo '=== og-image ==='
curl -sS -D /tmp/hog.txt -o /tmp/og.jpg -w '%{http_code}\n' http://127.0.0.1:5000/og-image.jpg
eng /tmp/hog.txt
python3 -c "b=open('/tmp/og.jpg','rb').read(2); print('jpeg', b==b'\\xff\\xd8')"

echo '=== link-preview-config ==='
curl -sS -D /tmp/hlp.txt -o /tmp/lp.json http://127.0.0.1:5000/api/admin/link-preview-config -H "$AUTH"
eng /tmp/hlp.txt
python3 -c "import json;o=json.load(open('/tmp/lp.json')); print(o.get('success'), bool(o.get('config') or o.get('data')))"

echo '=== image profile ==='
curl -sS -D /tmp/him.txt -o /tmp/im.jpg 'http://127.0.0.1:5000/api/image/profile-image?name=Test'
eng /tmp/him.txt

echo '=== checkout config (expect auth) ==='
curl -sS -D /tmp/hc.txt -o /tmp/c.json http://127.0.0.1:5000/api/checkout/config -H "$AUTH"
eng /tmp/hc.txt
python3 -c "import json;print(open('/tmp/c.json').read()[:240])"

echo '=== documentos list ==='
curl -sS -D /tmp/hdl.txt -o /tmp/dl.json http://127.0.0.1:5000/api/documentos -H "$AUTH"
eng /tmp/hdl.txt
python3 -c "import json;o=json.load(open('/tmp/dl.json')); assert o.get('success') is True"

echo '=== suggestions ==='
curl -sS -D /tmp/hsu.txt -o /tmp/su.json -X POST http://127.0.0.1:5000/api/suggestions/generate -H "$AUTH" -H 'Content-Type: application/json' -d '{}'
eng /tmp/hsu.txt
python3 -c "import json;print(open('/tmp/su.json').read()[:200])"

echo DONE_BATCH2
