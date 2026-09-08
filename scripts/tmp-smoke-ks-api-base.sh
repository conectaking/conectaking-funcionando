#!/bin/bash
set -e
grep -RIn --include='*.js' 'king-selection/v1\|conectaking-api.onrender' /opt/conectaking/public_html /opt/conectaking/public 2>/dev/null | head -40 || true
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"conectaking@gmail.com","password":"playadryan22"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
echo "token_ok"
for q in 'itemId=3' 'profileItemId=3'; do
  echo "=== galleries?$q ==="
  curl -sS -D /tmp/gh.txt -o /tmp/gj.json "http://127.0.0.1:5000/api/king-selection/galleries?$q" -H "Authorization: Bearer $TOKEN"
  tr -d '\r' </tmp/gh.txt | grep -iE 'HTTP/|x-conecta' | head -5
  head -c 400 /tmp/gj.json; echo
done
echo "=== v1 ==="
code=$(curl -sS -D /tmp/gv.txt -o /tmp/gv.json -w '%{http_code}' "http://127.0.0.1:5000/api/king-selection/v1/galleries?itemId=3" -H "Authorization: Bearer $TOKEN")
echo "http=$code"
tr -d '\r' </tmp/gv.txt | grep -iE 'HTTP/|x-conecta' | head -5
head -c 300 /tmp/gv.json; echo
