<?php
require '/app/vendor/autoload.php';
$app = require_once '/app/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$allUsers = DB::select("SELECT id, email, name FROM users");
echo "Users: " . json_encode($allUsers) . PHP_EOL;

$allTx = DB::select("SELECT id, user_id, type, amount, description, transaction_date FROM finance_transactions WHERE description LIKE '%empresa%' OR amount = 500 OR description LIKE '%500%'");
echo "Tx 500: " . json_encode($allTx) . PHP_EOL;

$allSyncs = DB::select("SELECT id, user_id, profile_id, updated_at, data FROM finance_king_sync");
foreach ($allSyncs as $s) {
    echo "Sync #{$s->id} | user={$s->user_id} | prof={$s->profile_id} | dt={$s->updated_at} | data=" . substr(json_encode($s->data), 0, 150) . PHP_EOL;
}
