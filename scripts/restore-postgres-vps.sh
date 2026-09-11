#!/bin/bash
# Restore Postgres a partir de um .sql.gz (teste trimestral).
# Uso: CK_RESTORE_FILE=/opt/conectaking/backups/conectaking-XXXX.sql.gz bash scripts/restore-postgres-vps.sh
set -euo pipefail
BASE=/opt/conectaking
FILE="${CK_RESTORE_FILE:-}"
test -n "$FILE" || { echo "defina CK_RESTORE_FILE"; exit 1; }
test -f "$FILE" || { echo "missing $FILE"; exit 1; }

POSTGRES_USER=$(grep -E '^POSTGRES_USER=' "$BASE/.env.prod" | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' "$BASE/.env.prod" | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
POSTGRES_PASSWORD=$(grep -E '^POSTGRES_PASSWORD=' "$BASE/.env.prod" | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
POSTGRES_USER="${POSTGRES_USER:-conectaking}"
POSTGRES_DB="${POSTGRES_DB:-conectaking}"

echo "ATENÇÃO: isto sobrescreve dados em $POSTGRES_DB"
read -r -p "Digite RESTORE para continuar: " conf
[[ "$conf" == "RESTORE" ]] || { echo "abortado"; exit 1; }

gunzip -c "$FILE" | docker exec -i -e PGPASSWORD="$POSTGRES_PASSWORD" conectaking-db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
echo "restore ok"
