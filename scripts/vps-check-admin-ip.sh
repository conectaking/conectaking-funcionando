#!/bin/bash
set -euo pipefail
echo "=== ADMIN_IP_ALLOWLIST ==="
grep ADMIN_IP_ALLOWLIST /opt/conectaking/.env.prod || true
docker exec conectaking-laravel printenv ADMIN_IP_ALLOWLIST || true
echo "=== recent 403 admin (laravel log) ==="
docker exec conectaking-laravel sh -c 'tail -n 200 /app/storage/logs/laravel.log 2>/dev/null | grep -i "admin\|allowlist\|403\|IP" | tail -n 40' || true
echo "=== caddy / trusted ==="
grep -n "trusted\|real_ip\|forwarded\|cloudflare\|CF-Connecting" /opt/conectaking/Caddyfile 2>/dev/null | head -40 || true
ls /opt/conectaking/*Caddy* 2>/dev/null || true
echo DONE
