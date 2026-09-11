#!/bin/bash
set -euo pipefail
# Pack lean deploy from repo root, scp, rebuild on VPS.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
TGZ=/tmp/ck-rebuild.tgz
rm -f "$TGZ"
# Prefer GNU tar if available
tar czf "$TGZ" \
  --exclude='laravel/node_modules' \
  --exclude='laravel/vendor' \
  --exclude='laravel/storage/logs/*' \
  --exclude='laravel/storage/framework/cache/*' \
  --exclude='laravel/storage/framework/sessions/*' \
  --exclude='laravel/storage/framework/views/*' \
  --exclude='laravel/.env' \
  --exclude='laravel/.env.*' \
  laravel public docker-compose.prod.yml scripts/deploy-vps-rebuild.sh
ls -lh "$TGZ"
echo "packed"
