#!/bin/bash
set -euo pipefail
python3 <<'PY'
import json, sqlite3

def resolve(data):
    """Expand n8n v1 compact execution data to find node outputs."""
    if not (isinstance(data, list) and data and isinstance(data[0], dict) and data[0].get('version')==1):
        return data
    # recursive resolve indexes
    def R(x, depth=0):
        if depth>40: return x
        if isinstance(x, int) and 0 <= x < len(data):
            return R(data[x], depth+1)
        if isinstance(x, list):
            return [R(i, depth+1) for i in x]
        if isinstance(x, dict):
            return {k: R(v, depth+1) for k,v in x.items()}
        return x
    return R(data[1] if len(data)>1 else data)

c=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
raw=c.execute('select data from execution_data where executionId=112').fetchone()[0]
data=json.loads(raw)
full=resolve(data)
# print keys
rd=full.get('resultData',{}) if isinstance(full,dict) else {}
run=rd.get('runData',{})
print('nodes in runData:', list(run.keys()))
for name in ['Preparar (texto/voz)','Formatar Admin IA','Formatar Cliente IA','Enviar Telegram','AI Agent Admin','AI Agent Cliente','É Admin?']:
    if name not in run: continue
    entries=run[name]
    print('\n###', name)
    try:
        j=entries[0]['data']['main'][0][0]['json']
        # redact long text
        slim={k:(str(v)[:120] if not isinstance(v,(dict,list)) else type(v).__name__) for k,v in j.items()}
        print(json.dumps(slim, ensure_ascii=False, indent=2)[:800])
    except Exception as e:
        print('parse fail', e, str(entries)[:300])

err=rd.get('error')
print('\nERROR:', json.dumps(err, ensure_ascii=False)[:500] if err else None)
print('lastNode', rd.get('lastNodeExecuted'))
PY
