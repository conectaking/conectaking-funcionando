#!/bin/bash
set -euo pipefail
python3 <<'PY'
import json, sqlite3
DB = '/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
c = sqlite3.connect(DB)
nodes = json.loads(c.execute("select nodes from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0])
active = c.execute("select active from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0]
print('active', active)
for n in nodes:
    if n.get('name') in ('Enviar Telegram', 'Formatar Cliente IA', 'Formatar Admin IA'):
        p = n.get('parameters', {})
        print('---', n['name'])
        if 'chatId' in p:
            print('chatId=', p['chatId'][:100])
        if 'text' in p:
            print('text=', p['text'][:100])
        if 'jsCode' in p:
            print('jsCode head=', p['jsCode'][:140].replace('\n', ' | '))
rows = c.execute(
    "select id, status, mode, startedAt from execution_entity order by startedAt desc limit 8"
).fetchall()
print('recent execs:')
for r in rows:
    print(r)
PY
