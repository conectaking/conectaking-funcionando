import subprocess
import sys

sys.stdout.reconfigure(encoding='utf-8')

cmd = [
    "ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64",
    'sqlite3 /var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite "SELECT id, workflowId, status, startedAt FROM execution_entity ORDER BY id DESC LIMIT 10;"'
]
res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
print("Recent executions (all workflows):")
print(res.stdout)
