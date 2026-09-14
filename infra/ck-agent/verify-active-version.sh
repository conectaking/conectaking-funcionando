#!/bin/bash
set -euo pipefail
docker ps --filter name=ck-agent-n8n --format '{{.Status}}'
python3 <<'PY'
import json, sqlite3
c = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
vid = c.execute("select activeVersionId from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0]
nodes = json.loads(c.execute('select nodes from workflow_history where versionId=?', (vid,)).fetchone()[0])
for n in nodes:
    if n.get('name') == 'Enviar Telegram':
        print('ACTIVE hist Enviar chatId=', n['parameters'].get('chatId'))
    if n.get('name') == 'Formatar Admin IA':
        print('ACTIVE hist Formatar has first=', 'first().json' in n['parameters'].get('jsCode',''))
print('activeVersionId', vid)
PY
