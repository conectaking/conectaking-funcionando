import subprocess

remote_py = """
import sqlite3, json

conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute("SELECT id, name, nodes, connections FROM workflow_entity WHERE id='mkK244lveO0N1qPR'")
row = c.fetchone()
if row:
    nodes = json.loads(row[2])
    print("Found workflow:", row[1])
    for n in nodes:
        if 'agent' in n.get('type', '').lower() or 'openai' in n.get('type', '').lower():
            print("Node sample:", n['name'], n['type'], json.dumps(n, indent=2)[:300])
"""

proc = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", "python3"], input=remote_py, text=True, capture_output=True)
print(proc.stdout)
