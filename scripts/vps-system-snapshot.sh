#!/bin/bash
set -euo pipefail
echo "=== containers ==="
docker ps --format 'table {{.Names}}\t{{.Status}}'
echo "=== fail2ban ==="
systemctl is-active fail2ban; fail2ban-client status caddy-auth 2>&1 | head -8
echo "=== cron ==="
crontab -l | grep backup || true
echo "=== keys ==="
grep -E '^(SENTRY_LARAVEL_DSN|CK_BACKUP_OFFBOX|CLOUDFLARE_API_TOKEN|ADMIN_IP)=' /opt/conectaking/.env.prod | sed 's/=.*/=***/'
echo "=== totp ==="
docker exec conectaking-laravel php artisan tinker --execute='
$u = DB::selectOne("SELECT email, (totp_secret_encrypted IS NOT NULL) AS cfg, (totp_enabled_at IS NOT NULL) AS en FROM users WHERE COALESCE(is_admin,false)=true LIMIT 1");
echo $u->email." cfg=".($u->cfg?"1":"0")." en=".($u->en?"1":"0")."\n";
'
echo "=== health ==="
curl -sS http://127.0.0.1:8080/health; echo
