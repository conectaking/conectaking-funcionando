#!/bin/bash
set -euo pipefail
python3 <<'PY'
import json,sqlite3
c=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
vid=c.execute("select activeVersionId from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0]
nodes=json.loads(c.execute('select nodes from workflow_history where versionId=?',(vid,)).fetchone()[0])
for n in nodes:
  if n.get('name')=='Executar Admin':
    code=n['parameters']['jsCode']
    print(code[:3500])
    print('---TAIL---')
    print(code[-1500:])
PY
