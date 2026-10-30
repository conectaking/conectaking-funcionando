import subprocess

script = """
import sqlite3, json
conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute("PRAGMA table_info(workflow_entity)")
print("Columns:", [col[1] for col in c.fetchall()])

c.execute("SELECT id, name, nodes, connections, settings, staticData, pinData, versionId FROM workflow_entity WHERE id='FnkVNknOa2gV0Tfn'")
row = c.fetchone()
print("ID:", row[0], "Name:", row[1], "VersionId:", row[7])
print("Nodes sample:", row[2][:300])
"""

cmd = ['ssh', '-o', 'StrictHostKeyChecking=no', 'root@46.225.100.64', 'python3']
res = subprocess.run(cmd, input=script, capture_output=True, text=True)
print(res.stdout)
