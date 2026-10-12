<?php
require '/app/vendor/autoload.php';
$app = require_once '/app/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$items = DB::select("SELECT * FROM finance_king_items");
echo "Count finance_king_items: " . count($items) . PHP_EOL;
foreach ($items as $it) {
    echo json_encode($it) . PHP_EOL;
}
