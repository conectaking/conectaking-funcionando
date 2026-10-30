import subprocess

cmd = [
    'ssh', '-o', 'StrictHostKeyChecking=no', 'root@46.225.100.64',
    'docker inspect ck-agent-n8n --format "{{json .Mounts}}"'
]
res = subprocess.run(cmd, capture_output=True, text=True)
print(res.stdout)
