#!/bin/bash
set -euo pipefail
ENV=/opt/ck-agent/.env
ID=78792434
if grep -q '^ADMIN_TELEGRAM_ID=' "$ENV"; then
  sed -i "s|^ADMIN_TELEGRAM_ID=.*|ADMIN_TELEGRAM_ID=${ID}|" "$ENV"
else
  echo "ADMIN_TELEGRAM_ID=${ID}" >> "$ENV"
fi
chmod 600 "$ENV"
cd /opt/ck-agent
docker compose --env-file .env up -d n8n
sleep 5
docker exec ck-agent-n8n printenv ADMIN_TELEGRAM_ID
echo OK
