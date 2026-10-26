import subprocess
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

cmd = [
    "ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64",
    'sqlite3 /var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite "SELECT id, name, active, nodes FROM workflow_entity WHERE id IN (\'mkK244lveO0N1qPR\', \'B7oTCGI5CMcp1K9T\');"'
]
res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')

lines = res.stdout.splitlines()
for line in lines:
    parts = line.split('|', 3)
    if len(parts) >= 4:
        wid, name, active, nodes_json = parts[0], parts[1], parts[2], parts[3]
        print(f"\n==============================")
        print(f"ID: {wid} | Name: {name} | Active: {active}")
        try:
            nodes = json.loads(nodes_json)
            for n in nodes:
                t = n.get('type', '')
                if 'telegram' in t.lower() or 'trigger' in t.lower() or 'webhook' in t.lower():
                    print(f"  Node: {n.get('name')} ({t}) -> credentials: {n.get('credentials')}")
        except Exception as e:
            print("  Error parsing nodes:", e)
