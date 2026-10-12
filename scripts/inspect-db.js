const { execSync } = require('child_process');
const fs = require('fs');

const phpCode = `<?php
require '/app/vendor/autoload.php';
$app = require_once '/app/bootstrap/app.php';
$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);
$kernel->bootstrap();

echo "=== CHECKING FINANCE_KING_ITEMS ===\\n";
if (Schema::hasTable('finance_king_items')) {
    $rows = DB::table('finance_king_items')->get();
    echo "Count: " . count($rows) . "\\n";
    foreach ($rows as $r) {
        echo $r->id . " | " . $r->user_id . " | " . $r->profile_id . " | " . $r->item_type . " | " . substr($r->data, 0, 150) . "\\n";
    }
} else {
    echo "Table does not exist\\n";
}

echo "\\n=== ALL USERS ===\\n";
$users = DB::table('users')->get();
foreach ($users as $u) {
    echo $u->id . " | " . $u->email . " | " . $u->name . "\\n";
}

echo "\\n=== CHECKING FINANCE_KING_SYNC ALL ROWS ===\\n";
$sync = DB::table('finance_king_sync')->get();
foreach ($sync as $s) {
    echo $s->id . " | User: " . $s->user_id . " | Profile: " . ($s->profile_id ?? 'null') . " | updated: " . $s->updated_at . "\\n";
    echo "Data: " . substr($s->data, 0, 300) . "\\n";
}

echo "\\n=== DELETED TRANSACTIONS? ===\\n";
// Check if soft deletes exist
$cols = Schema::getColumnListing('finance_transactions');
echo "Cols: " . implode(',', $cols) . "\\n";
`;

fs.writeFileSync('temp_check.php', phpCode);
execSync('scp -o StrictHostKeyChecking=no temp_check.php root@46.225.100.64:/tmp/temp_check.php');
const res = execSync('ssh -o StrictHostKeyChecking=no root@46.225.100.64 "docker cp /tmp/temp_check.php conectaking-laravel:/app/temp_check.php && docker exec conectaking-laravel php /app/temp_check.php"', { encoding: 'utf8' });
console.log(res);
fs.unlinkSync('temp_check.php');
