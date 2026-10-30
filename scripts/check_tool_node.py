import subprocess

remote_py = """
import sqlite3, json

conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute("SELECT nodes FROM workflow_entity WHERE id='mkK244lveO0N1qPR'")
row = c.fetchone()
if row:
    nodes = json.loads(row[0])
    for n in nodes:
        if 'tool' in n.get('type', '').lower():
            print("Tool node:", n['name'], n['type'], n.get('typeVersion'))
"""

proc = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", "python3"], input=remote_py, text=True, capture_output=True)
print(proc.stdout)
