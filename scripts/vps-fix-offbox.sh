#!/bin/bash
set -euo pipefail
# Fix quoted CK_BACKUP_OFFBOX_CMD and retest
ENV=/opt/conectaking/.env.prod
sed -i "s|^CK_BACKUP_OFFBOX_CMD=.*|CK_BACKUP_OFFBOX_CMD=rclone copy {FILE} ck-r2:kingselection/db-backups/|" "$ENV"
# ensure backup script strips single quotes (upload latest)
sed -i 's/\r$//' /opt/conectaking/scripts/backup-postgres-vps.sh
bash /opt/conectaking/scripts/backup-postgres-vps.sh
echo "=== R2 listing ==="
rclone ls "ck-r2:kingselection/db-backups" 2>&1 | tail -10
