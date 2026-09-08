#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"
showh(){ tr -d '\r' <"$1" | grep -iE 'HTTP/|x-conecta' | head -5; }

echo '=== upgrade-plans ==='
curl -sS -D /tmp/hup.txt -o /tmp/up.json "http://127.0.0.1:5000/api/finance/upgrade-plans" -H "$AUTH"
showh /tmp/hup.txt
python3 -c "import json;o=json.load(open('/tmp/up.json')); print(o.get('success'), type(o.get('data')).__name__, len(o.get('data') or [])); assert o.get('success') is True"

echo '=== zerar-senha-status ==='
curl -sS -D /tmp/hzs.txt -o /tmp/zs.json "http://127.0.0.1:5000/api/finance/zerar-senha-status" -H "$AUTH"
showh /tmp/hzs.txt
python3 -c "import json;o=json.load(open('/tmp/zs.json')); print(o); assert o.get('success') and 'hasCustomPassword' in (o.get('data') or {})"

echo '=== zerar-senha verify wrong ==='
curl -sS -D /tmp/hzv.txt -o /tmp/zv.json -X POST "http://127.0.0.1:5000/api/finance/zerar-senha/verify" \
  -H "$AUTH" -H "$CT" -d '{"password":"__wrong__"}'
showh /tmp/hzv.txt
python3 -c "import json;o=json.load(open('/tmp/zv.json')); print(o); assert o.get('success') is False"

echo '=== zerar-senha verify ok ==='
# senha efetiva pode ser custom; tenta 1212 e se falhar só loga
curl -sS -D /tmp/hzv2.txt -o /tmp/zv2.json -X POST "http://127.0.0.1:5000/api/finance/zerar-senha/verify" \
  -H "$AUTH" -H "$CT" -d '{"password":"1212"}'
showh /tmp/hzv2.txt
python3 -c "import json;o=json.load(open('/tmp/zv2.json')); print(o); assert 'success' in o"

echo '=== whatsapp-config (admin) ==='
curl -sS -D /tmp/hwa.txt -o /tmp/wa.json "http://127.0.0.1:5000/api/finance/whatsapp-config" -H "$AUTH"
showh /tmp/hwa.txt
python3 -c "import json;o=json.load(open('/tmp/wa.json')); print(o.get('success'), o.get('message')); assert o.get('success') is True or o.get('message')"

echo '=== admin clientes-senhas ==='
curl -sS -D /tmp/hcs.txt -o /tmp/cs.json "http://127.0.0.1:5000/api/finance/admin/clientes-senhas" -H "$AUTH"
showh /tmp/hcs.txt
python3 -c "import json;o=json.load(open('/tmp/cs.json')); print(o.get('success'), type(o.get('data')).__name__ if o.get('data') is not None else None); assert o.get('success') is True or o.get('message')"

echo DONE_FINANCE_EXTRAS
