#!/bin/bash
set -euo pipefail

chmod +x /opt/conectaking/scripts/backup-postgres-vps.sh 2>/dev/null || true
chmod +x /opt/conectaking/scripts/deploy-ks-worker-vps.sh 2>/dev/null || true
sed -i 's/\r$//' /opt/conectaking/scripts/backup-postgres-vps.sh /opt/conectaking/scripts/deploy-ks-worker-vps.sh 2>/dev/null || true

(crontab -l 2>/dev/null | grep -v backup-postgres-vps || true; echo '15 3 * * * /opt/conectaking/scripts/backup-postgres-vps.sh >> /var/log/conectaking-backup.log 2>&1') | crontab -

echo "=== crontab ==="
crontab -l || true

echo "=== services ==="
systemctl is-active fail2ban || true
systemctl is-active caddy || true
fail2ban-client status caddy-auth 2>&1 | head -12 || true

echo "=== caddy access log ==="
ls -la /var/log/caddy/access.log 2>&1 || true
grep -n "access.log\|@sensitive\|api/auth" /etc/caddy/Caddyfile | head -20 || true

echo "=== sentry in container ==="
docker exec conectaking-laravel php -r 'echo class_exists("Sentry\\Laravel\\Integration") ? "sentry:yes\n" : "sentry:no\n";' || echo "sentry check failed"

echo "=== env keys (masked) ==="
grep -E '^(SENTRY_|CK_BACKUP_|CLOUDFLARE_ACCOUNT_ID|CLOUDFLARE_API_TOKEN)=' /opt/conectaking/.env.prod | sed 's/=.*/=***/' || true

echo "=== totp column ==="
docker exec conectaking-laravel php artisan tinker --execute='echo Illuminate\Support\Facades\Schema::hasColumn("users","totp_secret_encrypted") ? "totp:yes" : "totp:no";' || echo "totp check failed"

echo "=== local backups ==="
ls -lh /opt/conectaking/backups 2>/dev/null | tail -5 || echo "no backups dir yet"

echo "=== DONE ==="
