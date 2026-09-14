#!/bin/bash
set -euo pipefail
docker stop ck-agent-n8n
sleep 2
python3 /tmp/patch-finance-profile.py
docker exec -i conectaking-db psql -U conectaking -d conectaking < /tmp/fix-finance.sql
cd /opt/ck-agent && docker compose --env-file .env up -d n8n
for i in $(seq 1 12); do
  code=$(curl -sS -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:5678/healthz || echo 000)
  echo "health $i $code"
  [ "$code" = "200" ] && break
  sleep 5
done
set -a; . /opt/ck-agent/.env; set +a
# verify profiles API shape
curl -sS -m 15 -H "Authorization: Bearer ${CK_AGENT_JWT}" -H "Accept: application/json" \
  "${CK_BASE_URL}/api/finance/profiles" | head -c 600; echo
docker exec conectaking-db psql -U conectaking -d conectaking -c \
  "SELECT id, profile_id, type, amount, left(description,40), transaction_date FROM finance_transactions ORDER BY id; SELECT id,name,is_primary FROM finance_profiles;"
