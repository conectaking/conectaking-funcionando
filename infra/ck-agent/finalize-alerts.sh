#!/bin/bash
set -euo pipefail
set -a
# shellcheck disable=SC1091
. /opt/ck-agent/.env
set +a

echo "=== public webhook ==="
curl -sS -m 20 -o /tmp/wpub.txt -w "pub %{http_code}\n" -X POST \
  "https://n8n.conectaking.com.br/webhook/ck-agent-sentry" \
  -H "Content-Type: application/json" \
  -H "X-Ck-Secret: ${CK_SENTRY_WEBHOOK_SECRET}" \
  --data-binary "{\"title\":\"ops.alert_pipeline_ok\",\"message\":\"Teste publico Sentry→Telegram\",\"level\":\"warning\",\"project\":\"conectaking\",\"secret\":\"${CK_SENTRY_WEBHOOK_SECRET}\"}"
head -c 200 /tmp/wpub.txt; echo

echo "=== laravel OpsAlert ==="
if [ -f /tmp/OpsAlertService.php ]; then
  docker cp /tmp/OpsAlertService.php conectaking-laravel:/app/app/Services/OpsAlertService.php
fi
SECRET="$CK_SENTRY_WEBHOOK_SECRET"
for c in conectaking-laravel conectaking-queue conectaking-scheduler; do
  docker exec "$c" sh -c "
    if [ -f /app/.env ]; then
      sed -i '/^CK_AGENT_ALERT_WEBHOOK=/d;/^CK_SENTRY_WEBHOOK_SECRET=/d' /app/.env
      echo 'CK_AGENT_ALERT_WEBHOOK=https://n8n.conectaking.com.br/webhook/ck-agent-sentry' >> /app/.env
      echo 'CK_SENTRY_WEBHOOK_SECRET=${SECRET}' >> /app/.env
    fi
  " || true
done
docker exec conectaking-laravel php artisan config:clear || true
docker exec conectaking-laravel php artisan maintenance:ops-alert 'ops.alert_pipeline_ok' --level=warn || true

echo "=== voice/chatId verify ==="
python3 <<'PY'
import json, sqlite3
c = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
vid = c.execute("select activeVersionId from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0]
nodes = json.loads(c.execute('select nodes from workflow_history where versionId=?', (vid,)).fetchone()[0])
for n in nodes:
    if n.get('name') == 'Preparar (texto/voz)':
        code = n['parameters']['jsCode']
        print('voice ckVoice boundary', 'ckVoice' in code)
        print('has FormData', 'FormData' in code)
        print('has Blob', 'Blob' in code)
    if n.get('name') == 'Enviar Telegram':
        print('chatId', n['parameters'].get('chatId'))
print('recent', c.execute("select id,status,mode,startedAt from execution_entity order by startedAt desc limit 8").fetchall())
settings = c.execute("select settings from workflow_entity where id='mkK244lveO0N1qPR'").fetchone()[0]
print('settings', settings)
PY

echo "=== n8n status ==="
docker ps --filter name=ck-agent-n8n --format '{{.Status}}'
curl -sS -m 5 -o /dev/null -w "health %{http_code}\n" http://127.0.0.1:5678/healthz
