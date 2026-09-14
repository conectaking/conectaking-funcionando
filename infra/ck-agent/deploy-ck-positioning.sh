#!/bin/bash
set -euo pipefail
docker stop ck-agent-n8n
sleep 2
python3 /tmp/patch-ck-positioning.py
cd /opt/ck-agent && docker compose --env-file .env up -d n8n
for i in $(seq 1 12); do
  code=$(curl -sS -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:5678/healthz || echo 000)
  echo "health $i $code"
  [ "$code" = "200" ] && break
  sleep 5
done
python3 <<'PY'
import json,sqlite3
c=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
vid=c.execute("select activeVersionId from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0]
nodes=json.loads(c.execute('select nodes from workflow_history where versionId=?',(vid,)).fetchone()[0])
for n in nodes:
  if n.get('name')=='AI Agent Cliente':
    sm=n['parameters'].get('options',{}).get('systemMessage','')
    print('has NÃO é foco em pagamentos', 'NÃO é foco em pagamentos' in sm)
    print('has soluções de pagamentos', 'soluções de pagamentos' in sm.lower() or 'solucoes de pagamentos' in sm.lower())
    print('has NFC', 'NFC' in sm)
PY
docker ps --filter name=ck-agent-n8n --format '{{.Status}}'
echo DONE
