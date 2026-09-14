#!/bin/bash
set -euo pipefail

echo "=== DSN Laravel ==="
DSN=""
DSN=$(docker exec conectaking-laravel printenv SENTRY_LARAVEL_DSN 2>/dev/null || true)
if [ -z "$DSN" ]; then
  DSN=$(docker exec conectaking-laravel printenv SENTRY_DSN 2>/dev/null || true)
fi
if [ -z "$DSN" ]; then
  for f in /opt/conectaking/laravel/.env /opt/conectaking/.env /opt/conectaking/.env.prod; do
    if [ -f "$f" ] && grep -qE '^SENTRY_(LARAVEL_)?DSN=' "$f"; then
      DSN=$(grep -E '^SENTRY_(LARAVEL_)?DSN=' "$f" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'")
      break
    fi
  done
fi
echo "DSN len=${#DSN} prefix=$(printf '%s' "$DSN" | cut -c1-28)..."

if [ -z "$DSN" ] || [ "${#DSN}" -lt 20 ]; then
  echo "SEM DSN — não dá para ligar Sentry agora"
  exit 2
fi

export DSN
python3 - <<'PY'
from pathlib import Path
import os
p = Path('/opt/ck-agent/.env')
dsn = os.environ['DSN']
lines = p.read_text(encoding='utf-8').splitlines()
out = []
for line in lines:
    if line.startswith('N8N_SENTRY_DSN=') or line.startswith('SENTRY_DSN='):
        continue
    if line.startswith('ENVIRONMENT=') or line.startswith('DEPLOYMENT_NAME='):
        continue
    out.append(line)
out.append('N8N_SENTRY_DSN=' + dsn)
out.append('SENTRY_DSN=' + dsn)
out.append('ENVIRONMENT=production')
out.append('DEPLOYMENT_NAME=ck-agent-n8n')
p.write_text('\n'.join(out) + '\n', encoding='utf-8')
print('env updated')
PY

echo "=== compose + chatId fix ==="
cp /tmp/ck-agent-docker-compose.yml /opt/ck-agent/docker-compose.yml

docker stop ck-agent-n8n || true
sleep 2

python3 <<'PY'
import json, os, sqlite3
DB = '/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'
conn = sqlite3.connect(DB)
cur = conn.cursor()
row = cur.execute("select nodes from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()
if not row:
    raise SystemExit('workflow mkK244lveO0N1qPR not found')
nodes = json.loads(row[0])

CHAT = "={{ $('Preparar (texto/voz)').item.json.chatId }}"
TEXT = "={{ $json.outMessage || $json.output || $json.text }}"

for n in nodes:
    name = n.get('name')
    if n.get('type') == 'n8n-nodes-base.telegram' and name == 'Enviar Telegram':
        n['parameters']['chatId'] = CHAT
        n['parameters']['text'] = TEXT
        print('fixed Enviar Telegram')
    if name == 'Formatar Admin IA':
        n['parameters']['jsCode'] = (
            "const prep=$('Preparar (texto/voz)').item.json;\n"
            "const prev=$input.first().json;\n"
            "const out=String(prev.output||prev.text||'').trim();\n"
            "return [{json:{...prep,...prev, chatId: prep.chatId, outMessage: out || 'Sem resposta da IA.'}}];"
        )
        print('fixed Formatar Admin IA')
    if name == 'Formatar Cliente IA':
        n['parameters']['jsCode'] = (
            "const prep=$('Preparar (texto/voz)').item.json;\n"
            "const prev=$input.first().json;\n"
            "let out=String(prev.output||prev.text||'').trim();\n"
            "let escalate=/ESCALATE:\\s*YES/i.test(out)||/humano|falar com o king/i.test(String(prep.text||''));\n"
            "out=out.replace(/\\n?ESCALATE:\\s*(YES|NO)\\s*$/i,'').trim();\n"
            "return [{json:{...prep,...prev, chatId: prep.chatId, text: prep.text, firstName: prep.firstName, senderId: prep.senderId, outMessage: out || 'Como posso ajudar?', escalate}}];"
        )
        print('fixed Formatar Cliente IA')

cur.execute(
    "UPDATE workflow_entity SET nodes=?, active=1, updatedAt=CURRENT_TIMESTAMP WHERE id=?",
    (json.dumps(nodes, ensure_ascii=False), 'mkK244lveO0N1qPR'),
)
conn.commit()
conn.close()
try:
    os.chown(DB, 1000, 1000)
except PermissionError:
    pass
print('sqlite ok')
PY

cd /opt/ck-agent
docker compose --env-file .env up -d n8n
sleep 22
docker ps --filter name=ck-agent-n8n --format '{{.Status}} {{.Image}}'
echo -n 'N8N_SENTRY_DSN chars: '
docker exec ck-agent-n8n printenv N8N_SENTRY_DSN | wc -c
echo -n 'N8N_RUNNERS_ENABLED: '
docker exec ck-agent-n8n printenv N8N_RUNNERS_ENABLED || true
docker logs ck-agent-n8n --tail 40 2>&1 | sed 's/@[^ ]*ingest/@***ingest/g'

set -a
# shellcheck disable=SC1091
. /opt/ck-agent/.env
set +a
echo '=== webhook ==='
curl -sS --connect-timeout 20 "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
echo
