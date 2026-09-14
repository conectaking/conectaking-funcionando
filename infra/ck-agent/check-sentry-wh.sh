#!/bin/bash
set -euo pipefail
echo "=== status ==="
docker ps --filter name=ck-agent-n8n --format '{{.Status}}'
curl -sS -m 5 -o /dev/null -w 'health %{http_code}\n' http://127.0.0.1:5678/healthz
echo "=== active workflows in logs ==="
docker logs ck-agent-n8n 2>&1 | grep -Ei 'Activated|active workflow|Sentry|Error →|Problem|Could not' | tail -40
echo "=== db ==="
python3 <<'PY'
import json,sqlite3
c=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
for r in c.execute('select id,name,active,activeVersionId from workflow_entity'):
    print(r)
print('webhooks:')
for r in c.execute('select * from webhook_entity'):
    print(r)
# check history nodes for sentry has webhook
vid=c.execute("select activeVersionId from workflow_entity where id='ckSentryAlert01'").fetchone()[0]
nodes=json.loads(c.execute('select nodes from workflow_history where versionId=?',(vid,)).fetchone()[0])
print('sentry hist nodes', [n['name'] for n in nodes])
print('sentry hist webhook params', [n['parameters'] for n in nodes if n['name']=='Webhook Sentry'])
PY
set -a; . /opt/ck-agent/.env; set +a
echo "=== local webhook test ==="
curl -sS -m 20 -o /tmp/w1.txt -w 'local %{http_code}\n' -X POST \
  "http://127.0.0.1:5678/webhook/ck-agent-sentry" \
  -H 'Content-Type: application/json' \
  -H "X-Ck-Secret: ${CK_SENTRY_WEBHOOK_SECRET}" \
  -d '{"title":"ops.alert_pipeline_ok","message":"teste local","level":"warning","project":"conectaking","secret":"'"${CK_SENTRY_WEBHOOK_SECRET}"'"}'
head -c 300 /tmp/w1.txt; echo
