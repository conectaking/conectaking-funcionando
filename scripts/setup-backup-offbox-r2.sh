#!/bin/bash
# Configura rclone -> R2 e CK_BACKUP_OFFBOX_CMD se R2_* existir no .env.prod
set -euo pipefail
ENV=/opt/conectaking/.env.prod
get() { grep -E "^$1=" "$ENV" | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//'; }

R2_ACCOUNT_ID=$(get R2_ACCOUNT_ID)
R2_ACCESS_KEY_ID=$(get R2_ACCESS_KEY_ID)
R2_SECRET_ACCESS_KEY=$(get R2_SECRET_ACCESS_KEY)
R2_BUCKET=$(get R2_BUCKET)
if [[ -z "$R2_BUCKET" ]]; then R2_BUCKET=$(get R2_BUCKET_NAME); fi
CLOUDFLARE_ACCOUNT_ID=$(get CLOUDFLARE_ACCOUNT_ID)
ACCT="${R2_ACCOUNT_ID:-$CLOUDFLARE_ACCOUNT_ID}"

if [[ -z "$ACCT" || -z "$R2_ACCESS_KEY_ID" || -z "$R2_SECRET_ACCESS_KEY" || -z "$R2_BUCKET" ]]; then
  echo "R2 incomplete — skip offbox rclone setup"
  exit 0
fi

if ! command -v rclone >/dev/null 2>&1; then
  curl -fsSL https://rclone.org/install.sh | bash
fi

mkdir -p /root/.config/rclone
cat > /root/.config/rclone/rclone.conf <<EOF
[ck-r2]
type = s3
provider = Cloudflare
access_key_id = ${R2_ACCESS_KEY_ID}
secret_access_key = ${R2_SECRET_ACCESS_KEY}
endpoint = https://${ACCT}.r2.cloudflarestorage.com
acl = private
no_check_bucket = true
EOF
chmod 600 /root/.config/rclone/rclone.conf

# ensure remote path
rclone mkdir "ck-r2:${R2_BUCKET}/db-backups" 2>/dev/null || true

OFFBOX="rclone copy {FILE} ck-r2:${R2_BUCKET}/db-backups/"
if grep -q '^CK_BACKUP_OFFBOX_CMD=' "$ENV"; then
  sed -i "s|^CK_BACKUP_OFFBOX_CMD=.*|CK_BACKUP_OFFBOX_CMD=${OFFBOX}|" "$ENV"
else
  echo "CK_BACKUP_OFFBOX_CMD=${OFFBOX}" >> "$ENV"
fi

echo "offbox configured: CK_BACKUP_OFFBOX_CMD set to rclone->R2/${R2_BUCKET}/db-backups"
rclone lsd "ck-r2:${R2_BUCKET}" 2>&1 | head -10 || true
