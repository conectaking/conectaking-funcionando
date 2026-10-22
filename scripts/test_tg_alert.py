import subprocess

code = """
require "vendor/autoload.php";
$app = require_once "bootstrap/app.php";
$app->make("Illuminate\\Contracts\\Console\\Kernel")->bootstrap();
$svc = app(App\\Services\\Camera\\KingCameraTelegramAgentService::class);
$c1 = App\\Models\\KingCamera::find(1);
$ok = $svc->sendAlert($c1, "test", "Teste de inicializacao dos alertas das cameras!");
echo "Alert Cam 1 result: " . ($ok ? "SUCESSO" : "FALHOU") . PHP_EOL;
"""

cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", f'docker exec conectaking-laravel php -r \'{code}\'']
res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
print(res.stdout)
if res.stderr:
    print(res.stderr)
