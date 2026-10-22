import subprocess

code = """
require "vendor/autoload.php";
$app = require_once "bootstrap/app.php";
$app->make("Illuminate\\Contracts\\Console\\Kernel")->bootstrap();
$cam = App\Models\KingCamera::find(1);
$req = Illuminate\Http\Request::create("/api/cameras/1/tracking", "POST", [], [], [], [], json_encode([
    "crib_fence_enabled" => 1,
    "crib_roi_json" => ["x" => 35, "y" => 30, "w" => 50, "h" => 45]
]));
$req->headers->set("Content-Type", "application/json");
$req->attributes->set("auth_user_id", $cam->user_id);
$ctrl = app(App\Http\Controllers\Camera\KingCameraController::class);
$res = $ctrl->toggleAutoTracking($req, 1);
echo "Response: " . $res->getContent() . PHP_EOL;
$fresh = $cam->fresh();
echo "Fresh: Fence=" . ($fresh->crib_fence_enabled ? "1" : "0") . " | ROI=" . json_encode($fresh->crib_roi_json) . PHP_EOL;

"""

cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", f'docker exec conectaking-laravel php -r \'{code}\'']
res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
print(res.stdout)
if res.stderr:
    print(res.stderr)
