#!/bin/bash
set -euo pipefail
python3 <<'PY'
import json, sqlite3
c = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
print('execs:')
for r in c.execute("select id,status,mode,startedAt,stoppedAt from execution_entity order by startedAt desc limit 12"):
    print(r)
vid = c.execute("select activeVersionId from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0]
nodes = json.loads(c.execute('select nodes from workflow_history where versionId=?', (vid,)).fetchone()[0])
conns = json.loads(c.execute('select connections from workflow_history where versionId=?', (vid,)).fetchone()[0])
print('\nNODES:')
for n in nodes:
    print('-', n.get('name'), n.get('type'), n.get('id'))
print('\nCONNECTIONS keys:', list(conns.keys()))
print(json.dumps(conns, ensure_ascii=False)[:2500])
print('\n--- AI Cliente SM head ---')
for n in nodes:
    if n.get('name')=='AI Agent Cliente':
        sm=(n.get('parameters') or {}).get('options',{}).get('systemMessage') or n.get('parameters',{}).get('systemMessage') or ''
        print(sm[:800])
    if n.get('name')=='Preparar (texto/voz)':
        print('prep len', len(n['parameters'].get('jsCode','')))
PY
docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' ck-agent-n8n
docker logs ck-agent-n8n --since 10m 2>&1 | grep -Ei 'oom|memory|error|Task|Offer|crash' | tail -25
