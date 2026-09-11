#!/bin/bash
# Backup diário Postgres + off-box opcional. Retenção local 7 dias.
# Cron: 15 3 * * * /opt/conectaking/scripts/backup-postgres-vps.sh >> /var/log/conectaking-backup.log 2>&1
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

POSTGRES_USER=$(grep -E '^POSTGRES_USER=' "$BASE/.env.prod" | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' "$BASE/.env.prod" | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
POSTGRES_PASSWORD=$(grep -E '^POSTGRES_PASSWORD=' "$BASE/.env.prod" | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
CK_BACKUP_OFFBOX_CMD=$(grep -E '^CK_BACKUP_OFFBOX_CMD=' "$BASE/.env.prod" | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//' || true)

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

# Off-box: defina CK_BACKUP_OFFBOX_CMD no .env.prod, ex.:
# CK_BACKUP_OFFBOX_CMD='rclone copy {FILE} remote:conectaking-backups/'
# CK_BACKUP_OFFBOX_CMD='aws s3 cp {FILE} s3://meu-bucket/conectaking/'
if [[ -n "${CK_BACKUP_OFFBOX_CMD:-}" ]]; then
  CMD="${CK_BACKUP_OFFBOX_CMD//\{FILE\}/$FILE}"
  echo "offbox: $CMD"
  if eval "$CMD"; then
    echo "backup offbox ok"
  else
    echo "backup offbox FAIL" >&2
    exit 2
  fi
else
  echo "backup offbox skipped (CK_BACKUP_OFFBOX_CMD vazio)"
fi

find "$OUT_DIR" -type f -name 'conectaking-*.sql.gz' -mtime +"$KEEP_DAYS" -print -delete || true
echo "backup ok"
