#!/bin/bash
python3 <<'PY'
import json,sqlite3
c=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
vid=c.execute("select activeVersionId from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0]
nodes=json.loads(c.execute('select nodes from workflow_history where versionId=?',(vid,)).fetchone()[0])
for n in nodes:
    if 'Memória' in n.get('name','') or n.get('name') in ('Preparar (texto/voz)','É Admin?','Formatar Admin IA'):
        print(n['name'], 'pos', n.get('position'), 'params', json.dumps(n.get('parameters'), ensure_ascii=False)[:700])
        print('---')
PY
