<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\KingCamera;
use App\Services\Camera\KingCameraService;

$s = app(KingCameraService::class);
$c1 = KingCamera::find(1);
$c28 = KingCamera::find(28);

echo "1. Getting snapshot Cam 1...\n";
$t0 = microtime(true);
$s1 = $s->getSnapshot($c1);
echo "   Result: " . ($s1 ? strlen($s1) . " bytes" : "FAILED") . " (" . round(microtime(true) - $t0, 2) . "s)\n";

echo "2. Getting snapshot Cam 28...\n";
$t0 = microtime(true);
$s28 = $s->getSnapshot($c28);
echo "   Result: " . ($s28 ? strlen($s28) . " bytes" : "FAILED") . " (" . round(microtime(true) - $t0, 2) . "s)\n";

echo "3. Getting snapshot Cam 1 AGAIN...\n";
$t0 = microtime(true);
$s1_again = $s->getSnapshot($c1);
echo "   Result: " . ($s1_again ? strlen($s1_again) . " bytes" : "FAILED") . " (" . round(microtime(true) - $t0, 2) . "s)\n";

echo "4. Getting snapshot Cam 28 AGAIN...\n";
$t0 = microtime(true);
$s28_again = $s->getSnapshot($c28);
echo "   Result: " . ($s28_again ? strlen($s28_again) . " bytes" : "FAILED") . " (" . round(microtime(true) - $t0, 2) . "s)\n";
