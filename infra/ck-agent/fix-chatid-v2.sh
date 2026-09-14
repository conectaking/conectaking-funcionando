#!/bin/bash
set -euo pipefail

docker stop ck-agent-n8n
sleep 2

python3 <<'PY'
import json, os, sqlite3, time
DB='/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
conn=sqlite3.connect(DB)
cur=conn.cursor()
nodes=json.loads(cur.execute("select nodes from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0])

CHAT = "={{ $('Preparar (texto/voz)').first().json.chatId }}"
TEXT = "={{ $json.outMessage || $json.output || 'Sem resposta.' }}"

fmt_admin = """const prep = $('Preparar (texto/voz)').first().json;
const prev = $input.first().json;
const out = String(prev.output || prev.text || '').trim();
const chatId = String(prep.chatId || prev.chatId || '');
if (!chatId) throw new Error('chatId vazio após Formatar Admin IA');
return [{ json: {
  ...prep,
  output: out,
  outMessage: out || 'Sem resposta da IA.',
  chatId,
  senderId: String(prep.senderId || ''),
  firstName: prep.firstName || '',
  text: prep.text || ''
}}];"""

fmt_cliente = """const prep = $('Preparar (texto/voz)').first().json;
const prev = $input.first().json;
let out = String(prev.output || prev.text || '').trim();
const escalate = /ESCALATE:\\s*YES/i.test(out) || /humano|falar com o king/i.test(String(prep.text || ''));
out = out.replace(/\\n?ESCALATE:\\s*(YES|NO)\\s*$/i, '').trim();
const chatId = String(prep.chatId || prev.chatId || '');
if (!chatId) throw new Error('chatId vazio após Formatar Cliente IA');
return [{ json: {
  ...prep,
  output: out,
  outMessage: out || 'Como posso ajudar?',
  chatId,
  senderId: String(prep.senderId || ''),
  firstName: prep.firstName || '',
  text: prep.text || '',
  escalate
}}];"""

for n in nodes:
    name = n.get('name')
    if name == 'Enviar Telegram':
        n['parameters']['chatId'] = CHAT
        n['parameters']['text'] = TEXT
        # also set additionalFields if any
        print('patched Enviar Telegram')
    if name == 'Formatar Admin IA':
        n['parameters']['jsCode'] = fmt_admin
        print('patched Formatar Admin IA')
    if name == 'Formatar Cliente IA':
        n['parameters']['jsCode'] = fmt_cliente
        print('patched Formatar Cliente IA')
    if name == 'Avisar Admin':
        # keep admin id from env
        print('Avisar Admin chatId=', n['parameters'].get('chatId'))

# bump updatedAt so n8n reloads
now = time.strftime('%Y-%m-%d %H:%M:%S.000')
cur.execute(
    "UPDATE workflow_entity SET nodes=?, active=1, updatedAt=? WHERE id=?",
    (json.dumps(nodes, ensure_ascii=False), now, 'mkK244lveO0N1qPR'),
)

# If n8n 2.x keeps published snapshot, update it too
try:
    tables = [r[0] for r in cur.execute("select name from sqlite_master where type='table'").fetchall()]
    if 'workflow_history' in tables:
        cols = [x[1] for x in cur.execute('pragma table_info(workflow_history)').fetchall()]
        print('workflow_history cols', cols)
        latest = cur.execute(
            "select versionId, nodes from workflow_history where workflowId=? order by createdAt desc limit 1",
            ('mkK244lveO0N1qPR',),
        ).fetchone()
        if latest:
            print('latest history version', latest[0])
            cur.execute(
                "UPDATE workflow_history SET nodes=? WHERE workflowId=? AND versionId=?",
                (json.dumps(nodes, ensure_ascii=False), 'mkK244lveO0N1qPR', latest[0]),
            )
            print('patched workflow_history latest')
    if 'workflow_published_version' in tables:
        cols = [x[1] for x in cur.execute('pragma table_info(workflow_published_version)').fetchall()]
        print('published cols', cols)
        rows = cur.execute("select * from workflow_published_version where workflowId=?", ('mkK244lveO0N1qPR',)).fetchall()
        print('published rows', len(rows))
except Exception as e:
    print('history patch skip', e)

conn.commit()
conn.close()
try:
    os.chown(DB, 1000, 1000)
except Exception:
    pass

# verify
conn=sqlite3.connect(DB)
nodes=json.loads(conn.execute("select nodes from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0])
for n in nodes:
    if n.get('name')=='Enviar Telegram':
        assert 'first().json.chatId' in n['parameters']['chatId'], n['parameters']['chatId']
        print('VERIFY Enviar', n['parameters']['chatId'])
    if n.get('name')=='Formatar Admin IA':
        assert 'first().json' in n['parameters']['jsCode']
        print('VERIFY Formatar Admin OK')
print('sqlite ok')
PY

cd /opt/ck-agent
docker compose --env-file .env up -d n8n
sleep 18
docker ps --filter name=ck-agent-n8n --format '{{.Status}}'
docker logs ck-agent-n8n --tail 15 2>&1 | grep -E 'Activated|ready|error|Error' || true

# confirm loaded workflow from API isn't easy without auth; re-read sqlite after start
python3 <<'PY'
import json,sqlite3
nodes=json.loads(sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite').execute("select nodes from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0])
for n in nodes:
  if n.get('name')=='Enviar Telegram':
    print('AFTER START Enviar chatId=', n['parameters']['chatId'])
PY
