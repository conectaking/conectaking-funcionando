#!/bin/bash
set -euo pipefail
python3 <<'PY'
import json, sqlite3
c = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
vid = c.execute("select activeVersionId from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0]
nodes = json.loads(c.execute('select nodes from workflow_history where versionId=?', (vid,)).fetchone()[0])
want = ('GET Health','AI Agent Cliente','AI Agent Admin','Telegram Trigger','Formatar Cliente IA','OpenAI Model Cliente')
for n in nodes:
    if n.get('name') in want:
        p = dict(n.get('parameters') or {})
        if 'jsCode' in p: p['jsCode'] = p['jsCode'][:180]+'...'
        if 'text' in p and isinstance(p['text'], str) and len(p['text'])>200: p['text']=p['text'][:200]+'...'
        if 'options' in p and isinstance(p['options'], dict) and 'systemMessage' in p['options']:
            p = {**p, 'options': {**p['options'], 'systemMessage': p['options']['systemMessage'][:250]+'...'}}
        print('\n====', n['name'], n['type'], 'v'+str(n.get('typeVersion')))
        print(json.dumps({k:n.get(k) for k in ('id','typeVersion','credentials','position')}, ensure_ascii=False))
        print(json.dumps(p, ensure_ascii=False)[:1800])
print('\nstaticData', c.execute("select staticData from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0][:500])
PY
