import subprocess

script = """
import sqlite3
conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute("SELECT * FROM shared_workflow WHERE workflowId='FnkVNknOa2gV0Tfn'")
print("shared_workflow:", c.fetchall())
"""

cmd = ['ssh', '-o', 'StrictHostKeyChecking=no', 'root@46.225.100.64', 'python3']
res = subprocess.run(cmd, input=script, capture_output=True, text=True)
print(res.stdout)
