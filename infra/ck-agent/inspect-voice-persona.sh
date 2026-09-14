#!/bin/bash
set -euo pipefail
echo "=== last voice-related exec ==="
python3 <<'PY'
import json,sqlite3
c=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
for r in c.execute("select id,status,mode,startedAt from execution_entity where mode='webhook' order by startedAt desc limit 8"):
    print(r)

def resolve_root(data):
    def R(x,d=0):
        if d>50: return x
        if isinstance(x,str) and x.isdigit():
            i=int(x)
            if 0<=i<len(data): return R(data[i],d+1)
        if isinstance(x,list): return [R(i,d+1) for i in x]
        if isinstance(x,dict): return {k:R(v,d+1) for k,v in x.items()}
        return x
    return R(data[0])

eid=c.execute("select id from execution_entity where mode='webhook' order by startedAt desc limit 1").fetchone()[0]
raw=c.execute('select data from execution_data where executionId=?',(eid,)).fetchone()[0]
data=json.loads(raw)
rd=resolve_root(data).get('resultData') or {}
run=rd.get('runData') or {}
print('last eid', eid, 'nodes', list(run.keys()))
for name in ('Preparar (texto/voz)','AI Agent Cliente','Formatar Cliente IA','Enviar Telegram'):
    if name not in run: continue
    try:
        j=run[name][0]['data']['main'][0][0]['json']
        slim={k:(str(v)[:180] if not isinstance(v,(dict,list)) else type(v).__name__) for k,v in j.items() if k!='message'}
        print('###', name, json.dumps(slim, ensure_ascii=False)[:500])
    except Exception as e:
        print(name, e)

# find active AI Agent Cliente system message length
vid=c.execute("select activeVersionId from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0]
nodes=json.loads(c.execute('select nodes from workflow_history where versionId=?',(vid,)).fetchone()[0])
for n in nodes:
    if n.get('name')=='AI Agent Cliente':
        p=n.get('parameters') or {}
        sm=(p.get('options') or {}).get('systemMessage') or p.get('systemMessage') or p.get('text') or ''
        print('systemMessage len', len(sm))
        print(sm[:400])
    if n.get('name')=='Preparar (texto/voz)':
        print('prep has ckVoice', 'ckVoice' in n['parameters'].get('jsCode',''))
PY
