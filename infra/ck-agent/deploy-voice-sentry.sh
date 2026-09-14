#!/bin/bash
set -euo pipefail

SECRET="${CK_SENTRY_WEBHOOK_SECRET:-}"
if [ -z "$SECRET" ]; then
  SECRET=$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')
fi

# upsert secret + webhook URL into ck-agent .env
python3 - <<PY
from pathlib import Path
secret = '''$SECRET'''
p = Path('/opt/ck-agent/.env')
lines = p.read_text(encoding='utf-8').splitlines()
keys = {
  'CK_SENTRY_WEBHOOK_SECRET': secret,
}
out = []
seen = set()
for line in lines:
  hit = False
  for k in keys:
    if line.startswith(k + '='):
      out.append(k + '=' + keys[k]); seen.add(k); hit = True; break
  if not hit:
    out.append(line)
for k,v in keys.items():
  if k not in seen:
    out.append(k + '=' + v)
p.write_text('\n'.join(out) + '\n', encoding='utf-8')
print('ck-agent env secret ok')
PY

# Laravel .env.prod (host) — webhook aponta para n8n
for f in /opt/conectaking/.env.prod /opt/conectaking/laravel/.env; do
  if [ -f "$f" ]; then
    python3 - <<PY
from pathlib import Path
secret = '''$SECRET'''
p = Path('''$f''')
keys = {
  'CK_AGENT_ALERT_WEBHOOK': 'https://n8n.conectaking.com.br/webhook/ck-agent-sentry',
  'CK_SENTRY_WEBHOOK_SECRET': secret,
}
lines = p.read_text(encoding='utf-8').splitlines()
out=[]; seen=set()
for line in lines:
  hit=False
  for k in keys:
    if line.startswith(k+'='):
      out.append(k+'='+keys[k]); seen.add(k); hit=True; break
  if not hit: out.append(line)
for k,v in keys.items():
  if k not in seen: out.append(k+'='+v)
p.write_text('\n'.join(out)+'\n', encoding='utf-8')
print('updated', p)
PY
  fi
done

echo "=== stop n8n (avoid sqlite lock) ==="
docker stop ck-agent-n8n
sleep 3

python3 /tmp/patch-voice-sentry.py

# sync compose from /tmp if present
if [ -f /tmp/ck-agent-docker-compose.yml ]; then
  cp /tmp/ck-agent-docker-compose.yml /opt/ck-agent/docker-compose.yml
fi

cd /opt/ck-agent
docker compose --env-file .env up -d n8n
echo "waiting health..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sS -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:5678/healthz | grep -q 200; then
    echo "healthy"
    break
  fi
  sleep 5
done
docker ps --filter name=ck-agent-n8n --format '{{.Status}}'

# patch OpsAlertService inside laravel container
if [ -f /tmp/OpsAlertService.php ]; then
  docker cp /tmp/OpsAlertService.php conectaking-laravel:/app/app/Services/OpsAlertService.php || true
  # inject env into running laravel without full recreate if possible
  docker exec conectaking-laravel sh -c "grep -q CK_AGENT_ALERT_WEBHOOK /app/.env 2>/dev/null || true"
fi

# Also set env on laravel via compose is better — try docker exec printenv after recreate hint
# Reload PHP-FPM / octane not needed for file_get_contents env if we export via docker update — skip;
# inject into container env file if exists
for c in conectaking-laravel conectaking-queue conectaking-scheduler; do
  docker exec "$c" sh -c "
    if [ -f /app/.env ]; then
      sed -i '/^CK_AGENT_ALERT_WEBHOOK=/d;/^CK_SENTRY_WEBHOOK_SECRET=/d' /app/.env
      echo 'CK_AGENT_ALERT_WEBHOOK=https://n8n.conectaking.com.br/webhook/ck-agent-sentry' >> /app/.env
      echo 'CK_SENTRY_WEBHOOK_SECRET=$SECRET' >> /app/.env
    fi
  " 2>/dev/null || true
done

echo "=== test sentry webhook ==="
sleep 8
curl -sS -m 15 -o /tmp/sentry-wh-out.txt -w 'HTTP %{http_code}\n' -X POST \
  'https://n8n.conectaking.com.br/webhook/ck-agent-sentry' \
  -H 'Content-Type: application/json' \
  -H "X-Ck-Secret: $SECRET" \
  --data-binary '{"title":"ops.alert_pipeline_ok","message":"Teste: pipeline Sentry→Agente→Telegram OK","level":"warning","project":"conectaking","environment":"production","server_name":"manual-test"}'
head -c 300 /tmp/sentry-wh-out.txt; echo

echo "SECRET=$SECRET"
echo DONE
