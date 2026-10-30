import subprocess

cmd = ['ssh', '-o', 'StrictHostKeyChecking=no', 'root@46.225.100.64', 'docker exec ck-agent-n8n ls -la /home/node/.n8n']
res = subprocess.run(cmd, capture_output=True, text=True)
print(res.stdout)
