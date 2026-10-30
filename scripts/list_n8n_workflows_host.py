import subprocess

script = """
import sqlite3
conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute('SELECT id, name, active FROM workflow_entity')
for r in c.fetchall():
    print(r)
"""

cmd = ['ssh', '-o', 'StrictHostKeyChecking=no', 'root@46.225.100.64', 'python3']
res = subprocess.run(cmd, input=script, capture_output=True, text=True)
print(res.stdout)
print(res.stderr)
