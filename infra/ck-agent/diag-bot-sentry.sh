#!/bin/bash
set -euo pipefail
echo "=== n8n ==="
docker ps --filter name=ck-agent-n8n --format '{{.Image}} {{.Status}}'
docker logs ck-agent-n8n --tail 40 2>&1
echo "=== webhook ==="
set -a; . /opt/ck-agent/.env; set +a
curl -sS --connect-timeout 20 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"; echo
echo "=== recent execs ==="
docker exec -u root ck-agent-n8n sh -c 'command -v sqlite3 >/dev/null || apk add --no-cache sqlite >/dev/null; sqlite3 /home/node/.n8n/database.sqlite "SELECT id,mode,status,startedAt FROM execution_entity ORDER BY startedAt DESC LIMIT 10;"'
echo "=== sentry env ck-agent ==="
grep -iE 'SENTRY|DSN' /opt/ck-agent/.env 2>/dev/null | sed 's/=.*/=***/' || echo none
echo "=== sentry on laravel ==="
docker exec conectaking-laravel printenv | grep -iE 'SENTRY' | sed 's/=.*/=***/' || true
