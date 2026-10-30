import subprocess

remote_py = """
import sqlite3, json

conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute("SELECT nodes FROM workflow_entity WHERE nodes LIKE '%webhook%' LIMIT 1")
row = c.fetchone()
if row:
    nodes = json.loads(row[0])
    for n in nodes:
        if 'webhook' in n.get('type', '').lower():
            print("Webhook sample:", n['type'], n['typeVersion'], json.dumps(n['parameters']))
else:
    print("No webhook node found in existing workflows")
"""

proc = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", "python3"], input=remote_py, text=True, capture_output=True)
print(proc.stdout)
