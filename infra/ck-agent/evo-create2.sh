#!/bin/bash
set -euo pipefail
KEY=$(grep '^EVOLUTION_API_KEY=' /opt/ck-agent/.env | cut -d= -f2-)

echo "waiting for evolution..."
for i in $(seq 1 30); do
  CODE=$(curl -sS -o /tmp/evo-root.json -w "%{http_code}" http://127.0.0.1:8081/ || true)
  if [ "$CODE" = "200" ]; then
    echo "evo_up:$CODE"
    break
  fi
  echo "wait $i code=$CODE"
  sleep 2
done

curl -sS -o /tmp/evo-create.json -w "create:%{http_code}\n" -X POST \
  "http://127.0.0.1:8081/instance/create" \
  -H "apikey: ${KEY}" -H "Content-Type: application/json" \
  -d '{"instanceName":"conectaking","qrcode":true,"integration":"WHATSAPP-BAILEYS"}'
head -c 1200 /tmp/evo-create.json; echo

sleep 3
for i in $(seq 1 20); do
  RESP=$(curl -sS "http://127.0.0.1:8081/instance/connect/conectaking" -H "apikey: ${KEY}" || echo '{}')
  echo "try $i: $(echo "$RESP" | head -c 180)"
  if echo "$RESP" | grep -q base64; then
    echo "$RESP" > /tmp/evo-qr.json
    python3 - <<'PY'
import json,base64
j=json.load(open("/tmp/evo-qr.json"))
b64=j.get("base64")
qr=j.get("qrcode")
if isinstance(qr,dict): b64=b64 or qr.get("base64")
if isinstance(b64,str) and "," in b64: b64=b64.split(",",1)[1]
open("/tmp/conectaking-qr.png","wb").write(base64.b64decode(b64))
print("QR_PNG_OK")
PY
    exit 0
  fi
  # also check create payload
  if grep -q base64 /tmp/evo-create.json 2>/dev/null; then
    python3 - <<'PY'
import json,base64
j=json.load(open("/tmp/evo-create.json"))
b64=j.get("base64")
qr=j.get("qrcode")
if isinstance(qr,dict): b64=b64 or qr.get("base64")
if isinstance(b64,str) and "," in b64: b64=b64.split(",",1)[1]
if b64:
  open("/tmp/conectaking-qr.png","wb").write(base64.b64decode(b64))
  print("QR_PNG_OK_CREATE")
else:
  print("no b64 in create")
PY
    grep -q QR_PNG /dev/null 2>&1 || true
  fi
  sleep 2
done

echo "=== state ==="
curl -sS "http://127.0.0.1:8081/instance/connectionState/conectaking" -H "apikey: ${KEY}"; echo
echo "=== logs ==="
docker logs ck-agent-evolution --since 3m 2>&1 | tail -100
