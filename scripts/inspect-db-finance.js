const { execSync } = require('child_process');

const php = `
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\\Contracts\\Console\\Kernel::class);
$kernel->bootstrap();

$u = DB::selectOne("SELECT id, email, name FROM users WHERE email LIKE '%adrianoking%' OR is_admin=true LIMIT 1");
echo "User: " . json_encode($u) . PHP_EOL;

$profiles = DB::select("SELECT * FROM finance_profiles WHERE user_id = ?", [$u->id]);
echo "Profiles: " . json_encode($profiles) . PHP_EOL;

$sync = DB::selectOne("SELECT id, profile_id, updated_at, data FROM finance_king_sync WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1", [$u->id]);
if ($sync) {
    $raw = is_string($sync->data) ? json_decode($sync->data, true) : (array)$sync->data;
    echo "KingSync keys: " . json_encode(array_keys($raw ?: [])) . PHP_EOL;
    echo "Trabalhos count: " . count($raw['trabalhos'] ?? []) . PHP_EOL;
    echo "Terceiros count: " . count($raw['terceiros'] ?? []) . PHP_EOL;
    echo "Bens count: " . count($raw['bens'] ?? []) . PHP_EOL;
    echo "Dividas count: " . count($raw['dividas'] ?? []) . PHP_EOL;
    echo "KingSync Trabalhos: " . json_encode($raw['trabalhos'] ?? []) . PHP_EOL;
    echo "KingSync Terceiros: " . json_encode($raw['terceiros'] ?? []) . PHP_EOL;
} else {
    echo "No KingSync found!" . PHP_EOL;
}

$items = DB::select("SELECT type, count(*) as c FROM finance_king_items WHERE user_id = ? GROUP BY type", [$u->id]);
echo "KingItems: " . json_encode($items) . PHP_EOL;

$txs = DB::select("SELECT id, type, amount, description, transaction_date, status, profile_id FROM finance_transactions WHERE user_id = ? ORDER BY id DESC LIMIT 35", [$u->id]);
echo "Transactions count: " . count($txs) . PHP_EOL;
foreach ($txs as $t) {
    echo "#{$t->id} | {$t->type} | R$ {$t->amount} | {$t->status} | {$t->transaction_date} | {$t->description} | prof: {$t->profile_id}" . PHP_EOL;
}
`;

const b64 = Buffer.from(php).toString('base64');
const cmd = `ssh -o StrictHostKeyChecking=no root@46.225.100.64 "docker exec conectaking-laravel php -r \\"eval(base64_decode('$b64'));\\""`;
try {
    const res = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    console.log(res);
} catch (e) {
    console.error(e.message);
    if (e.stdout) console.log('STDOUT:', e.stdout);
    if (e.stderr) console.log('STDERR:', e.stderr);
}
