#!/bin/bash
# deploy-king-master.sh
# Deploy MASTER: atualiza Agente Cliente + Bot Admin Financeiro de Elite.
# Execute NO SERVIDOR: bash /opt/ck-agent/deploy-king-master.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCH="$SCRIPT_DIR/patch-king-master.py"
DB='/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'

echo "========================================================"
echo " CK Agent — Deploy MASTER"
echo " Agente Cliente (Rapport) + Bot Admin (CFO Elite)"
echo "========================================================"

echo ""
echo "=== [1/4] Copiando patch para /tmp ..."
cp "$PATCH" /tmp/patch-king-master.py

echo ""
echo "=== [2/4] Parando n8n ..."
docker stop ck-agent-n8n || true
sleep 3

echo ""
echo "=== [3/4] Aplicando patch no banco SQLite ..."
python3 /tmp/patch-king-master.py

echo ""
echo "=== [4/4] Subindo n8n novamente ..."
cd "$SCRIPT_DIR"
docker compose --env-file .env up -d n8n

echo ""
echo "=== Aguardando n8n inicializar ..."
for i in $(seq 1 20); do
  code=$(curl -sS -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:5678/healthz || echo 000)
  echo "  health check $i/20 → HTTP $code"
  [ "$code" = "200" ] && break
  sleep 5
done

echo ""
echo "=== Verificando patches aplicados ==="
python3 << 'PY'
import json, sqlite3
c = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
vid = c.execute("SELECT activeVersionId FROM workflow_entity WHERE id='mkK244lveO0N1qPR'").fetchone()[0]
nodes = json.loads(c.execute('SELECT nodes FROM workflow_history WHERE versionId=?', (vid,)).fetchone()[0])
for n in nodes:
    nm = n.get('name', '')
    if nm == 'AI Agent Cliente':
        sm = (n.get('parameters') or {}).get('options', {}).get('systemMessage') or ''
        print(f'[OK] AI Agent Cliente: {len(sm)} chars')
        print(f'     RAPPORT: {"RAPPORT" in sm}')
        print(f'     PROIBIDO TEXTÃO: {"TEXTÃO" in sm}')
        print(f'     PASSO 1 (acolhimento): {"PASSO 1" in sm}')
        print(f'     ESCALATE: {"ESCALATE" in sm}')
    if nm == 'Executar Admin':
        js = (n.get('parameters') or {}).get('jsCode') or ''
        print(f'[OK] Executar Admin: {len(js)} chars JS')
        print(f'     delete_by_criteria: {"delete_by_criteria" in js}')
        print(f'     list_recent: {"list_recent" in js}')
        print(f'     adjust_cash: {"adjust_cash" in js}')
        print(f'     advice (CFO): {"advice" in js}')
        print(f'     fetchRecentTransactions: {"fetchRecentTransactions" in js}')
        print(f'     body.data.data fix: {"inner.data" in js}')
PY

echo ""
docker ps --filter name=ck-agent-n8n --format '{{.Names}} → {{.Status}}'
echo ""
echo "✅ Deploy MASTER concluído!"
echo "   Teste o agente cliente com 'Oi' → deve responder curto e com pergunta."
echo "   Teste 'tira os R\$ 300 que coloquei errado' → deve encontrar e remover."
echo "   Teste 'me dá um conselho de como melhorar meu faturamento' → CFO elite."
echo "   Teste 'tem algum erro no meu sistema?' → diagnóstico real de páginas."
