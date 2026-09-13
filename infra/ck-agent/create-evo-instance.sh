#!/bin/bash
set -euo pipefail
KEY=$(grep '^EVOLUTION_API_KEY=' /opt/ck-agent/.env | cut -d= -f2-)
echo "key_len=${#KEY}"

CODE=$(curl -sS -o /tmp/evo-create.json -w "%{http_code}" -X POST "http://127.0.0.1:8081/instance/create" \
  -H "apikey: ${KEY}" \
  -H "Content-Type: application/json" \
  -d '{"instanceName":"conectaking","integration":"WHATSAPP-BAILEYS","qrcode":true}')
echo "create_http:${CODE}"
head -c 900 /tmp/evo-create.json; echo

echo "=== instances ==="
curl -sS "http://127.0.0.1:8081/instance/fetchInstances" -H "apikey: ${KEY}" | head -c 1200; echo

echo "=== connect ==="
curl -sS -o /tmp/evo-qr.json -w "qr_http:%{http_code}\n" \
  "http://127.0.0.1:8081/instance/connect/conectaking" -H "apikey: ${KEY}"
head -c 400 /tmp/evo-qr.json; echo

python3 - <<'PY'
import json, base64
raw = open("/tmp/evo-qr.json", "rb").read().decode("utf-8", "ignore")
try:
    j = json.loads(raw)
except Exception as e:
    print("json_err", e)
    print(raw[:400])
    raise SystemExit(1)
print("top_keys", list(j.keys()) if isinstance(j, dict) else type(j))
b64 = None
if isinstance(j, dict):
    b64 = j.get("base64")
    qr = j.get("qrcode")
    if isinstance(qr, dict):
        b64 = b64 or qr.get("base64")
    elif isinstance(qr, str):
        b64 = b64 or qr
if isinstance(b64, str) and b64.startswith("data:image"):
    b64 = b64.split(",", 1)[1]
if isinstance(b64, str) and len(b64) > 100:
    open("/tmp/conectaking-qr.png", "wb").write(base64.b64decode(b64))
    print("QR_PNG_OK")
else:
    # create response may already have qr
    raw2 = open("/tmp/evo-create.json", "rb").read().decode("utf-8", "ignore")
    try:
        j2 = json.loads(raw2)
    except Exception:
        j2 = {}
    b64 = None
    if isinstance(j2, dict):
        b64 = j2.get("base64")
        qr = j2.get("qrcode")
        if isinstance(qr, dict):
            b64 = b64 or qr.get("base64")
    if isinstance(b64, str) and b64.startswith("data:image"):
        b64 = b64.split(",", 1)[1]
    if isinstance(b64, str) and len(b64) > 100:
        open("/tmp/conectaking-qr.png", "wb").write(base64.b64decode(b64))
        print("QR_PNG_OK_FROM_CREATE")
    else:
        print("NO_QR")
        print(str(j)[:600])
PY
