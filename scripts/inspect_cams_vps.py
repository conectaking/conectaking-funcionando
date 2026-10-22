import subprocess

code = """
require "vendor/autoload.php";
$app = require_once "bootstrap/app.php";
$app->make("Illuminate\\Contracts\\Console\\Kernel")->bootstrap();
$cols = Illuminate\Support\Facades\Schema::getColumnListing("king_cameras");
echo "Cols: " . json_encode($cols) . PHP_EOL;
$c1 = App\Models\KingCamera::find(1);
echo "Cam 1 raw: " . json_encode($c1->toArray()) . PHP_EOL;

"""

cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", f'docker exec conectaking-laravel php -r \'{code}\'']
res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
print(res.stdout)
if res.stderr:
    print(res.stderr)
