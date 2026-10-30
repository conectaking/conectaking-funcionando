<?php
require '/app/vendor/autoload.php';
$app = require_once '/app/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$cam = \App\Models\KingCamera::first();
echo "Camera: " . $cam->name . " ID: " . $cam->id . PHP_EOL;

$camService = app(\App\Services\Camera\KingCameraService::class);
$snap = $camService->getSnapshot($cam);
echo "Snapshot bytes: " . strlen($snap) . PHP_EOL;

$aiVision = app(\App\Services\Camera\KingCameraAiVisionService::class);
echo "AiVision isAvailable: " . ($aiVision->isAvailable() ? 'YES' : 'NO') . PHP_EOL;
echo "OpenAI Model: " . $aiVision->getOpenAiModel() . PHP_EOL;

$start = microtime(true);
$res = $aiVision->analyzeBabySafetySnapshot($snap, 'crib_fence');
$took = round(microtime(true) - $start, 2);

echo "Took: {$took}s" . PHP_EOL;
echo "Result: " . json_encode($res, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
