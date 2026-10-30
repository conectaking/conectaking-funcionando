import subprocess

remote_py = """
import sqlite3, json

conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute("SELECT connections FROM workflow_entity WHERE id='mkK244lveO0N1qPR'")
row = c.fetchone()
if row:
    conns = json.loads(row[0])
    print("Agent connections sample:")
    for k, v in conns.items():
        if 'Admin' in k or 'Agent' in k:
            print(k, "->", v)
"""

proc = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", "python3"], input=remote_py, text=True, capture_output=True)
print(proc.stdout)
