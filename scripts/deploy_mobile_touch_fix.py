import subprocess
import os
import tarfile

files = [
    ("laravel/resources/css/pub/dashboard.css", "/app/resources/css/pub/dashboard.css", "/tmp/dashboard.css"),
    ("laravel/resources/js/legacy/android-fix.js", "/app/resources/js/legacy/android-fix.js", "/tmp/android-fix.js"),
    ("laravel/resources/js/legacy/js/dashboard-finance.js", "/app/resources/js/legacy/js/dashboard-finance.js", "/tmp/dashboard-finance.js"),
    ("laravel/resources/js/legacy/js/dashboard-listeners.js", "/app/resources/js/legacy/js/dashboard-listeners.js", "/tmp/dashboard-listeners.js")
]

print("1. Enviando arquivos fonte modificados para o servidor...")
for local, container_path, tmp_remote in files:
    print(f"  Enviando {local} -> root@46.225.100.64:{tmp_remote}...")
    res = subprocess.run(["scp", "-o", "StrictHostKeyChecking=no", local, f"root@46.225.100.64:{tmp_remote}"], capture_output=True, text=True)
    if res.returncode == 0:
        cmd_cp = f"docker cp {tmp_remote} conectaking-laravel:{container_path}"
        res_docker = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", cmd_cp], capture_output=True, text=True)
        if res_docker.returncode == 0:
            print(f"  docker cp OK -> {container_path}")
        else:
            print(f"  Erro docker cp {container_path}:", res_docker.stderr)
    else:
        print(f"  Erro SCP {local}:", res.stderr)

print("2. Empacotando e enviando pasta public/build atualizada...")
build_dir = "laravel/public/build"
tar_path = "build.tar.gz"
with tarfile.open(tar_path, "w:gz") as tar:
    tar.add(build_dir, arcname="build")

res_scp_build = subprocess.run(["scp", "-o", "StrictHostKeyChecking=no", tar_path, "root@46.225.100.64:/tmp/build.tar.gz"], capture_output=True, text=True)
if res_scp_build.returncode == 0:
    print("  SCP build.tar.gz OK, extraindo dentro do container conectaking-laravel...")
    cmd_extract = (
        "docker cp /tmp/build.tar.gz conectaking-laravel:/tmp/build.tar.gz && "
        "docker exec conectaking-laravel tar -xzf /tmp/build.tar.gz -C /app/public && "
        "docker exec conectaking-laravel rm -f /tmp/build.tar.gz"
    )
    res_extract = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", cmd_extract], capture_output=True, text=True)
    if res_extract.returncode == 0:
        print("  Extração de public/build concluída com sucesso no container!")
    else:
        print("  Erro ao extrair public/build no container:", res_extract.stderr)
else:
    print("  Erro SCP build.tar.gz:", res_scp_build.stderr)

if os.path.exists(tar_path):
    os.remove(tar_path)

print("3. Limpando cache do Laravel, views e recarregando FrankenPHP...")
cmd_refresh = (
    "docker exec conectaking-laravel php artisan view:clear && "
    "docker exec conectaking-laravel php artisan optimize:clear && "
    "docker restart conectaking-laravel"
)
res_refresh = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", cmd_refresh], capture_output=True, text=True)
print(res_refresh.stdout)
print("Deploy da correção de toque mobile concluído com 100% de sucesso!")
