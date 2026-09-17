#!/bin/bash
# deploy-vendedor-elite.sh
# Aplica o patch do vendedor de elite no n8n (SQLite live).
# Execute NO SERVIDOR: bash /opt/ck-agent/deploy-vendedor-elite.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCH="$SCRIPT_DIR/patch-vendedor-elite.py"
DB='/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'

echo "=== [1/4] Copiando patch para /tmp ..."
cp "$PATCH" /tmp/patch-vendedor-elite.py

echo "=== [2/4] Parando n8n ..."
docker stop ck-agent-n8n || true
sleep 3

echo "=== [3/4] Aplicando patch no banco SQLite ..."
python3 /tmp/patch-vendedor-elite.py

echo "=== [4/4] Subindo n8n novamente ..."
cd "$SCRIPT_DIR"
docker compose --env-file .env up -d n8n

# Aguarda health
for i in $(seq 1 18); do
  code=$(curl -sS -m 4 -o /dev/null -w '%{http_code}' http://127.0.0.1:5678/healthz || echo 000)
  echo "health check $i/18 → HTTP $code"
  [ "$code" = "200" ] && break
  sleep 5
done

echo ""
echo "=== Verificando patch aplicado ==="
python3 << 'PY'
import json, sqlite3
c = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
vid = c.execute("SELECT activeVersionId FROM workflow_entity WHERE id='mkK244lveO0N1qPR'").fetchone()[0]
nodes = json.loads(c.execute('SELECT nodes FROM workflow_history WHERE versionId=?', (vid,)).fetchone()[0])
for n in nodes:
    if n.get('name') == 'AI Agent Cliente':
        sm = (n.get('parameters') or {}).get('options', {}).get('systemMessage') or ''
        print(f'[OK] AI Agent Cliente systemMessage len = {len(sm)}')
        print(f'     has POSICIONAMENTO: {"POSICIONAMENTO" in sm}')
        print(f'     has ENSAIO FOTOGRAFICO: {"ENSAIO FOTOGRÁFICO" in sm}')
        print(f'     has NEUROVENDAS: {"NEUROVENDAS" in sm}')
        print(f'     has R$ 1.000: {"R$ 1.000" in sm}')
        print(f'     has ESCALATE: {"ESCALATE" in sm}')
        print(f'     has ANTI-DUPLICIDADE: {"ANTI-DUPLICIDADE" in sm}')
PY

docker ps --filter name=ck-agent-n8n --format '{{.Names}} → {{.Status}}'
echo ""
echo "✅ Deploy concluído! Teste o agente no Telegram."
