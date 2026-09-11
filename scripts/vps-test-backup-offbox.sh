#!/bin/bash
set -euo pipefail
echo "=== test backup with offbox ==="
bash /opt/conectaking/scripts/backup-postgres-vps.sh
echo "=== verify R2 remote ==="
rclone ls "ck-r2:kingselection/db-backups" 2>&1 | tail -10 || true
grep -E '^CK_BACKUP_OFFBOX_CMD=' /opt/conectaking/.env.prod | sed 's/\(rclone copy\).*/\1 {FILE} ck-r2:***/'
