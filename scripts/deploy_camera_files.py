import subprocess

files = [
    ("laravel/resources/views/pages/kingCamera.blade.php", "/app/resources/views/pages/kingCamera.blade.php", "/tmp/kingCamera.blade.php"),
    ("laravel/app/Http/Controllers/Camera/KingCameraController.php", "/app/app/Http/Controllers/Camera/KingCameraController.php", "/tmp/KingCameraController.php"),
    ("laravel/app/Services/Camera/KingCameraService.php", "/app/app/Services/Camera/KingCameraService.php", "/tmp/KingCameraService.php"),
    ("laravel/app/Services/Camera/KingCameraTelegramAgentService.php", "/app/app/Services/Camera/KingCameraTelegramAgentService.php", "/tmp/KingCameraTelegramAgentService.php"),
    ("laravel/resources/views/pages/charleneMusicas.blade.php", "/app/resources/views/pages/charleneMusicas.blade.php", "/tmp/charleneMusicas.blade.php"),
    ("laravel/app/Http/Controllers/Alexa/CharleneController.php", "/app/app/Http/Controllers/Alexa/CharleneController.php", "/tmp/CharleneController.php")
]

for local, container_path, tmp_remote in files:
    print(f"Enviando {local} -> root@46.225.100.64:{tmp_remote}...")
    res = subprocess.run(["scp", "-o", "StrictHostKeyChecking=no", local, f"root@46.225.100.64:{tmp_remote}"], capture_output=True, text=True)
    if res.returncode == 0:
        print("  SCP OK, copiando para dentro do container conectaking-laravel...")
        cmd_cp = f"docker cp {tmp_remote} conectaking-laravel:{container_path}"
        res_docker = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", cmd_cp], capture_output=True, text=True)
        if res_docker.returncode == 0:
            print(f"  docker cp OK -> {container_path}")
        else:
            print("  Erro docker cp:", res_docker.stderr)
    else:
        print("  Erro SCP:", res.stderr)

print("Limpando cache do Laravel, views e reiniciando FrankenPHP...")
cmd_refresh = (
    "docker exec conectaking-laravel php artisan view:clear && "
    "docker exec conectaking-laravel php artisan optimize:clear && "
    "docker restart conectaking-laravel"
)
res_refresh = subprocess.run([
    "ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", cmd_refresh
], capture_output=True, text=True)
print(res_refresh.stdout)
print("Deploy concluído com sucesso e FrankenPHP recarregado!")
