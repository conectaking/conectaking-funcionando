import subprocess
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

cmd = [
    "ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64",
    'sqlite3 /var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite "SELECT id, finished, mode, status, startedAt, stoppedAt FROM execution_entity WHERE workflowId=\'mkK244lveO0N1qPR\' ORDER BY id DESC LIMIT 10;"'
]
res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
print("Recent executions for mkK244lveO0N1qPR:")
print(res.stdout)
