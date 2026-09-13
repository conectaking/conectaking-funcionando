#!/usr/bin/env bash
# Aplica proxy residencial na instância Evolution "conectaking".
# Lê /opt/ck-agent/.env (EVO_PROXY_*).
set -euo pipefail
ENV_FILE="${1:-/opt/ck-agent/.env}"
# shellcheck disable=SC1090
set -a
# carrega só linhas KEY=VAL simples
while IFS= read -r line || [ -n "$line" ]; do
  case "$line" in
    ''|\#*) continue ;;
    *=*) export "$line" ;;
  esac
done < "$ENV_FILE"
set +a

KEY="${EVOLUTION_API_KEY:?faltando EVOLUTION_API_KEY}"
INSTANCE="${EVO_INSTANCE_NAME:-conectaking}"
BASE="${EVO_API_BASE:-http://127.0.0.1:8081}"

ENABLED="${EVO_PROXY_ENABLED:-false}"
HOST="${EVO_PROXY_HOST:-}"
PORT="${EVO_PROXY_PORT:-}"
PROTO="${EVO_PROXY_PROTOCOL:-http}"
USER="${EVO_PROXY_USERNAME:-}"
PASS="${EVO_PROXY_PASSWORD:-}"

if [ "$ENABLED" != "true" ]; then
  echo "EVO_PROXY_ENABLED!=true — desativando proxy na instância"
  curl -sS -X POST "${BASE}/proxy/set/${INSTANCE}" \
    -H "apikey: ${KEY}" -H "Content-Type: application/json" \
    -d '{"enabled":false}'
  echo
  exit 0
fi

if [ -z "$HOST" ] || [ -z "$PORT" ]; then
  echo "ERRO: preencha EVO_PROXY_HOST e EVO_PROXY_PORT no .env"
  exit 1
fi

# Garante instância
EXISTS=$(curl -sS "${BASE}/instance/fetchInstances" -H "apikey: ${KEY}" || echo '[]')
if ! echo "$EXISTS" | grep -q "\"name\":\"${INSTANCE}\""; then
  echo "Criando instância ${INSTANCE}..."
  curl -sS -X POST "${BASE}/instance/create" \
    -H "apikey: ${KEY}" -H "Content-Type: application/json" \
    -d "{\"instanceName\":\"${INSTANCE}\",\"qrcode\":true,\"integration\":\"WHATSAPP-BAILEYS\"}"
  echo
  sleep 2
fi

BODY=$(cat <<EOF
{
  "enabled": true,
  "host": "${HOST}",
  "port": "${PORT}",
  "protocol": "${PROTO}",
  "username": "${USER}",
  "password": "${PASS}"
}
EOF
)

# Algumas versões usam proxyHost/proxyPort
BODY2=$(cat <<EOF
{
  "enabled": true,
  "proxyHost": "${HOST}",
  "proxyPort": "${PORT}",
  "proxyProtocol": "${PROTO}",
  "proxyUsername": "${USER}",
  "proxyPassword": "${PASS}"
}
EOF
)

echo "Aplicando proxy ${PROTO}://${HOST}:${PORT} em ${INSTANCE}..."
CODE=$(curl -sS -o /tmp/evo-proxy.json -w "%{http_code}" -X POST "${BASE}/proxy/set/${INSTANCE}" \
  -H "apikey: ${KEY}" -H "Content-Type: application/json" \
  -d "${BODY}")
echo "try1_http:${CODE}"
cat /tmp/evo-proxy.json; echo

if [ "$CODE" != "200" ] && [ "$CODE" != "201" ]; then
  CODE=$(curl -sS -o /tmp/evo-proxy.json -w "%{http_code}" -X POST "${BASE}/proxy/set/${INSTANCE}" \
    -H "apikey: ${KEY}" -H "Content-Type: application/json" \
    -d "${BODY2}")
  echo "try2_http:${CODE}"
  cat /tmp/evo-proxy.json; echo
fi

echo "Reiniciando conexão (logout/connect)..."
curl -sS -X DELETE "${BASE}/instance/logout/${INSTANCE}" -H "apikey: ${KEY}" || true
echo
sleep 2
curl -sS -o /tmp/evo-conn.json -w "connect:%{http_code}\n" \
  "${BASE}/instance/connect/${INSTANCE}" -H "apikey: ${KEY}"
head -c 300 /tmp/evo-conn.json; echo

if grep -q base64 /tmp/evo-conn.json 2>/dev/null; then
  echo "QR_OK — abra o Manager e escaneie (ou use /tmp/evo-conn.json)"
else
  echo "Proxy aplicado. Abra https://evo.conectaking.com.br/manager → conectaking → Get QR Code"
fi
