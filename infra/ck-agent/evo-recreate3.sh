#!/bin/bash
set -euo pipefail
KEY=$(grep '^EVOLUTION_API_KEY=' /opt/ck-agent/.env | cut -d= -f2-)
cd /opt/ck-agent
docker compose --env-file .env up -d --force-recreate evolution-api
for i in $(seq 1 30); do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:8081/ || true)
  [ "$CODE" = "200" ] && break
  sleep 2
done
echo "up:$CODE"

# recreate instance
curl -sS -X DELETE "http://127.0.0.1:8081/instance/delete/conectaking" -H "apikey: ${KEY}" >/dev/null || true
sleep 1
CREATE=$(curl -sS -w "\nHTTP:%{http_code}" -X POST "http://127.0.0.1:8081/instance/create" \
  -H "apikey: ${KEY}" -H "Content-Type: application/json" \
  -d '{"instanceName":"conectaking","qrcode":true,"integration":"WHATSAPP-BAILEYS"}')
echo "$CREATE" | tail -5
sleep 3
for i in $(seq 1 15); do
  R=$(curl -sS "http://127.0.0.1:8081/instance/connect/conectaking" -H "apikey: ${KEY}" || true)
  echo "t$i:$(echo "$R" | head -c 160)"
  echo "$R" | grep -q base64 && echo HAS_QR && break
  sleep 2
done
echo "=== logs ==="
docker logs ck-agent-evolution --since 90s 2>&1 | grep -iE 'qr|baileys|socket|error|whatsapp|connect|warn' | tail -60
