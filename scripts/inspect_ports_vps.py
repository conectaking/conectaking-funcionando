import subprocess

code = """
require "vendor/autoload.php";
$app = require_once "bootstrap/app.php";
$app->make("Illuminate\\Contracts\\Console\\Kernel")->bootstrap();
foreach (App\\Models\\KingCamera::all() as $c) {
    echo "ID: " . $c->id . " | Nome: " . $c->name . " | IP: " . $c->ip_address . " | Port: " . $c->port . " | ONVIF Port: " . $c->onvif_port . " | User: " . $c->username . PHP_EOL;
}
"""

cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", f'docker exec conectaking-laravel php -r \'{code}\'']
res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
print(res.stdout)
