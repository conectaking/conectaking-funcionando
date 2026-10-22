import subprocess

code = """
require "vendor/autoload.php";
$app = require_once "bootstrap/app.php";
$app->make("Illuminate\\Contracts\\Console\\Kernel")->bootstrap();
foreach (App\\Models\\KingCamera::all() as $c) {
    echo "ID: " . $c->id . " | Nome: " . $c->name . " | Fence: " . ($c->crib_fence_enabled ? "1" : "0") . " | ROI: " . json_encode($c->crib_roi_json) . " | Cry: " . ($c->baby_cry_enabled ? "1" : "0") . " | Tracking: " . ($c->auto_tracking_enabled ? "1" : "0") . PHP_EOL;
}
"""

cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", f'docker exec conectaking-laravel php -r \'{code}\'']
res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
print(res.stdout)
if res.stderr:
    print(res.stderr)
