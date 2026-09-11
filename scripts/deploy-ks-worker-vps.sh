#!/bin/bash
set -euo pipefail
TOKEN=$(grep -E "^CLOUDFLARE_API_TOKEN=" /opt/conectaking/.env.prod | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
ACCT=$(grep -E "^CLOUDFLARE_ACCOUNT_ID=" /opt/conectaking/.env.prod | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
export CLOUDFLARE_API_TOKEN="$TOKEN"
export CLOUDFLARE_ACCOUNT_ID="$ACCT"
test -n "$CLOUDFLARE_API_TOKEN"
test -n "$CLOUDFLARE_ACCOUNT_ID"
cd /opt/conectaking/cf-worker-kingselection-r2
python3 -c 'from pathlib import Path; import os; p=Path("wrangler.toml"); t=p.read_text(); a=os.environ["CLOUDFLARE_ACCOUNT_ID"]; lines=t.splitlines(True)
if not any(l.startswith("account_id") for l in lines):
  lines.insert(1, "account_id = \"%s\"\n" % a); p.write_text("".join(lines))
print("account_id ready")'
head -6 wrangler.toml
docker run --rm -e CLOUDFLARE_API_TOKEN -e CLOUDFLARE_ACCOUNT_ID \
  -v /opt/conectaking/cf-worker-kingselection-r2:/app -w /app \
  node:22-bookworm npx --yes wrangler@4 deploy
