#!/bin/bash
set -euo pipefail
python3 <<'PY'
import json, sqlite3, zlib, gzip, base64
DB='/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
c=sqlite3.connect(DB)

# schema
print('tables:', [r[0] for r in c.execute("select name from sqlite_master where type='table'").fetchall()])
cols=c.execute('pragma table_info(execution_entity)').fetchall()
print('execution_entity cols:', [x[1] for x in cols])
try:
    cols2=c.execute('pragma table_info(execution_data)').fetchall()
    print('execution_data cols:', [x[1] for x in cols2])
except Exception as e:
    print('no execution_data', e)

for eid in (112, 110, 106):
    print('\n==== EXEC', eid, '====')
    row=c.execute('select status, mode, startedAt, finished, workflowId from execution_entity where id=?', (eid,)).fetchone()
    print('meta', row)
    # try execution_data
    try:
        d=c.execute('select data from execution_data where executionId=?', (eid,)).fetchone()
        if d:
            raw=d[0]
            if isinstance(raw, memoryview): raw=raw.tobytes()
            if isinstance(raw, bytes):
                for decoder in (lambda x: x.decode('utf-8'), lambda x: zlib.decompress(x).decode('utf-8'), lambda x: gzip.decompress(x).decode('utf-8')):
                    try:
                        text=decoder(raw)
                        break
                    except Exception:
                        text=None
                if text is None:
                    print('bytes len', len(raw), 'head', raw[:40])
                    continue
            else:
                text=str(raw)
            # find error message
            if '"message"' in text or 'chat_id' in text or 'Error' in text:
                # print compressed json pointers resolution if versioned
                try:
                    data=json.loads(text)
                except Exception:
                    print(text[:800]); continue
                # n8n compact format: list of strings with indexes
                if isinstance(data, list) and data and isinstance(data[0], dict) and data[0].get('version')==1:
                    # flatten find string with Bad Request / chat
                    for i,v in enumerate(data):
                        if isinstance(v,str) and any(k in v for k in ('chat_id','Bad Request','Error','Offer','expired','Task rejected','Node')):
                            print(i, v[:300])
                        if isinstance(v,dict) and 'message' in v:
                            print('dict msg', v.get('message'), v.get('name'), v.get('description'))
                else:
                    s=json.dumps(data)[:2000]
                    print(s)
            else:
                print('no obvious error strings, len', len(text))
                print(text[:500])
    except Exception as e:
        print('data err', e)

# also inspect workflow node names for AI path
nodes=json.loads(c.execute("select nodes from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0])
print('\nNODE NAMES:')
for n in nodes:
    print('-', n.get('name'), n.get('type'), 'ver', n.get('typeVersion'))
PY

echo "=== docker logs around 01:50 ==="
docker logs ck-agent-n8n --since 15m 2>&1 | tail -80
