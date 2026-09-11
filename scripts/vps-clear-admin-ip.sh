#!/bin/bash
set -euo pipefail
ENV=/opt/conectaking/.env.prod
python3 - <<'PY'
from pathlib import Path
p = Path("/opt/conectaking/.env.prod")
lines = p.read_text().splitlines()
out, found = [], False
for line in lines:
    if line.startswith("ADMIN_IP_ALLOWLIST="):
        out.append("ADMIN_IP_ALLOWLIST=")
        found = True
    else:
        out.append(line)
if not found:
    out.append("ADMIN_IP_ALLOWLIST=")
p.write_text("\n".join(out) + "\n")
print("ADMIN_IP_ALLOWLIST cleared (disabled)")
PY
cd /opt/conectaking
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps laravel queue queue-faces scheduler
sleep 8
val="$(docker exec conectaking-laravel printenv ADMIN_IP_ALLOWLIST || true)"
echo "ADMIN_IP_ALLOWLIST=[${val}]"
echo DONE
