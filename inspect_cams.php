<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\KingCamera;
$cam1 = KingCamera::find(1);
$cam28 = KingCamera::find(28);

echo "Cam1:\n";
echo "  Raw pass: " . ($cam1->getAttributes()['password'] ?? '') . "\n";
echo "  Decrypted pass: " . $cam1->getDecryptedPassword() . "\n";
echo "  Full RTSP: " . $cam1->full_rtsp_url . "\n";

echo "Cam28:\n";
echo "  Raw pass: " . ($cam28->getAttributes()['password'] ?? '') . "\n";
echo "  Decrypted pass: " . $cam28->getDecryptedPassword() . "\n";
echo "  Full RTSP: " . $cam28->full_rtsp_url . "\n";
