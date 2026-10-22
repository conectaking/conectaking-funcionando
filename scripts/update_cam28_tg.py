import subprocess

code = '''
require "vendor/autoload.php";
$app = require_once "bootstrap/app.php";
$app->make("Illuminate\\Contracts\\Console\\Kernel")->bootstrap();
$c28 = App\\Models\\KingCamera::find(28);
if ($c28) {
    $c28->update([
        "telegram_chat_id" => "78792434",
        "telegram_alerts_enabled" => true,
        "motion_detection_enabled" => true
    ]);
    echo "Cam 28 Telegram configurado com sucesso!" . PHP_EOL;
}
'''

cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", f'docker exec conectaking-laravel php -r \'{code}\'']
res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
print(res.stdout)
