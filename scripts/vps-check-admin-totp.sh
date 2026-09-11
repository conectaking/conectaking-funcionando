#!/bin/bash
set -euo pipefail
docker exec conectaking-laravel php artisan tinker --execute='
$admins = DB::select("SELECT id, email, is_admin, totp_enabled_at FROM users WHERE COALESCE(is_admin, false) = true ORDER BY id LIMIT 20");
if (!$admins) {
  echo "no is_admin=true; sample:\n";
  $admins = DB::select("SELECT id, email, is_admin, totp_enabled_at FROM users ORDER BY id LIMIT 8");
}
foreach ($admins as $a) {
  echo $a->id." | ".$a->email." | is_admin=".json_encode($a->is_admin)." | totp=".($a->totp_enabled_at ? "on" : "off")."\n";
}
'
