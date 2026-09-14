#!/bin/bash
set -euo pipefail
# stop hung execs + n8n
python3 <<'PY'
import sqlite3, time
c=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
now=time.strftime('%Y-%m-%d %H:%M:%S.000')
n=c.execute("update execution_entity set status='canceled', stoppedAt=? where status in ('running','new')", (now,)).rowcount
c.commit()
print('canceled running', n)
PY
docker stop ck-agent-n8n
sleep 2
python3 /tmp/patch-voice-http.py
cd /opt/ck-agent
docker compose --env-file .env up -d n8n
for i in $(seq 1 14); do
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
conns=json.loads(c.execute('select connections from workflow_history where versionId=?',(vid,)).fetchone()[0])
print('has É Voz?', any(n['name']=='É Voz?' for n in nodes))
print('has Whisper', any(n['name']=='Whisper' for n in nodes))
print('prep has httpRequest', 'httpRequest' in next(n['parameters']['jsCode'] for n in nodes if n['name']=='Preparar (texto/voz)'))
print('prep has Buffer', 'Buffer' in next(n['parameters']['jsCode'] for n in nodes if n['name']=='Preparar (texto/voz)'))
sm=next(n['parameters']['options']['systemMessage'] for n in nodes if n['name']=='AI Agent Cliente')
print('cliente PROIBIDO', 'PROIBIDO' in sm)
print('cliente pagamentos as product', 'foco em pagamentos' in sm)
print('conns Preparar', conns.get('Preparar (texto/voz)'))
print('conns É Voz?', conns.get('É Voz?'))
print('static chats', json.loads(c.execute("select staticData from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0]).get('global',{}).get('chats'))
PY
docker ps --filter name=ck-agent-n8n --format '{{.Status}}'
echo DONE
