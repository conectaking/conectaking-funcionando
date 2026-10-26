<?php
require '/app/vendor/autoload.php';
$app = require_once '/app/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$events = App\Models\KingCameraEvent::orderBy('id', 'desc')->take(10)->get(['id', 'event_type', 'description', 'created_at']);
echo "=== RECENT EVENTS ===" . PHP_EOL;
echo json_encode($events, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL;

$cams = App\Models\KingCamera::all();
echo "=== CAMERAS ===" . PHP_EOL;
foreach ($cams as $c) {
    echo "ID: {$c->id} | Name: {$c->name} | TG Alerts: {$c->telegram_alerts_enabled} | TG Chat: {$c->telegram_chat_id} | Fence: {$c->crib_fence_enabled} | Cry: {$c->baby_cry_enabled} | Stand: {$c->baby_stand_enabled}" . PHP_EOL;
}
