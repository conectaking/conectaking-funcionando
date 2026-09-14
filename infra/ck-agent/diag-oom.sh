#!/bin/bash
set -euo pipefail
echo "=== n8n mem/status ==="
docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' ck-agent-n8n
docker ps --filter name=ck-agent-n8n --format '{{.Status}}'
free -h | head -2
echo "=== exec 131 ==="
python3 <<'PY'
import json,sqlite3
c=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
for eid in (131,130,129,128):
  row=c.execute('select id,status,mode,startedAt,stoppedAt from execution_entity where id=?',(eid,)).fetchone()
  print('meta', row)
  if not row: continue
  raw=c.execute('select data from execution_data where executionId=?',(eid,)).fetchone()
  if not raw: continue
  text=raw[0] if isinstance(raw[0],str) else raw[0].decode('utf-8','ignore')
  for k in ('out-of-memory','OOM','chat_id','Bad Request','voice','Whisper','Error','crashed','Task rejected','Offer expired'):
    if k.lower() in text.lower():
      print(' ', eid, 'has', k)
  # find error message strings in compact format
  try:
    data=json.loads(text)
    for i,v in enumerate(data if isinstance(data,list) else []):
      if isinstance(v,str) and any(x in v.lower() for x in ('memory','oom','whisper','400','failed','error')):
        if len(v)<300: print('  str', i, v)
        else: print('  str', i, v[:220])
  except Exception as e:
    print('parse', e)
PY
echo "=== compose mem ==="
grep -A2 mem_limit /opt/ck-agent/docker-compose.yml | head -6
grep N8N_PUSH /opt/ck-agent/.env || true
docker exec ck-agent-n8n printenv N8N_PUSH_BACKEND || true
