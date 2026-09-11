#!/bin/bash
set -euo pipefail
# Inicia setup 2FA do admin e imprime otpauth (para o dono cadastrar no app). NÃO habilita até confirm.
docker exec conectaking-laravel php artisan tinker --execute='
$user = DB::selectOne("SELECT id, email FROM users WHERE COALESCE(is_admin, false) = true ORDER BY id LIMIT 1");
if (!$user) { echo "NO_ADMIN\n"; exit; }
$svc = app(App\Services\Auth\AdminTotpService::class);
$r = $svc->beginSetup((string)$user->id, (string)$user->email);
echo "admin=".$user->email."\n";
echo json_encode($r, JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT)."\n";
'
