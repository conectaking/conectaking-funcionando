#!/bin/bash
# deploy-finance-fix.sh — Correção emergencial do bot financeiro
# Execute NO SERVIDOR: bash /opt/ck-agent/deploy-finance-fix.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCH="$SCRIPT_DIR/patch-finance-realtime.py"

echo "========================================================"
echo " CORREÇÃO EMERGENCIAL — Bot Financeiro"
echo " Bugs: summary memória | delete não encontra | R\$5 falso"
echo "========================================================"

echo ""
echo "=== [1/3] Parando n8n ..."
docker stop ck-agent-n8n || true
sleep 3

echo ""
echo "=== [2/3] Aplicando patch ..."
python3 "$PATCH"

echo ""
echo "=== [3/3] Subindo n8n ..."
cd "$SCRIPT_DIR"
docker compose --env-file .env up -d n8n

echo ""
echo "=== Aguardando n8n ..."
for i in $(seq 1 15); do
  code=$(curl -sS -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:5678/healthz || echo 000)
  echo "  health $i/15 → HTTP $code"
  [ "$code" = "200" ] && break
  sleep 5
done

echo ""
echo "=== Verificando patch ==="
python3 << 'PY'
import json, sqlite3
c = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
vid = c.execute("SELECT activeVersionId FROM workflow_entity WHERE id='mkK244lveO0N1qPR'").fetchone()[0]
nodes = json.loads(c.execute('SELECT nodes FROM workflow_history WHERE versionId=?', (vid,)).fetchone()[0])
for n in nodes:
    if n.get('name') == 'Executar Admin':
        js = (n.get('parameters') or {}).get('jsCode') or ''
        print(f'[OK] Executar Admin: {len(js)} chars')
        print(f'     fetchRecentTransactions: {"fetchRecentTransactions" in js}')
        print(f'     summary tempo real: {"dados em tempo real" in js}')
        print(f'     30 lançamentos no delete: {"30" in js}')
        print(f'     adjust_cash real: {"saldo REAL" in js}')
PY

echo ""
docker ps --filter name=ck-agent-n8n --format '{{.Names}} → {{.Status}}'
echo ""
echo "✅ Correção aplicada!"
echo ""
echo "Testes rápidos no Telegram:"
echo "  → 'me dá um resumo da minha finança completo'"
echo "     Esperado: dados reais sem R\$ 5 falso"
echo "  → 'tira os R\$ 5 que coloquei errado'"
echo "     Esperado: lista os últimos lançamentos reais e remove"
echo "  → 'o caixa correto é R\$ 300'"
echo "     Esperado: busca saldo real e ajusta se necessário"
