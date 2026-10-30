import subprocess

cmd = [
    'ssh', '-o', 'StrictHostKeyChecking=no', 'root@46.225.100.64',
    'docker exec ck-agent-n8n sqlite3 /home/node/.n8n/database.sqlite "SELECT id, name, active FROM workflow_entity;"'
]
res = subprocess.run(cmd, capture_output=True, text=True)
print(res.stdout)
