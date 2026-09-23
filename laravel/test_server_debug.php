<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$svc = app(\App\Services\Finance\FinanceService::class);
$userId = 'seed-admin-FNpGSFmV2bHm';

echo "=== PROFILES ===\n";
print_r($svc->profiles($userId));

echo "\n=== PRIMARY PROFILE ===\n";
print_r($svc->primaryProfile($userId));

echo "\n=== RESOLVE KING DATA (null) ===\n";
print_r($svc->resolveKingData($userId, null));

echo "\n=== RESOLVE KING DATA (1) ===\n";
print_r($svc->resolveKingData($userId, 1));

echo "\n=== DASHBOARD (null) ===\n";
$dNull = $svc->dashboard($userId, '2026-09-01', '2026-09-30', null);
echo "accountBalance=" . $dNull['body']['data']['accountBalance'] . ", totalRecebido=" . $dNull['body']['data']['totalRecebido'] . "\n";

echo "\n=== DASHBOARD (1) ===\n";
$d1 = $svc->dashboard($userId, '2026-09-01', '2026-09-30', 1);
echo "accountBalance=" . $d1['body']['data']['accountBalance'] . ", totalRecebido=" . $d1['body']['data']['totalRecebido'] . "\n";
