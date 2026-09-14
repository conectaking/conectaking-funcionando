#!/bin/bash
set -euo pipefail
cd /opt/ck-agent

echo "=== 1) Backup n8n data ==="
TS=$(date +%Y%m%d-%H%M%S)
BK=/opt/ck-agent/backups/n8n-$TS
mkdir -p /opt/ck-agent/backups
docker stop ck-agent-n8n
sleep 3
# checkpoint if possible
docker run --rm -v ck-agent_n8n_data:/data -w /data alpine sh -c '
  apk add --no-cache sqlite >/dev/null
  if [ -f database.sqlite ]; then
    sqlite3 database.sqlite "PRAGMA wal_checkpoint(FULL);" || true
  fi
'
mkdir -p "$BK"
docker run --rm -v ck-agent_n8n_data:/data -v "$BK":/bk alpine sh -c 'cp -a /data/. /bk/'
echo "backup at $BK"
du -sh "$BK"

echo "=== 2) Install new compose ==="
cp /tmp/ck-agent-docker-compose.yml /opt/ck-agent/docker-compose.yml
grep 'image:' docker-compose.yml | head -3

echo "=== 3) Pull + up ==="
docker compose --env-file .env pull n8n
docker compose --env-file .env up -d n8n
sleep 25
docker ps --filter name=ck-agent-n8n --format '{{.Status}} {{.Image}}'
docker logs ck-agent-n8n --tail 40 2>&1

echo "=== 4) Webhook + version ==="
set -a; . /opt/ck-agent/.env; set +a
curl -sS --connect-timeout 25 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"; echo
curl -sS -o /dev/null -w 'n8n_http=%{http_code}\n' https://n8n.conectaking.com.br/healthz || true
docker exec ck-agent-n8n n8n --version 2>/dev/null || docker exec ck-agent-n8n sh -c 'node -e "console.log(require(\"n8n/package.json\").version)"' 2>/dev/null || true
