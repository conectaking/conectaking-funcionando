#!/bin/bash
set -euo pipefail

echo "=== fix Caddy (no gzip on websocket) ==="
python3 <<'PY'
from pathlib import Path
p = Path('/etc/caddy/Caddyfile')
t = p.read_text()
old = '''n8n.conectaking.com.br {
	encode gzip
	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
	}
	reverse_proxy 127.0.0.1:5678
}'''
new = '''n8n.conectaking.com.br {
	@notWs {
		not header Connection *Upgrade*
		not header Upgrade websocket
	}
	encode @notWs gzip
	header {
		X-Content-Type-Options nosniff
		Referrer-Policy strict-origin-when-cross-origin
	}
	reverse_proxy 127.0.0.1:5678
}'''
if old in t:
    p.write_text(t.replace(old, new))
    print('caddy patched')
elif '@notWs' in t and 'n8n.conectaking.com.br' in t:
    print('caddy already patched')
else:
    print('WARN: n8n block not matched exactly; dumping snippet')
    idx = t.find('n8n.conectaking.com.br')
    print(repr(t[idx:idx+350]))
PY
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy

echo "=== stop n8n + patch workflow ==="
docker stop ck-agent-n8n
sleep 2
python3 /tmp/patch-intent-voice-ui.py

cp /tmp/ck-agent-docker-compose.yml /opt/ck-agent/docker-compose.yml
cd /opt/ck-agent
# ensure push backend in .env optional
grep -q '^N8N_PUSH_BACKEND=' .env || echo 'N8N_PUSH_BACKEND=sse' >> .env
docker compose --env-file .env up -d n8n

for i in $(seq 1 12); do
  code=$(curl -sS -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:5678/healthz || echo 000)
  echo "health $i $code"
  [ "$code" = "200" ] && break
  sleep 5
done

docker exec ck-agent-n8n printenv N8N_PUSH_BACKEND
python3 <<'PY'
import json,sqlite3
c=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
vid=c.execute("select activeVersionId from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0]
nodes=json.loads(c.execute('select nodes from workflow_history where versionId=?',(vid,)).fetchone()[0])
for n in nodes:
  if n.get('name')=='Intent Admin':
    print('intent has isVoiceFail', 'isVoiceFail' in n['parameters']['jsCode'])
    print('intent has wordbound recebi', r'\brecebi\b' in n['parameters']['jsCode'])
  if n.get('name')=='Preparar (texto/voz)':
    print('prep whisperViaCurlStyle', 'whisperViaCurlStyle' in n['parameters']['jsCode'])
PY
docker ps --filter name=ck-agent-n8n --format '{{.Status}}'
echo DONE
