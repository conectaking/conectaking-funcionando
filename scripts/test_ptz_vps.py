import subprocess

code = """
require "vendor/autoload.php";
$app = require_once "bootstrap/app.php";
$app->make("Illuminate\\Contracts\\Console\\Kernel")->bootstrap();
$svc = app(App\\Services\\Camera\\KingCameraService::class);
$c1 = App\\Models\\KingCamera::find(1);
$c28 = App\\Models\\KingCamera::find(28);

echo "PTZ Cam 1 move right: ";
print_r($svc->ptzMove($c1, "right", 0.5));
sleep(1);
echo "PTZ Cam 1 stop: ";
print_r($svc->ptzMove($c1, "stop"));

echo "PTZ Cam 28 move right: ";
print_r($svc->ptzMove($c28, "right", 0.5));
sleep(1);
echo "PTZ Cam 28 stop: ";
print_r($svc->ptzMove($c28, "stop"));
"""

cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", f'docker exec conectaking-laravel php -r \'{code}\'']
res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
print(res.stdout)
