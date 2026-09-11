#!/bin/bash
set -euo pipefail
TOKFILE=/tmp/ck-cf-token.txt
test -f "$TOKFILE"
TOKEN=$(tr -d '\r\n' < "$TOKFILE")
test -n "$TOKEN"
ENV=/opt/conectaking/.env.prod

python3 <<'PY'
from pathlib import Path
token = Path('/tmp/ck-cf-token.txt').read_text().replace('\r', '').replace('\n', '').strip()
p = Path('/opt/conectaking/.env.prod')
lines = p.read_text().splitlines()
out, found = [], False
for line in lines:
    if line.startswith('CLOUDFLARE_API_TOKEN='):
        out.append('CLOUDFLARE_API_TOKEN=' + token)
        found = True
    else:
        out.append(line)
if not found:
    out.append('CLOUDFLARE_API_TOKEN=' + token)
p.write_text('\n'.join(out) + '\n')
print('token line updated')
PY
rm -f "$TOKFILE"

echo "=== verify token ==="
curl -sS "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer ${TOKEN}"
echo

sed -i 's/\r$//' /opt/conectaking/scripts/deploy-ks-worker-vps.sh
chmod +x /opt/conectaking/scripts/deploy-ks-worker-vps.sh
bash /opt/conectaking/scripts/deploy-ks-worker-vps.sh
