#!/bin/bash
set -euo pipefail
KEY=$(grep '^EVOLUTION_API_KEY=' /opt/ck-agent/.env | cut -d= -f2-)
echo "polling QR..."
for i in $(seq 1 20); do
  RESP=$(curl -sS "http://127.0.0.1:8081/instance/connect/conectaking" -H "apikey: ${KEY}")
  echo "try $i: $(echo "$RESP" | head -c 120)"
  if echo "$RESP" | grep -q 'base64'; then
    echo "$RESP" > /tmp/evo-qr.json
    python3 - <<'PY'
import json,base64
j=json.load(open("/tmp/evo-qr.json"))
b64=j.get("base64")
if isinstance(j.get("qrcode"),dict):
  b64=b64 or j["qrcode"].get("base64")
if isinstance(b64,str) and b64.startswith("data:image"):
  b64=b64.split(",",1)[1]
open("/tmp/conectaking-qr.png","wb").write(base64.b64decode(b64))
print("QR_PNG_OK")
PY
    exit 0
  fi
  sleep 3
done
echo "NO_QR_AFTER_POLL"
curl -sS "http://127.0.0.1:8081/instance/connectionState/conectaking" -H "apikey: ${KEY}"; echo
docker logs ck-agent-evolution --tail 30 2>&1
