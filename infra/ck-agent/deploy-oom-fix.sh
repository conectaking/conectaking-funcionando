#!/bin/bash
set -euo pipefail
docker stop ck-agent-n8n
sleep 2
python3 /tmp/patch-prep-light.py
cp /tmp/ck-agent-docker-compose.yml /opt/ck-agent/docker-compose.yml
cd /opt/ck-agent
docker compose --env-file .env up -d n8n
for i in $(seq 1 14); do
  code=$(curl -sS -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:5678/healthz || echo 000)
  echo "health $i $code"
  [ "$code" = "200" ] && break
  sleep 5
done
docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' ck-agent-n8n
docker exec ck-agent-n8n printenv NODE_OPTIONS
docker ps --filter name=ck-agent-n8n --format '{{.Status}}'
echo DONE
