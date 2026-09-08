#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
H='Content-Type: application/json'
showh(){ tr -d '\r' <"$1" | grep -iE 'HTTP/|x-conecta' | head -5; }

echo '=== categories GET ==='
curl -sS -D /tmp/hcat.txt -o /tmp/cat.json "http://127.0.0.1:5000/api/finance/categories" -H "$AUTH"
showh /tmp/hcat.txt
python3 -c "import json;o=json.load(open('/tmp/cat.json')); print('n',len(o.get('data') or [])); assert o.get('success')"

echo '=== accounts GET ==='
curl -sS -D /tmp/hacc.txt -o /tmp/acc.json "http://127.0.0.1:5000/api/finance/accounts" -H "$AUTH"
showh /tmp/hacc.txt
python3 -c "import json;o=json.load(open('/tmp/acc.json')); print('n',len(o.get('data') or [])); assert o.get('success')"

echo '=== goals GET ==='
curl -sS -D /tmp/hgo.txt -o /tmp/go.json "http://127.0.0.1:5000/api/finance/goals" -H "$AUTH"
showh /tmp/hgo.txt
python3 -c "import json;o=json.load(open('/tmp/go.json')); print('n',len(o.get('data') or [])); assert o.get('success')"

echo '=== create transaction ==='
TODAY=$(date -u +%F)
curl -sS -D /tmp/htx.txt -o /tmp/tx.json -X POST "http://127.0.0.1:5000/api/finance/transactions" -H "$AUTH" -H "$H" \
  -d "{\"type\":\"EXPENSE\",\"amount\":1.23,\"description\":\"smoke-laravel-tx\",\"transaction_date\":\"$TODAY\",\"status\":\"PENDING\"}"
showh /tmp/htx.txt
TXID=$(python3 -c "import json;o=json.load(open('/tmp/tx.json')); print((o.get('data') or {}).get('id') or ''); assert o.get('success'), o")
echo "txid=$TXID"

echo '=== get transaction ==='
curl -sS -D /tmp/htxg.txt -o /tmp/txg.json "http://127.0.0.1:5000/api/finance/transactions/${TXID}" -H "$AUTH"
showh /tmp/htxg.txt
python3 -c "import json;o=json.load(open('/tmp/txg.json')); assert o.get('success') and o['data']['id']==int('$TXID')"

echo '=== put transaction ==='
curl -sS -D /tmp/htxu.txt -o /tmp/txu.json -X PUT "http://127.0.0.1:5000/api/finance/transactions/${TXID}" -H "$AUTH" -H "$H" \
  -d '{"status":"PAID","amount":2.34}'
showh /tmp/htxu.txt
python3 -c "import json;o=json.load(open('/tmp/txu.json')); print(o.get('data',{}).get('status'), o.get('data',{}).get('amount')); assert o.get('success')"

echo '=== create card ==='
curl -sS -D /tmp/hcd.txt -o /tmp/cd.json -X POST "http://127.0.0.1:5000/api/finance/cards" -H "$AUTH" -H "$H" \
  -d '{"name":"Smoke Card Laravel","brand":"visa","limit_amount":1000,"closing_day":5,"due_day":12}'
showh /tmp/hcd.txt
CID=$(python3 -c "import json;o=json.load(open('/tmp/cd.json')); print((o.get('data') or {}).get('id') or ''); assert o.get('success'), o")
echo "cid=$CID"

echo '=== patch card ==='
curl -sS -D /tmp/hcp.txt -o /tmp/cp.json -X PATCH "http://127.0.0.1:5000/api/finance/cards/${CID}" -H "$AUTH" -H "$H" \
  -d '{"name":"Smoke Card Laravel 2","limit_amount":1500}'
showh /tmp/hcp.txt
python3 -c "import json;o=json.load(open('/tmp/cp.json')); print(o.get('data',{}).get('name')); assert o.get('success')"

