#!/bin/bash
set -euo pipefail

echo "=== DSN Laravel ==="
DSN=$(docker exec conectaking-laravel printenv SENTRY_LARAVEL_DSN 2>/dev/null || true)
if [ -z "$DSN" ]; then
  DSN=$(docker exec conectaking-laravel printenv SENTRY_DSN 2>/dev/null || true)
fi
if [ -z "$DSN" ]; then
  # try host env files without printing secret fully
  for f in /opt/conectaking/laravel/.env /opt/conectaking/.env; do
    if [ -f "$f" ] && grep -qE '^SENTRY_(LARAVEL_)?DSN=' "$f"; then
      DSN=$(grep -E '^SENTRY_(LARAVEL_)?DSN=' "$f" | head -1 | cut -d= -f2-)
      break
    fi
  done
fi
echo "DSN len=${#DSN} prefix=$(printf '%s' "$DSN" | cut -c1-25)"

if [ -z "$DSN" ] || [ "${#DSN}" -lt 20 ]; then
  echo "SEM DSN — não dá para ligar Sentry agora"
  exit 2
fi

# upsert into ck-agent .env
python3 - <<PY
import os
from pathlib import Path
p=Path('/opt/ck-agent/.env')
dsn=os.environ.get('DSN') or '''$DSN'''
# safer via env
PY
DSN="$DSN" python3 - <<'PY'
import os
from pathlib import Path
p=Path('/opt/ck-agent/.env')
dsn=os.environ['DSN']
lines=p.read_text(encoding='utf-8').splitlines()
out=[]; seen=set()
for line in lines:
    if line.startswith('N8N_SENTRY_DSN=') or line.startswith('SENTRY_DSN='):
        continue
    out.append(line)
out.append('N8N_SENTRY_DSN='+dsn)
out.append('SENTRY_DSN='+dsn)
out.append('ENVIRONMENT=production')
out.append('DEPLOYMENT_NAME=ck-agent-n8n')
p.write_text('\n'.join(out)+'\n', encoding='utf-8')
print('env updated')
PY

echo "=== fix chatId + compose sentry ==="
cp /tmp/ck-agent-docker-compose.yml /opt/ck-agent/docker-compose.yml

docker stop ck-agent-n8n
sleep 2

python3 <<'PY'
import json, os, sqlite3
DB='/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
conn=sqlite3.connect(DB)
cur=conn.cursor()
nodes=json.loads(cur.execute("select nodes from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0])
conns=json.loads(cur.execute("select connections from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0])

# Fix Telegram send nodes to always use chatId from Preparar
CHAT = "={{ $('Preparar (texto/voz)').item.json.chatId }}"
TEXT = "={{ $json.outMessage || $json.output || $json.text }}"

for n in nodes:
    if n.get('type')=='n8n-nodes-base.telegram' and n.get('name') in ('Enviar Telegram',):
        n['parameters']['chatId']=CHAT
        n['parameters']['text']=TEXT
        print('fixed', n['name'])
    if n.get('name')=='Formatar Admin IA':
        n['parameters']['jsCode'] = (
            "const prep=$('Preparar (texto/voz)').item.json;\n"
            "const prev=$input.first().json;\n"
            "const out=String(prev.output||prev.text||'').trim();\n"
            "return [{json:{...prep,...prev, chatId: prep.chatId, outMessage: out || 'Sem resposta da IA.'}}];"
        )
        print('fixed Formatar Admin IA')
    if n.get('name')=='Formatar Cliente IA':
        n['parameters']['jsCode'] = (
            "const prep=$('Preparar (texto/voz)').item.json;\n"
            "const prev=$input.first().json;\n"
            "let out=String(prev.output||prev.text||'').trim();\n"
            "let escalate=/ESCALATE:\\s*YES/i.test(out)||/humano|falar com o king/i.test(String(prep.text||''));\n"
            "out=out.replace(/\\n?ESCALATE:\\s*(YES|NO)\\s*$/i,'').trim();\n"
            "return [{json:{...prep,...prev, chatId: prep.chatId, text: prep.text, firstName: prep.firstName, senderId: prep.senderId, outMessage: out || 'Como posso ajudar?', escalate}}];"
        )
        print('fixed Formatar Cliente IA')
    if n.get('name')=='Executar Admin':
        # ensure out keeps chatId from input
        code=n['parameters'].get('jsCode','')
        if 'chatId' in code and 'return [{ json: { ...prev, outMessage: msg } }]' in code:
            print('Executar Admin already spreads prev')
        print('Executar Admin present')

# Error path: Error Trigger -> HTTP to Sentry envelope is heavy; use n8n native Sentry via env.
# Also add Error Workflow nodes optional - skip for now.

cur.execute("UPDATE workflow_entity SET nodes=?, active=1 WHERE id=?",
            (json.dumps(nodes, ensure_ascii=False), 'mkK244lveO0N1qPR'))
conn.commit(); conn.close()
os.chown(DB, 1000, 1000)
print('ok')
PY

cd /opt/ck-agent
docker compose --env-file .env up -d n8n
sleep 20
docker ps --filter name=ck-agent-n8n --format '{{.Status}} {{.Image}}'
docker exec ck-agent-n8n printenv N8N_SENTRY_DSN | wc -c
docker logs ck-agent-n8n --tail 25 2>&1
set -a; . /opt/ck-agent/.env; set +a
curl -sS --connect-timeout 20 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"; echo
