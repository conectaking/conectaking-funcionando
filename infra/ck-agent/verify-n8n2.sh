#!/bin/bash
set -euo pipefail
docker ps --filter name=ck-agent-n8n --format '{{.Image}} {{.Status}}'
docker logs ck-agent-n8n --tail 20 2>&1
docker exec -u root ck-agent-n8n sh -c "sqlite3 /home/node/.n8n/database.sqlite 'SELECT name,active FROM workflow_entity; SELECT webhookPath FROM webhook_entity; SELECT id,name,type FROM credentials_entity;'"
set -a; . /opt/ck-agent/.env; set +a
curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"; echo
