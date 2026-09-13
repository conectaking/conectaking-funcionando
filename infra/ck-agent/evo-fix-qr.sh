#!/bin/bash
set -euo pipefail
KEY=$(grep '^EVOLUTION_API_KEY=' /opt/ck-agent/.env | cut -d= -f2-)
cd /opt/ck-agent

echo "=== state before ==="
curl -sS "http://127.0.0.1:8081/instance/connectionState/conectaking" -H "apikey: ${KEY}" || true
echo

echo "=== delete ==="
curl -sS -X DELETE "http://127.0.0.1:8081/instance/delete/conectaking" -H "apikey: ${KEY}" || true
echo

echo "=== full recreate evolution ==="
docker compose --env-file .env up -d --force-recreate evolution-api
for i in $(seq 1 40); do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:8081/ || true)
  [ "$CODE" = "200" ] && break
  sleep 2
done
echo "evo_http:$CODE"

echo "=== create ==="
curl -sS -o /tmp/evo-create.json -w "create:%{http_code}\n" -X POST \
  "http://127.0.0.1:8081/instance/create" \
  -H "apikey: ${KEY}" -H "Content-Type: application/json" \
  -d '{"instanceName":"conectaking","qrcode":true,"integration":"WHATSAPP-BAILEYS"}'
python3 - <<'PY'
import json
j=json.load(open("/tmp/evo-create.json"))
print("status", j.get("instance",{}).get("status"))
qr=j.get("qrcode")
print("qr keys", qr.keys() if isinstance(qr,dict) else qr)
b64=(qr or {}).get("base64") if isinstance(qr,dict) else None
print("has_base64", bool(b64), "len", len(b64 or ""))
if b64:
  import base64
  if "," in b64: b64=b64.split(",",1)[1]
  open("/tmp/conectaking-qr.png","wb").write(base64.b64decode(b64))
  print("QR_FROM_CREATE")
PY

sleep 2
for i in $(seq 1 25); do
  RESP=$(curl -sS "http://127.0.0.1:8081/instance/connect/conectaking" -H "apikey: ${KEY}" || echo '{}')
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
print("QR_FROM_CONNECT", len(b64 or ""))
PY
    ls -la /tmp/conectaking-qr.png
    exit 0
  fi
  echo "try $i: $(echo "$RESP" | head -c 100)"
  sleep 2
done

echo "=== logs ==="
docker logs ck-agent-evolution --since 3m 2>&1 | tail -120
docker stats --no-stream ck-agent-evolution
exit 1
