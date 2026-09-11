#!/bin/bash
set -euo pipefail
CODE="${1:?code required}"
docker exec conectaking-laravel php artisan tinker --execute="
\$user = DB::selectOne('SELECT id, email FROM users WHERE COALESCE(is_admin, false) = true ORDER BY id LIMIT 1');
if (!\$user) { echo \"NO_ADMIN\\n\"; exit(1); }
\$svc = app(App\\Services\\Auth\\AdminTotpService::class);
\$r = \$svc->confirmSetup((string)\$user->id, '${CODE}');
echo json_encode(\$r, JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT).\"\\n\";
"
