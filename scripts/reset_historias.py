import subprocess

remote_cmd = """
docker exec conectaking-laravel php -r "
require 'vendor/autoload.php';
\$app = require_once 'bootstrap/app.php';
\$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class);
\$kernel->bootstrap();
\App\Models\CharleneMemory::where('category', 'historia_ouvida')->delete();
echo 'Reset OK. Restantes: ' . \App\Models\CharleneMemory::where('category', 'historia_ouvida')->count() . PHP_EOL;
"
"""

proc = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", remote_cmd], capture_output=True, text=True)
print(proc.stdout)
if proc.stderr:
    print("ERR:", proc.stderr)
