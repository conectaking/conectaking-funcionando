#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
showh(){ tr -d '\r' <"$1" | grep -iE 'HTTP/|x-conecta' | head -5; }

echo '=== health laravel direct ==='
curl -sS -D /tmp/hh.txt -o /tmp/h.json http://127.0.0.1:8080/health
showh /tmp/hh.txt
python3 -c "import json;o=json.load(open('/tmp/h.json')); print(o); assert o.get('engine')=='laravel'"

echo '=== health via node proxy ==='
curl -sS -D /tmp/hh2.txt -o /tmp/h2.json http://127.0.0.1:5000/health
showh /tmp/hh2.txt
# pode ser node ou laravel conforme proxy; aceitar 200

echo '=== password/forgot (sem revelar) ==='
curl -sS -D /tmp/hp.txt -o /tmp/p.json -X POST http://127.0.0.1:5000/api/password/forgot \
  -H 'Content-Type: application/json' \
  -d '{"email":"naoexiste-smoke@conectaking.invalid"}'
showh /tmp/hp.txt
python3 -c "import json;o=json.load(open('/tmp/p.json')); print(o.get('success'), o.get('message','')[:60]); assert 'message' in o"

echo '=== kingSelection via laravel mount ==='
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8080/kingSelection
curl -sS -D /tmp/hks.txt -o /tmp/ks.html http://127.0.0.1:5000/kingSelection
showh /tmp/hks.txt
python3 -c "t=open('/tmp/ks.html',encoding='utf-8',errors='ignore').read(); print('len',len(t)); assert len(t)>500"

echo DONE_EDGE_PASSWORD
