#!/usr/bin/env bash
# Provisiona / atualiza /opt/ck-agent a partir desta pasta (ou do repo syncado).
set -euo pipefail
BASE=/opt/ck-agent
SRC="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$BASE"
cp -a "$SRC/docker-compose.yml" "$BASE/docker-compose.yml"
if [[ ! -f "$BASE/.env" ]]; then
  if [[ -f "$SRC/.env" ]]; then
    cp -a "$SRC/.env" "$BASE/.env"
  else
    cp -a "$SRC/.env.example" "$BASE/.env"
    echo "AVISO: edite $BASE/.env com senhas reais antes do up"
  fi
fi
chmod 600 "$BASE/.env" || true

cd "$BASE"
docker compose --env-file .env pull
docker compose --env-file .env up -d
docker compose --env-file .env ps
echo "CK_AGENT_UP_OK"
