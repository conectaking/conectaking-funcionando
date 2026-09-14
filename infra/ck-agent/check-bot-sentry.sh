#!/bin/bash
set -euo pipefail
echo "=== n8n status ==="
docker ps --filter name=ck-agent-n8n --format '{{.Status}}'
echo "=== sentry env ==="
docker exec ck-agent-n8n printenv N8N_SENTRY_DSN | wc -c
docker exec ck-agent-n8n printenv ENVIRONMENT
docker exec ck-agent-n8n printenv DEPLOYMENT_NAME
echo "=== recent executions ==="
python3 <<'PY'
import json, sqlite3
DB='/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
c=sqlite3.connect(DB)
rows=c.execute("""
select e.id, e.status, e.mode, e.startedAt,
  (select substr(ed.data,1,400) from execution_data ed where ed.executionId=e.id limit 1)
from execution_entity e
order by e.startedAt desc limit 12
""").fetchall()
for r in rows:
    print(r[0], r[1], r[2], r[3])
    data=r[4] or ''
    if 'chat_id' in data.lower() or 'error' in data.lower() or 'Bad Request' in data:
        print('  hint:', data[:300].replace('\n',' '))
# check chatId still correct
nodes=json.loads(c.execute("select nodes from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0])
for n in nodes:
    if n.get('name')=='Enviar Telegram':
        print('Enviar chatId=', n['parameters'].get('chatId'))
PY
echo "=== last n8n errors in logs ==="
docker logs ck-agent-n8n --since 30m 2>&1 | grep -Ei 'error|chat_id|Bad Request|Offer expired|Sentry|Problem in' | tail -40 || true
echo "=== try force sentry via node (optional) ==="
# Check if any webhook telegram msgs after fix (~01:45 UTC = ~22:45 BRT)
python3 <<'PY'
import sqlite3
c=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
rows=c.execute("""
select id,status,mode,startedAt from execution_entity
where mode='webhook' and startedAt >= '2026-09-14 01:45:00'
order by startedAt desc limit 20
""").fetchall()
print('webhooks after fix:', len(rows))
for r in rows: print(r)
PY
