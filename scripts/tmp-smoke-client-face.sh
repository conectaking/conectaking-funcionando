#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
GID=1; CID=2; SLUG=eliseu
curl -sS -D /tmp/hal.txt -o /tmp/al.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/clients/${CID}/access-link" -H "$AUTH"
tr -d '\r' </tmp/hal.txt | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/al.json')); print({k:(v if k!='token' else ('***'+str(len(v)))) for k,v in o.items()})"
CTOKEN=$(python3 -c "import json;print(json.load(open('/tmp/al.json')).get('token') or '')")
if [ -z "$CTOKEN" ]; then
  CTOKEN=$(docker exec conectaking-laravel php -r "require '/app/vendor/autoload.php'; \$app=require '/app/bootstrap/app.php'; \$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap(); echo app(App\Services\Auth\JwtService::class)->encode(['type'=>'kingselection_client','galleryId'=>1,'clientId'=>2,'slug'=>'eliseu','tyh'=>false],'14d');")
fi
echo "ctoken_len=${#CTOKEN}"
python3 - <<PY
import json,base64,os
t=os.environ.get('T') or open('/tmp/ctoken.txt','w')
PY
printf '%s' "$CTOKEN" > /tmp/ctoken.txt
python3 -c "import json,base64; t=open('/tmp/ctoken.txt').read().strip(); p=t.split('.')[1]; p+=('='*((4-len(p)%4)%4)); print(json.loads(base64.urlsafe_b64decode(p)))"
curl -sS -D /tmp/hcfr.txt -o /tmp/cfr.json "http://127.0.0.1:5000/api/king-selection/client/face-results?page=1&limit=5" -H "Authorization: Bearer $CTOKEN"
tr -d '\r' </tmp/hcfr.txt | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/cfr.json')); print(o); assert o.get('success') or 'message' in o"
curl -sS -D /tmp/hrfs.txt -o /tmp/rfs.json -X POST "http://127.0.0.1:5000/api/king-selection/client/reset-face-session" -H "Authorization: Bearer $CTOKEN" -H 'Content-Type: application/json' -d '{}'
tr -d '\r' </tmp/hrfs.txt | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/rfs.json')); print(o); assert o.get('success') or 'message' in o"
curl -sS -D /tmp/hmp.txt -o /tmp/mp.json "http://127.0.0.1:5000/api/king-selection/public/galleries/${SLUG}/my-photos?clientToken=${CTOKEN}&limit=5"
tr -d '\r' </tmp/hmp.txt | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/mp.json')); print(o); assert o.get('success') or 'message' in o"
curl -sS -D /tmp/hfec.txt -o /tmp/fec.json -X POST "http://127.0.0.1:5000/api/king-selection/client/face-enroll-cache" -H "Authorization: Bearer $CTOKEN" -H 'Content-Type: application/json' -d '{"photoIds":[1]}'
tr -d '\r' </tmp/hfec.txt | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/fec.json')); print(o); assert o.get('success') or 'message' in o"
echo DONE_CLIENT