echo '=== create goal ==='
curl -sS -D /tmp/hgoc.txt -o /tmp/goc.json -X POST "http://127.0.0.1:5000/api/finance/goals" -H "$AUTH" -H "$H" \
  -d '{"name":"Smoke Goal","target_value":99.5,"target_date":"2030-01-01"}'
showh /tmp/hgoc.txt
GID=$(python3 -c "import json;o=json.load(open('/tmp/goc.json')); print((o.get('data') or {}).get('id') or ''); assert o.get('success'), o")
echo "gid=$GID"

echo '=== delete goal ==='
curl -sS -D /tmp/hgod.txt -o /tmp/god.json -X DELETE "http://127.0.0.1:5000/api/finance/goals/${GID}" -H "$AUTH"
showh /tmp/hgod.txt
python3 -c "import json;o=json.load(open('/tmp/god.json')); assert o.get('success')"

echo '=== delete card ==='
curl -sS -D /tmp/hcdd.txt -o /tmp/cdd.json -X DELETE "http://127.0.0.1:5000/api/finance/cards/${CID}" -H "$AUTH"
showh /tmp/hcdd.txt
python3 -c "import json;o=json.load(open('/tmp/cdd.json')); assert o.get('success')"

echo '=== delete transaction ==='
curl -sS -D /tmp/htxd.txt -o /tmp/txd.json -X DELETE "http://127.0.0.1:5000/api/finance/transactions/${TXID}" -H "$AUTH"
showh /tmp/htxd.txt
python3 -c "import json;o=json.load(open('/tmp/txd.json')); assert o.get('success')"

echo '=== profiles limit ==='
curl -sS -D /tmp/hpl.txt -o /tmp/pl.json "http://127.0.0.1:5000/api/finance/profiles/limit" -H "$AUTH"
showh /tmp/hpl.txt
python3 -c "import json;o=json.load(open('/tmp/pl.json')); print(o.get('data')); assert o.get('success')"

echo '=== income-breakdown ==='
curl -sS -D /tmp/hib.txt -o /tmp/ib.json "http://127.0.0.1:5000/api/finance/income-breakdown?scope=monthly" -H "$AUTH"
showh /tmp/hib.txt
python3 -c "import json;o=json.load(open('/tmp/ib.json')); d=o.get('data') or {}; print('total',d.get('total'),'itens',len(d.get('itens') or [])); assert o.get('success')"

echo '=== create profile ==='
curl -sS -D /tmp/hpc.txt -o /tmp/pc.json -X POST "http://127.0.0.1:5000/api/finance/profiles" -H "$AUTH" -H "$H" \
  -d '{"name":"Smoke Profile Laravel","color":"#111111"}'
showh /tmp/hpc.txt
python3 -c "import json;o=json.load(open('/tmp/pc.json')); print(o.get('message') or o.get('error')); assert o.get('success') or (isinstance(o.get('error'),dict) and o['error'].get('code')=='FINANCE_PROFILE_LIMIT_REACHED')"
PIDP=$(python3 -c "import json;o=json.load(open('/tmp/pc.json')); print((o.get('data') or {}).get('id') or '')")
if [ -n "$PIDP" ]; then
  echo "=== put profile $PIDP ==="
  curl -sS -D /tmp/hpp.txt -o /tmp/pp.json -X PUT "http://127.0.0.1:5000/api/finance/profiles/${PIDP}" -H "$AUTH" -H "$H" \
    -d '{"name":"Smoke Profile Laravel 2"}'
  showh /tmp/hpp.txt
  python3 -c "import json;o=json.load(open('/tmp/pp.json')); assert o.get('success')"
  echo '=== delete profile ==='
  curl -sS -D /tmp/hpd.txt -o /tmp/pd.json -X DELETE "http://127.0.0.1:5000/api/finance/profiles/${PIDP}" -H "$AUTH"
  showh /tmp/hpd.txt
  python3 -c "import json;o=json.load(open('/tmp/pd.json')); print(o.get('message')); assert o.get('success') or 'único' in str(o.get('message','')).lower() or 'unico' in str(o.get('message','')).lower()"
fi

echo DONE_FINANCE
