import subprocess

remote_py = """
import sqlite3

conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute("PRAGMA table_info(workflow_entity)")
print("workflow_entity columns:", [r[1] for r in c.fetchall()])
c.execute("PRAGMA table_info(shared_workflow)")
print("shared_workflow columns:", [r[1] for r in c.fetchall()])
c.execute("SELECT * FROM shared_workflow WHERE workflowId='mkK244lveO0N1qPR'")
print("shared_workflow sample:", c.fetchall())
"""

proc = subprocess.run(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", "python3"], input=remote_py, text=True, capture_output=True)
print(proc.stdout)
