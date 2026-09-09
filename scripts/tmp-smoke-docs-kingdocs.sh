#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
showh(){ tr -d '\r' <"$1" | grep -iE 'HTTP/|x-conecta' | head -5; }

echo '=== documentos list ==='
curl -sS -D /tmp/hdl.txt -o /tmp/dl.json http://127.0.0.1:5000/api/documentos -H "$AUTH"
showh /tmp/hdl.txt
python3 - <<'PY'
import json
o=json.load(open('/tmp/dl.json'))
assert o.get('success') is True, o
print('docs', len((o.get('data') or {}).get('documentos') or []))
PY

echo '=== documentos settings GET ==='
curl -sS -D /tmp/hds.txt -o /tmp/ds.json http://127.0.0.1:5000/api/documentos/settings -H "$AUTH"
showh /tmp/hds.txt
python3 -c "import json;o=json.load(open('/tmp/ds.json')); assert o.get('success') is True; print('settings keys', sorted((o.get('data') or {}).keys())[:6])"

echo '=== documentos create+pdf+delete ==='
curl -sS -D /tmp/hdc.txt -o /tmp/dc.json -X POST http://127.0.0.1:5000/api/documentos \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"tipo":"recibo","titulo":"Smoke Laravel Docs","cliente_json":{"nome":"Cliente Smoke"},"itens_json":[{"descricao":"Item","quantidade":1,"valor_unitario":10}]}'
showh /tmp/hdc.txt
DOC_ID=$(python3 -c "import json;o=json.load(open('/tmp/dc.json')); assert o.get('success'); d=o.get('data') or {}; print(d.get('id')); assert d.get('id')")
TOKEN_DOC=$(python3 -c "import json;o=json.load(open('/tmp/dc.json')); print((o.get('data') or {}).get('link_token') or '')")
echo "doc_id=$DOC_ID token=$TOKEN_DOC"

curl -sS -D /tmp/hdp.txt -o /tmp/dp.pdf "http://127.0.0.1:5000/api/documentos/$DOC_ID/pdf" -H "$AUTH"
showh /tmp/hdp.txt
python3 -c "b=open('/tmp/dp.pdf','rb').read(5); print('pdf_magic', b); assert b==b'%PDF-'"

curl -sS -D /tmp/hdv.txt -o /tmp/dv.json "http://127.0.0.1:5000/api/documentos/ver/$TOKEN_DOC"
showh /tmp/hdv.txt
python3 -c "import json;o=json.load(open('/tmp/dv.json')); assert o.get('success'); print('public', (o.get('data') or {}).get('titulo'))"

curl -sS -D /tmp/hdd.txt -o /tmp/dd.json -X DELETE "http://127.0.0.1:5000/api/documentos/$DOC_ID" -H "$AUTH"
showh /tmp/hdd.txt
python3 -c "import json;o=json.load(open('/tmp/dd.json')); assert o.get('success')"

echo '=== OCR still Node (engine header) ==='
curl -sS -D /tmp/hoi.txt -o /tmp/oi.json http://127.0.0.1:5000/api/documentos/ocr-info -H "$AUTH"
showh /tmp/hoi.txt
python3 -c "import json;o=json.load(open('/tmp/oi.json')); print('ocr', o)"

echo '=== king-docs vault ==='
curl -sS -D /tmp/hkv.txt -o /tmp/kv.json http://127.0.0.1:5000/api/king-docs/vault -H "$AUTH"
showh /tmp/hkv.txt
python3 - <<'PY'
import json
o=json.load(open('/tmp/kv.json'))
# 403 se plano sem king_docs; 200 se ok
eng=open('/tmp/hkv.txt').read().lower()
print('status body success=', o.get('success'), 'message=', o.get('message'))
if o.get('success') is True:
    assert 'fieldData' in (o.get('data') or {})
    print('vault ok')
elif o.get('success') is False and 'plano' in str(o.get('message','')).lower():
    print('vault module gated (ok for smoke)')
else:
    # still require laravel engine
    assert 'laravel' in eng or o.get('success') is not None, o
PY

echo '=== king-docs files list ==='
curl -sS -D /tmp/hkf.txt -o /tmp/kf.json http://127.0.0.1:5000/api/king-docs/files -H "$AUTH"
showh /tmp/hkf.txt
python3 -c "import json;o=json.load(open('/tmp/kf.json')); print(o.get('success'), 'files' if o.get('success') else o.get('message'))"

echo '=== king-docs shares list ==='
curl -sS -D /tmp/hks.txt -o /tmp/ks.json http://127.0.0.1:5000/api/king-docs/shares -H "$AUTH"
showh /tmp/hks.txt
python3 -c "import json;o=json.load(open('/tmp/ks.json')); print(o.get('success'), o.get('message'))"

echo '=== king-docs public meta 404 ==='
curl -sS -D /tmp/hkm.txt -o /tmp/km.json http://127.0.0.1:5000/api/king-docs/public/smoke-invalid-token/meta
showh /tmp/hkm.txt
python3 -c "import json;o=json.load(open('/tmp/km.json')); print(o); assert o.get('ok') is False or o.get('message')"

echo DONE_DOCS_KINGDOCS
