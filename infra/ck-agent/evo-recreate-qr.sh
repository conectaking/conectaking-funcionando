#!/bin/bash
set -euo pipefail
KEY=$(grep '^EVOLUTION_API_KEY=' /opt/ck-agent/.env | cut -d= -f2-)

echo "=== mem ==="
docker stats --no-stream ck-agent-evolution ck-agent-evo-pg ck-agent-evo-redis || true

echo "=== delete instance ==="
curl -sS -o /tmp/evo-del.json -w "del:%{http_code}\n" -X DELETE \
  "http://127.0.0.1:8081/instance/delete/conectaking" -H "apikey: ${KEY}" || true
cat /tmp/evo-del.json; echo

echo "=== restart evolution ==="
cd /opt/ck-agent
docker compose --env-file .env restart evolution-api
sleep 12

echo "=== recreate ==="
curl -sS -o /tmp/evo-create.json -w "create:%{http_code}\n" -X POST \
  "http://127.0.0.1:8081/instance/create" \
  -H "apikey: ${KEY}" -H "Content-Type: application/json" \
  -d '{"instanceName":"conectaking","token":"ckagent","qrcode":true,"integration":"WHATSAPP-BAILEYS"}'
head -c 1000 /tmp/evo-create.json; echo

sleep 5
for i in $(seq 1 15); do
  RESP=$(curl -sS "http://127.0.0.1:8081/instance/connect/conectaking" -H "apikey: ${KEY}" || true)
  LEN=${#RESP}
  echo "try $i len=$LEN head=$(echo "$RESP" | head -c 160)"
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
print("QR_PNG_OK", len(b64))
PY
    exit 0
  fi
  sleep 2
done

echo "=== recent evo logs ==="
docker logs ck-agent-evolution --since 2m 2>&1 | tail -80
