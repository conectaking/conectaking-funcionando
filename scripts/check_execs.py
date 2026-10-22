import subprocess
import json

cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", 
       "sqlite3 /var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite \"SELECT data FROM execution_data WHERE executionId='14519';\""]
res = subprocess.run(cmd, capture_output=True, encoding='utf-8', errors='ignore')
data = json.loads(res.stdout)
for idx, item in enumerate(data):
    if isinstance(item, dict):
        if 'tool_calls' in item or 'arguments' in item or 'name' in item:
            print(f"Dict at {idx}:", item)
        if 'stepMsg' in item:
            print(f"stepMsg at {idx}:", item['stepMsg'])
