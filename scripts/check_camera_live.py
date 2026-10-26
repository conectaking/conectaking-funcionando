import subprocess

script = """<?php
require '/app/vendor/autoload.php';
$app = require_once '/app/bootstrap/app.php';
$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);
$kernel->bootstrap();

$events = App\\Models\\KingCameraEvent::orderBy('id', 'desc')->take(10)->get(['id', 'event_type', 'description', 'created_at']);
echo "=== RECENT EVENTS ===" . PHP_EOL;
echo json_encode($events, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;

$cams = App\\Models\\KingCamera::all();
echo "=== CAMERAS ===" . PHP_EOL;
foreach ($cams as $c) {
    echo "ID: {$c->id} | Name: {$c->name} | TG Alerts: {$c->telegram_alerts_enabled} | TG Chat: {$c->telegram_chat_id} | Fence: {$c->crib_fence_enabled} | Cry: {$c->baby_cry_enabled} | Stand: {$c->baby_stand_enabled}" . PHP_EOL;
}
"""

with open("scripts/temp_check.php", "w", encoding="utf-8") as f:
    f.write(script)

subprocess.run(["scp", "-o", "StrictHostKeyChecking=no", "scripts/temp_check.php", "root@46.225.100.64:/tmp/temp_check.php"])
subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", "docker cp /tmp/temp_check.php conectaking-laravel:/tmp/temp_check.php && docker exec conectaking-laravel php /tmp/temp_check.php"])
