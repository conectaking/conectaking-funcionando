import subprocess

php_code = """<?php
require '/app/vendor/autoload.php';
$app = require_once '/app/bootstrap/app.php';
$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);
$kernel->bootstrap();

$cam = \\App\\Models\\KingCamera::first();
echo "Camera: " . $cam->name . " ID: " . $cam->id . PHP_EOL;

$camService = app(\\App\\Services\\Camera\\KingCameraService::class);
$snap = $camService->getSnapshot($cam);
echo "Snapshot bytes: " . strlen($snap) . PHP_EOL;

$aiVision = app(\\App\\Services\\Camera\\KingCameraAiVisionService::class);
echo "AiVision isAvailable: " . ($aiVision->isAvailable() ? 'YES' : 'NO') . PHP_EOL;
echo "OpenAI Model: " . $aiVision->getOpenAiModel() . PHP_EOL;

$start = microtime(true);
$res = $aiVision->analyzeBabySafetySnapshot($snap, 'crib_fence');
$took = round(microtime(true) - $start, 2);

echo "Took: {$took}s" . PHP_EOL;
echo "Result: " . json_encode($res, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;
"""

with open("scripts/temp_ai_test.php", "w", encoding="utf-8") as f:
    f.write(php_code)

subprocess.run(["scp", "-o", "StrictHostKeyChecking=no", "scripts/temp_ai_test.php", "root@46.225.100.64:/tmp/temp_ai_test.php"], capture_output=True)
cmd = "docker cp /tmp/temp_ai_test.php conectaking-laravel:/app/temp_ai_test.php && docker exec conectaking-laravel php /app/temp_ai_test.php"
res = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", cmd], capture_output=True, text=True)
print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)
