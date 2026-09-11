#!/bin/bash
set -euo pipefail
echo "=== sentry class with autoload ==="
docker exec conectaking-laravel php -r 'require "/app/vendor/autoload.php"; echo class_exists("Sentry\\Laravel\\Integration") ? "sentry:yes\n" : "sentry:no\n";'
ls docker exec 2>/dev/null || true
docker exec conectaking-laravel ls vendor/sentry 2>&1 | head -10
echo "=== admin totp status ==="
docker exec conectaking-laravel php artisan tinker --execute='
$admins = DB::select("SELECT id, email, (totp_enabled_at IS NOT NULL) AS totp_on FROM users WHERE role = ? OR is_admin = true OR email ILIKE ? ORDER BY id LIMIT 10", ["admin", "%admin%"]);
if (!$admins) {
  $admins = DB::select("SELECT id, email, (totp_enabled_at IS NOT NULL) AS totp_on FROM users ORDER BY id LIMIT 5");
}
foreach ($admins as $a) { echo $a->id." | ".$a->email." | totp=".($a->totp_on?"on":"off")."\n"; }
'
echo "=== fail2ban/caddy/cron quick ==="
systemctl is-active fail2ban caddy
crontab -l | grep backup || true
grep -E '^CK_BACKUP_OFFBOX_CMD=' /opt/conectaking/.env.prod | sed 's/ck-r2:.*/ck-r2:***/'
grep -E '^SENTRY_LARAVEL_DSN=' /opt/conectaking/.env.prod | sed 's/=.*/=***/'
