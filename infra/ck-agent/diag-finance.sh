#!/bin/bash
set -euo pipefail
echo "=== agent jwt / env ==="
grep -E 'CK_AGENT_JWT|CK_BASE_URL|ADMIN_TELEGRAM' /opt/ck-agent/.env | sed 's/=.*/=***/'
echo "=== recent finance rows (if any) ==="
docker exec conectaking-db psql -U conectaking -d conectaking -c "\dt *finance*" 2>/dev/null || docker exec conectaking-db psql -U conectaking -d conectaking -c "\dt" | head -40
