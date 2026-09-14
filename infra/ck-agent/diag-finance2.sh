#!/bin/bash
set -euo pipefail
set -a
# shellcheck disable=SC1091
. /opt/ck-agent/.env
set +a

python3 <<'PY'
import os, base64, json
tok = os.environ.get('CK_AGENT_JWT', '')
print('jwt_len', len(tok))
parts = tok.split('.')
if len(parts) >= 2:
    p = parts[1] + '=' * ((4 - len(parts[1]) % 4) % 4)
    try:
        payload = json.loads(base64.urlsafe_b64decode(p))
        print(json.dumps(payload, indent=2, ensure_ascii=False)[:1200])
    except Exception as e:
        print('decode fail', e)
PY

echo "=== tables ==="
docker exec conectaking-db psql -U conectaking -d conectaking -c \
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND (table_name ILIKE '%financ%' OR table_name ILIKE '%transaction%') ORDER BY 1;"

echo "=== last transactions ==="
docker exec conectaking-db psql -U conectaking -d conectaking -c \
  "SELECT id, user_id, profile_id, type, status, amount, left(description,60) AS d, transaction_date, created_at
   FROM finance_transactions ORDER BY id DESC LIMIT 15;"

echo "=== profiles for those users ==="
docker exec conectaking-db psql -U conectaking -d conectaking -c \
  "SELECT id, user_id, name, is_primary, is_active FROM finance_profiles ORDER BY id DESC LIMIT 20;"

echo "=== adrianoking users ==="
docker exec conectaking-db psql -U conectaking -d conectaking -c \
  "SELECT id, email, profile_slug FROM users WHERE email ILIKE '%king%' OR profile_slug ILIKE '%adriano%' OR email ILIKE '%conecta%' LIMIT 20;"
