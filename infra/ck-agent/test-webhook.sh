#!/bin/bash
set -euo pipefail
set -a
# shellcheck disable=SC1091
. /opt/ck-agent/.env
set +a

BODY=$(python3 - <<'PY'
import json, time
print(json.dumps({
  "update_id": 999001,
  "message": {
    "message_id": 1,
    "from": {"id": 78792434, "is_bot": False, "first_name": "Test"},
    "chat": {"id": 78792434, "type": "private"},
    "date": int(time.time()),
    "text": "oi teste sentry"
  }
}))
PY
)
echo "$BODY" > /tmp/tg-update.json
curl -sS -o /tmp/wh-out.txt -w "HTTP %{http_code}\n" -X POST \
  "https://n8n.conectaking.com.br/webhook/ck-agent-telegram/webhook" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/tg-update.json
echo -n "body: "; head -c 500 /tmp/wh-out.txt; echo
sleep 12
echo "=== logs ==="
docker logs ck-agent-n8n --tail 80 2>&1 | grep -Ei 'error|chat_id|Offer|Rejected|Problem|NodeOperation|Bad Request' | tail -40 || true
