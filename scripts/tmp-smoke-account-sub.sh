#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
showh(){ tr -d '\r' <"$1" | grep -iE 'HTTP/|x-conecta' | head -5; }

echo '=== account/status ==='
curl -sS -D /tmp/has.txt -o /tmp/as.json http://127.0.0.1:5000/api/account/status -H "$AUTH"
showh /tmp/has.txt
python3 -c "import json;o=json.load(open('/tmp/as.json')); print(o.get('email'), o.get('plan_code'), o.get('hasKingSelection')); assert o.get('email') and o.get('plan_code')"

echo '=== account/details ==='
curl -sS -D /tmp/had.txt -o /tmp/ad.json http://127.0.0.1:5000/api/account/details -H "$AUTH"
showh /tmp/had.txt
python3 -c "import json;o=json.load(open('/tmp/ad.json')); print(o.get('email')); assert o.get('id')"

echo '=== subscription/info ==='
curl -sS -D /tmp/hsi.txt -o /tmp/si.json http://127.0.0.1:5000/api/subscription/info -H "$AUTH"
showh /tmp/hsi.txt
python3 -c "import json;o=json.load(open('/tmp/si.json')); print((o.get('user') or {}).get('email'), bool(o.get('availablePlans'))); assert o.get('user')"

echo '=== subscription/plans-public ==='
curl -sS -D /tmp/hsp.txt -o /tmp/sp.json http://127.0.0.1:5000/api/subscription/plans-public
showh /tmp/hsp.txt
python3 -c "import json;o=json.load(open('/tmp/sp.json')); print(o.get('success'), len(o.get('plans') or [])); assert o.get('success')"

echo '=== link-limits/user ==='
curl -sS -D /tmp/hll.txt -o /tmp/ll.json http://127.0.0.1:5000/api/link-limits/user -H "$AUTH"
showh /tmp/hll.txt
python3 -c "import json;o=json.load(open('/tmp/ll.json')); print(o.get('success'), type(o.get('data')).__name__); assert o.get('success')"

echo '=== auth/register invalid code ==='
curl -sS -D /tmp/hrg.txt -o /tmp/rg.json -X POST http://127.0.0.1:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke-reg@test.invalid","password":"Abc123","registrationCode":"INVALID-SMOKE"}'
showh /tmp/hrg.txt
python3 -c "import json;o=json.load(open('/tmp/rg.json')); print(o); assert o.get('success') is False or 'inválido' in str(o.get('message','')).lower() or 'invalido' in str(o.get('message','')).lower()"

echo DONE_ACCOUNT_SUB
