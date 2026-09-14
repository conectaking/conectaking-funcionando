#!/bin/bash
set -euo pipefail
python3 <<'PY'
import json, sqlite3

c=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
raw=c.execute('select data from execution_data where executionId=112').fetchone()[0]
data=json.loads(raw)

def R(x, depth=0):
    if depth>50: return x
    if isinstance(x, str) and x.isdigit():
        i=int(x)
        if 0 <= i < len(data):
            return R(data[i], depth+1)
    if isinstance(x, int) and 0 <= x < len(data) and not isinstance(x, bool):
        # only treat as pointer if looking at compact refs; ints in json values are tricky
        # In n8n format pointers are strings. Keep ints as ints unless we're in pointer context.
        return x
    if isinstance(x, list):
        return [R(i, depth+1) for i in x]
    if isinstance(x, dict):
        return {k: R(v, depth+1) for k,v in x.items()}
    return x

root = R(data[0])
# root should be expanded map; get resultData via original pointers
rd = R(data[0].get('resultData'))
run = rd.get('runData') or {}
print('runData nodes:', list(run.keys()))
for name in ['Preparar (texto/voz)','Formatar Admin IA','Formatar Cliente IA','Enviar Telegram','AI Agent Admin','AI Agent Cliente','Resposta Cliente','Executar Admin']:
    if name not in run:
        continue
    print('\n###', name)
    entries = run[name]
    try:
        j = entries[0]['data']['main'][0][0]['json']
        slim = {}
        for k,v in j.items():
            if k in ('message',):
                slim[k] = '{obj}'
            elif isinstance(v, (dict, list)):
                slim[k] = type(v).__name__
            else:
                slim[k] = str(v)[:160]
        print(json.dumps(slim, ensure_ascii=False, indent=2))
    except Exception as e:
        print('fail', e)
        print(str(entries)[:400])

err = rd.get('error')
print('\nlastNode', rd.get('lastNodeExecuted'))
if isinstance(err, dict):
    print('error.message', err.get('message'))
    print('error.description', err.get('description'))
    node=err.get('node') or {}
    print('error.node.name', node.get('name'))
    print('error.node.params.chatId', (node.get('parameters') or {}).get('chatId'))
    print('error.node.params.text', str((node.get('parameters') or {}).get('text'))[:120])
PY
