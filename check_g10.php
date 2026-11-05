<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$media = app(\App\Services\CartaoVirtual\KingSelectionMediaService::class);
$pRes = $media->watermarkFileForGallery('seed-admin-FNpGSFmV2bHm', 10, 'portrait');
echo "watermarkFileForGallery portrait: status=" . ($pRes['status'] ?? '?') . " len=" . strlen($pRes['binary'] ?? '') . " msg=" . ($pRes['message'] ?? '') . "\n";
$lRes = $media->watermarkFileForGallery('seed-admin-FNpGSFmV2bHm', 10, 'landscape');
echo "watermarkFileForGallery landscape: status=" . ($lRes['status'] ?? '?') . " len=" . strlen($lRes['binary'] ?? '') . " msg=" . ($lRes['message'] ?? '') . "\n";








