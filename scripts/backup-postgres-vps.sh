#!/bin/bash
# Backup diário Postgres (VPS) — retenção 7 dias.
# Cron sugerido: 15 3 * * * /opt/conectaking/scripts/backup-postgres-vps.sh >> /var/log/conectaking-backup.log 2>&1
set -euo pipefail

BASE=/opt/conectaking
OUT_DIR="${CK_BACKUP_DIR:-$BASE/backups}"
KEEP_DAYS="${CK_BACKUP_KEEP_DAYS:-7}"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
FILE="$OUT_DIR/conectaking-$STAMP.sql.gz"

mkdir -p "$OUT_DIR"

if [[ ! -f "$BASE/.env.prod" ]]; then
  echo "missing $BASE/.env.prod" >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a
# Extrai só as vars necessárias (evita source de valores com espaços/aspas quebradas).
POSTGRES_USER=$(grep -E '^POSTGRES_USER=' "$BASE/.env.prod" | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' "$BASE/.env.prod" | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
POSTGRES_PASSWORD=$(grep -E '^POSTGRES_PASSWORD=' "$BASE/.env.prod" | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
set +a

POSTGRES_USER="${POSTGRES_USER:-conectaking}"
POSTGRES_DB="${POSTGRES_DB:-conectaking}"

if ! docker ps --format '{{.Names}}' | grep -qx conectaking-db; then
  echo "container conectaking-db not running" >&2
  exit 1
fi

echo "backup start $STAMP -> $FILE"
docker exec -e PGPASSWORD="$POSTGRES_PASSWORD" conectaking-db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-acl \
  | gzip -c > "$FILE.tmp"
mv -f "$FILE.tmp" "$FILE"
ls -lh "$FILE"

find "$OUT_DIR" -type f -name 'conectaking-*.sql.gz' -mtime +"$KEEP_DAYS" -print -delete || true
echo "backup ok"
