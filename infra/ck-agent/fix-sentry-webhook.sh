#!/bin/bash
set -euo pipefail
docker stop ck-agent-n8n
sleep 2
python3 <<'PY'
import json, sqlite3, time, os
DB='/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
c=sqlite3.connect(DB)
cur=c.cursor()
print('webhook cols', [x[1] for x in cur.execute('pragma table_info(webhook_entity)')])
print('webhooks now:')
for r in cur.execute('select * from webhook_entity'):
    print(r)
print('workflows:')
for r in cur.execute("select id,name,active,activeVersionId from workflow_entity"):
    print(r)
print('shared:')
try:
  for r in cur.execute('select * from shared_workflow'):
    print(r)
except Exception as e:
  print(e)
  print([x[1] for x in cur.execute('pragma table_info(shared_workflow)')])

# Fix webhook registration for sentry
# In n8n 2.x, webhookPath is often just the path segment
cols=[x[1] for x in cur.execute('pragma table_info(webhook_entity)')]
print('will insert with cols', cols)

# delete broken
cur.execute("DELETE FROM webhook_entity WHERE workflowId='ckSentryAlert01' OR webhookPath LIKE '%ck-agent-sentry%'")

# Inspect telegram webhook as template
print('telegram webhook sample:')
for r in cur.execute("select * from webhook_entity where webhookPath like '%telegram%' or webhookPath like '%ck-agent%'"):
    print(r)

# Get node webhookId from workflow
nodes=json.loads(cur.execute("select nodes from workflow_entity where id='ckSentryAlert01'").fetchone()[0])
wh=None
for n in nodes:
  if n.get('type')=='n8n-nodes-base.webhook':
    wh=n
    print('webhook node', json.dumps({k:n.get(k) for k in ('id','name','webhookId','parameters')}, ensure_ascii=False))
if not wh:
  raise SystemExit('no webhook node')

path = wh['parameters']['path']
method = (wh['parameters'].get('httpMethod') or 'POST').upper()
webhook_id = wh.get('webhookId') or wh['id']
node_name = wh['name']

# Try insert matching existing schema - read one row as dict
sample = cur.execute('select * from webhook_entity limit 1').fetchone()
sample_cols = cols
print('sample', dict(zip(sample_cols, sample)) if sample else None)

# Common n8n schema: webhookPath, method, node, webhookId, pathLength, workflowId
# pathLength = number of segments
pathLength = len([p for p in path.split('/') if p])
row = {
  'webhookPath': path,
  'method': method,
  'node': node_name,
  'webhookId': webhook_id,
  'pathLength': pathLength,
  'workflowId': 'ckSentryAlert01',
}
# only use existing columns
use = {k:v for k,v in row.items() if k in cols}
placeholders = ','.join('?' for _ in use)
cur.execute(f"INSERT INTO webhook_entity ({','.join(use.keys())}) VALUES ({placeholders})", list(use.values()))
print('inserted webhook', use)

# Ensure active=1 and history exists for sentry + error
for wid in ('ckSentryAlert01','ckErrWfSentry01','mkK244lveO0N1qPR'):
  cur.execute('UPDATE workflow_entity SET active=1 WHERE id=?', (wid,))

# shared_workflow schema fix
try:
  scols=[x[1] for x in cur.execute('pragma table_info(shared_workflow)')]
  print('shared cols', scols)
  proj=cur.execute('select id from project limit 1').fetchone()
  print('project', proj)
  if proj:
    for wid in ('ckSentryAlert01','ckErrWfSentry01'):
      exists=cur.execute('select 1 from shared_workflow where workflowId=?',(wid,)).fetchone()
      if not exists:
        now=time.strftime('%Y-%m-%d %H:%M:%S.000')
        # try common shapes
        if 'projectId' in scols and 'role' in scols:
          cur.execute('INSERT INTO shared_workflow (workflowId, projectId, role, createdAt, updatedAt) VALUES (?,?,?,?,?)',
                      (wid, proj[0], 'workflow:owner', now, now))
        elif 'projectId' in scols:
          cur.execute('INSERT INTO shared_workflow (workflowId, projectId, createdAt, updatedAt) VALUES (?,?,?,?)',
                      (wid, proj[0], now, now))
        print('shared linked', wid)
except Exception as e:
  print('shared fail', e)

c.commit()
c.close()
os.chown(DB,1000,1000)
print('ok')
PY
cd /opt/ck-agent && docker compose --env-file .env up -d n8n
for i in $(seq 1 15); do
  code=$(curl -sS -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:5678/healthz || echo 000)
  echo "try $i $code"
  [ "$code" = "200" ] && break
  sleep 5
done
sleep 5
set -a; . /opt/ck-agent/.env; set +a
echo "testing webhook..."
curl -sS -m 20 -o /tmp/sentry-wh-out.txt -w 'HTTP %{http_code}\n' -X POST \
  "https://n8n.conectaking.com.br/webhook/ck-agent-sentry" \
  -H 'Content-Type: application/json' \
  -H "X-Ck-Secret: ${CK_SENTRY_WEBHOOK_SECRET}" \
  --data-binary '{"title":"ops.alert_pipeline_ok","message":"Teste pipeline Sentry→Agente→Telegram","level":"warning","project":"conectaking","environment":"production","server_name":"manual-test","secret":"'"${CK_SENTRY_WEBHOOK_SECRET}"'"}'
head -c 400 /tmp/sentry-wh-out.txt; echo
# also try /webhook/ck-agent-sentry/webhook
curl -sS -m 20 -o /tmp/sentry-wh-out2.txt -w 'HTTP2 %{http_code}\n' -X POST \
  "https://n8n.conectaking.com.br/webhook/ck-agent-sentry/webhook" \
  -H 'Content-Type: application/json' \
  -H "X-Ck-Secret: ${CK_SENTRY_WEBHOOK_SECRET}" \
  --data-binary '{"title":"ops.alert_pipeline_ok","message":"Teste alt path","level":"warning","project":"conectaking"}'
head -c 200 /tmp/sentry-wh-out2.txt; echo
docker logs ck-agent-n8n --tail 30 2>&1 | grep -Ei 'Activated|sentry|Error|webhook' || true
