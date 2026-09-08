#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"
showh(){ tr -d '\r' <"$1" | grep -iE 'HTTP/|x-conecta' | head -5; }

echo '=== budgets ==='
curl -sS -D /tmp/hbud.txt -o /tmp/bud.json "http://127.0.0.1:5000/api/finance/budgets" -H "$AUTH"
showh /tmp/hbud.txt
python3 -c "import json;o=json.load(open('/tmp/bud.json')); print(o.get('success'), type(o.get('data')).__name__); assert o.get('success') is True"

echo '=== reports/summary ==='
curl -sS -D /tmp/hrs.txt -o /tmp/rs.json "http://127.0.0.1:5000/api/finance/reports/summary" -H "$AUTH"
showh /tmp/hrs.txt
python3 -c "import json;o=json.load(open('/tmp/rs.json')); print(o.get('success'), list((o.get('data') or {}).keys())[:6] if isinstance(o.get('data'),dict) else type(o.get('data')).__name__); assert o.get('success') is True"

echo '=== reports/categories ==='
curl -sS -D /tmp/hrc.txt -o /tmp/rc.json "http://127.0.0.1:5000/api/finance/reports/categories" -H "$AUTH"
showh /tmp/hrc.txt
python3 -c "import json;o=json.load(open('/tmp/rc.json')); print(o.get('success'), len(o.get('data') or [])); assert o.get('success') is True"

echo '=== profiles primary id ==='
PID=$(curl -sS "http://127.0.0.1:5000/api/finance/profiles/primary" -H "$AUTH" | python3 -c "import sys,json;o=json.load(sys.stdin);d=o.get('data') or {}; print(d.get('id') or '')")
echo "pid=$PID"
if [ -n "$PID" ]; then
  curl -sS -D /tmp/hpi.txt -o /tmp/pi.json "http://127.0.0.1:5000/api/finance/profiles/${PID}" -H "$AUTH"
  showh /tmp/hpi.txt
  python3 -c "import json;o=json.load(open('/tmp/pi.json')); print(o.get('success'), (o.get('data') or {}).get('id')); assert o.get('success')"
fi

echo '=== serasa pdf missing file ==='
curl -sS -D /tmp/hsp.txt -o /tmp/sp.json -X POST "http://127.0.0.1:5000/api/finance/serasa/import-preview" -H "$AUTH"
showh /tmp/hsp.txt
python3 -c "import json;o=json.load(open('/tmp/sp.json')); print(o); assert o.get('success') is False"

echo '=== serasa pdf with text PDF ==='
python3 <<'PY'
from pathlib import Path
pdf = b"""%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 68 >>stream
BT /F1 12 Tf 20 100 Td (De R$ 1.020,31 por R$ 388,96 Santander) Tj ET
endstream endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000384 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
461
%%EOF
"""
Path('/tmp/serasa-smoke.pdf').write_bytes(pdf)
print('wrote pdf')
PY
curl -sS -D /tmp/hsp2.txt -o /tmp/sp2.json -X POST "http://127.0.0.1:5000/api/finance/serasa/import-preview" \
  -H "$AUTH" -F "file=@/tmp/serasa-smoke.pdf;type=application/pdf"
showh /tmp/hsp2.txt
python3 -c "import json;o=json.load(open('/tmp/sp2.json')); print(o.get('success'), o.get('data') or o.get('message')); assert o.get('success') is True; assert 'offers' in (o.get('data') or {})"

echo '=== pdftotext/tesseract in laravel ==='
docker exec conectaking-laravel bash -lc 'command -v pdftotext && command -v tesseract && tesseract --list-langs 2>/dev/null | head -5'

echo DONE_FINANCE_REMAIN
