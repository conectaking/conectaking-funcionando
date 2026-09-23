<?php
require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$users = Illuminate\Support\Facades\DB::table('users')->get();
foreach ($users as $u) {
    echo "ID: " . var_export($u->id, true) . " | Name: " . var_export($u->name, true) . " | Email: " . var_export($u->email, true) . "\n";
    $arr = (array)$u;
    unset($arr['password'], $arr['remember_token']);
    echo json_encode($arr, JSON_PRETTY_PRINT) . "\n";
}
