#!/bin/bash
set -euo pipefail
echo "=== containers ==="
docker ps -a --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | head -30
echo "=== n8n health ==="
curl -sS -o /dev/null -w 'local healthz %{http_code}\n' http://127.0.0.1:5678/healthz || true
curl -sS -o /dev/null -w 'public editor %{http_code}\n' https://n8n.conectaking.com.br/ || true
curl -sS -o /dev/null -w 'public healthz %{http_code}\n' https://n8n.conectaking.com.br/healthz || true
echo "=== mem/cpu ==="
free -h | head -2
df -h / | tail -1
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' | head -15
echo "=== n8n logs ==="
docker logs ck-agent-n8n --tail 60 2>&1
echo "=== caddy n8n ==="
grep -n 'n8n' /etc/caddy/Caddyfile | head -20 || true
echo "=== recent webhook execs ==="
python3 <<'PY'
import json,sqlite3
c=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
for r in c.execute("select id,status,mode,startedAt from execution_entity order by startedAt desc limit 10"):
    print(r)
# dump last webhook error description if any
eid=c.execute("select id from execution_entity where mode='webhook' order by startedAt desc limit 1").fetchone()
print('last webhook id', eid)
PY
