#!/bin/bash
set -euo pipefail

echo "=== restart n8n (hung) ==="
cd /opt/ck-agent

# bump memory in compose if present
python3 <<'PY'
from pathlib import Path
p=Path('/opt/ck-agent/docker-compose.yml')
t=p.read_text()
t2=t.replace('mem_limit: 768m', 'mem_limit: 1024m', 1)
# only first n8n service - careful: evolution also 768m. Replace n8n block specifically.
text=p.read_text().splitlines()
out=[]; in_n8n=False; done=False
for i,line in enumerate(text):
    if line.startswith('  n8n:'):
        in_n8n=True
    elif line.startswith('  ') and not line.startswith('    ') and in_n8n:
        in_n8n=False
    if in_n8n and 'mem_limit:' in line and not done:
        out.append('    mem_limit: 1024m')
        done=True
        continue
    out.append(line)
p.write_text('\n'.join(out)+'\n')
print('compose mem bump', done)
PY

# ensure env for webhook url alias
grep -q '^N8N_WEBHOOK_URL=' .env || echo 'N8N_WEBHOOK_URL=https://n8n.conectaking.com.br/' >> .env

docker compose --env-file .env up -d n8n --force-recreate
sleep 25
curl -sS -m 5 -o /dev/null -w 'healthz:%{http_code}\n' http://127.0.0.1:5678/healthz || echo 'healthz fail'
docker ps --filter name=ck-agent-n8n --format '{{.Status}}'
docker logs ck-agent-n8n --tail 20 2>&1 | tail -20
