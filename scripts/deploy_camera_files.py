import subprocess

files = [
    ("laravel/resources/views/pages/kingCamera.blade.php", "/opt/conectaking/laravel/resources/views/pages/kingCamera.blade.php"),
    ("laravel/app/Http/Controllers/Camera/KingCameraController.php", "/opt/conectaking/laravel/app/Http/Controllers/Camera/KingCameraController.php"),
    ("laravel/app/Services/Camera/KingCameraTelegramAgentService.php", "/opt/conectaking/laravel/app/Services/Camera/KingCameraTelegramAgentService.php")
]

for local, remote in files:
    print(f"Enviando {local} -> {remote}...")
    res = subprocess.run(["scp", "-o", "StrictHostKeyChecking=no", local, f"root@46.225.100.64:{remote}"], capture_output=True, text=True)
    if res.returncode == 0:
        print("  OK")
    else:
        print("  Erro:", res.stderr)

print("Limpando cache do Laravel e views...")
res_cache = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", "docker exec conectaking-laravel php artisan view:clear && docker exec conectaking-laravel php artisan optimize:clear"], capture_output=True, text=True)
print(res_cache.stdout)
print("Deploy concluído!")
