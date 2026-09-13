#!/bin/bash
set -euo pipefail
KEY=$(grep '^EVOLUTION_API_KEY=' /opt/ck-agent/.env | cut -d= -f2-)
sleep 2
for path in \
  "instance/connect/conectaking" \
  "instance/connectionState/conectaking" \
  "instance/qrcode/conectaking" \
  "instance/fetchInstances?instanceName=conectaking"
do
  echo "=== $path ==="
  curl -sS -w "\nhttp:%{http_code}\n" "http://127.0.0.1:8081/$path" -H "apikey: ${KEY}" | head -c 800
  echo
done
echo "=== LOGS ==="
docker logs ck-agent-evolution --tail 50 2>&1
