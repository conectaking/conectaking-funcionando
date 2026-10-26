import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

cmd = [
    "ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64",
    'sqlite3 /var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite "SELECT id, name, active FROM workflow_entity;"'
]
res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
print("WORKFLOWS:")
print(res.stdout)
if res.stderr:
    print("STDERR:", res.stderr)
if res.stderr:
    print("STDERR:", res.stderr)
