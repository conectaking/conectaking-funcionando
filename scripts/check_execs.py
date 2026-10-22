import subprocess
import json

cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", 
       "python3 -c \"import sqlite3, json; conn=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'); c=conn.cursor(); c.execute('SELECT data FROM credentials_entity WHERE id=\\'g9e8goMSML0vE2JS\\''); print(c.fetchone())\""]
res = subprocess.run(cmd, capture_output=True, text=True)
print("Credential data:")
print(res.stdout)
