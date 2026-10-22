import subprocess
import json

cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", 
       "python3 -c \"import sqlite3; conn=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'); c=conn.cursor(); c.execute('PRAGMA table_info(webhook_entity)'); print('webhook_entity columns:', c.fetchall()); c.execute('SELECT * FROM webhook_entity WHERE webhookPath LIKE \\'%telegram%\\''); print('Rows:', c.fetchall())\""]

res = subprocess.run(cmd, capture_output=True, text=True)
print(res.stdout)
