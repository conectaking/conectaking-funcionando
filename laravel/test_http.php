<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$userId = 'seed-admin-FNpGSFmV2bHm';

// Generate a valid JWT token for this user
$jwt = $app->make(\App\Services\Auth\JwtService::class);
$token = $jwt->encode([
    'userId' => $userId,
    'email' => 'conectaking@gmail.com',
    'accountType' => 'adm_principal'
]);

echo "JWT Token generated.\n";

// Test 1: GET /api/finance/dashboard (no query params)
$req1 = Illuminate\Http\Request::create('/api/finance/dashboard', 'GET');
$req1->headers->set('Authorization', 'Bearer ' . $token);
$res1 = $kernel->handle($req1);
echo "=== Test 1: GET /api/finance/dashboard (Status {$res1->getStatusCode()}) ===\n";
echo substr($res1->getContent(), 0, 500) . "\n\n";

// Test 2: GET /api/finance/dashboard?dateFrom=2026-09-01&dateTo=2026-09-30&profile_id=1
$req2 = Illuminate\Http\Request::create('/api/finance/dashboard?dateFrom=2026-09-01&dateTo=2026-09-30&profile_id=1', 'GET');
$req2->headers->set('Authorization', 'Bearer ' . $token);
$res2 = $kernel->handle($req2);
echo "=== Test 2: GET with date & profile_id=1 (Status {$res2->getStatusCode()}) ===\n";
echo $res2->getContent() . "\n\n";

// Test 3: Cookie authentication without Bearer
$req3 = Illuminate\Http\Request::create('/api/finance/dashboard?dateFrom=2026-09-01&dateTo=2026-09-30&profile_id=1', 'GET');
$req3->cookies->set('token', $token);
$res3 = $kernel->handle($req3);
echo "=== Test 3: Cookie auth (Status {$res3->getStatusCode()}) ===\n";
echo substr($res3->getContent(), 0, 300) . "\n\n";

// Test 4: What if profile_id is not 1 (e.g. empty or null or 0)?
$req4 = Illuminate\Http\Request::create('/api/finance/dashboard?dateFrom=2026-09-01&dateTo=2026-09-30', 'GET');
$req4->cookies->set('token', $token);
$res4 = $kernel->handle($req4);
echo "=== Test 4: No profile_id (Status {$res4->getStatusCode()}) ===\n";
echo substr($res4->getContent(), 0, 300) . "\n\n";
