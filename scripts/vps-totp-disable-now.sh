#!/bin/bash
set -euo pipefail
docker exec conectaking-laravel php artisan tinker --execute='
DB::update("UPDATE users SET totp_enabled_at = NULL WHERE COALESCE(is_admin, false) = true");
$row = DB::selectOne("SELECT email, (totp_secret_encrypted IS NOT NULL AND totp_secret_encrypted <> '\'\'') AS configured, (totp_enabled_at IS NOT NULL) AS enabled FROM users WHERE COALESCE(is_admin, false) = true ORDER BY id LIMIT 1");
echo "email=".$row->email." configured=".($row->configured?"yes":"no")." enabled=".($row->enabled?"yes":"no")."\n";
'
