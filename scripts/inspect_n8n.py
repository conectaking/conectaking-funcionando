import subprocess

remote_py = """
import sqlite3, json

conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute("SELECT id, name, active, nodes, connections, settings FROM workflow_entity WHERE active=1 LIMIT 1")
row = c.fetchone()
if row:
    print("ID:", row[0])
    print("Name:", row[1])
    print("Active:", row[2])
    nodes = json.loads(row[3])
    print("Nodes:", len(nodes))
    for n in nodes:
        print(" - Node:", n.get('name'), "Type:", n.get('type'))
"""

proc = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", "python3"], input=remote_py, text=True, capture_output=True)
print(proc.stdout)
if proc.stderr:
    print("ERR:", proc.stderr)
