#!/bin/bash
set -euo pipefail
python3 <<'PY'
import json, sqlite3

def resolve(data):
    def R(x, depth=0):
        if depth > 40:
            return x
        if isinstance(x, str) and x.isdigit():
            i = int(x)
            if 0 <= i < len(data):
                return R(data[i], depth + 1)
        if isinstance(x, list):
            return [R(i, depth + 1) for i in x]
        if isinstance(x, dict):
            return {k: R(v, depth + 1) for k, v in x.items()}
        return x
    return R(data[0]) if isinstance(data, list) else data

c = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
for eid in (121, 120):
    print('====', eid)
    row = c.execute('select status, workflowId from execution_entity where id=?', (eid,)).fetchone()
    print('meta', row)
    raw = c.execute('select data from execution_data where executionId=?', (eid,)).fetchone()
    if not raw:
        continue
    data = json.loads(raw[0])
    rd = resolve(data)
    # resultData may still be pointer string resolved inside root
    if isinstance(rd, dict) and 'resultData' in rd:
        result = rd['resultData']
    else:
        # fallback: resolve resultData from map
        result = resolve(data) if False else None
        root = data[0]
        result = None
        if isinstance(root, dict) and 'resultData' in root:
            idx = root['resultData']
            result = resolve([{**root}, *data[1:]])  # noqa
    # simpler scan
    text = json.dumps(data, ensure_ascii=False)
    for key in ('Bad Request', 'ok":true', 'message_id', 'chat_id is empty', 'Workflow was started', 'error'):
        if key in text:
            print('contains', key)
    # find runData node names via string search
    if 'Avisar Admin TG' in text:
        print('hit Avisar Admin TG')
    if '"ok"' in text and 'message_id' in text:
        print('likely telegram ok')
PY
