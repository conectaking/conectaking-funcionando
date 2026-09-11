#!/bin/bash
set -euo pipefail
IP="${1:-}"
ENV=/opt/conectaking/.env.prod
if [[ -z "$IP" ]]; then
  echo "usage: $0 <ip>"
  exit 1
fi
python3 - <<PY
from pathlib import Path
ip = """$IP""".strip()
p = Path("$ENV")
lines = p.read_text().splitlines()
out, found = [], False
for line in lines:
    if line.startswith("ADMIN_IP_ALLOWLIST="):
        out.append("ADMIN_IP_ALLOWLIST=" + ip)
        found = True
    else:
        out.append(line)
if not found:
    out.append("ADMIN_IP_ALLOWLIST=" + ip)
p.write_text("\\n".join(out) + "\\n")
print("ADMIN_IP_ALLOWLIST set to", ip)
PY
cd /opt/conectaking
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps laravel queue queue-faces scheduler
sleep 8
docker exec conectaking-laravel printenv ADMIN_IP_ALLOWLIST
echo DONE
