import subprocess
import json

cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", 
       "python3 -c \"import sqlite3, json; conn=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'); c=conn.cursor(); c.execute('SELECT nodes FROM workflow_entity WHERE id=\\'mkK244lveO0N1qPR\\''); row=c.fetchone(); nodes=json.loads(row[0]); admin_nodes=[n for n in nodes if 'admin' in n.get('name', '').lower() or 'executar' in n.get('name', '').lower() or 'intent' in n.get('name', '').lower()]; print(json.dumps([{'name': n.get('name'), 'type': n.get('type'), 'params': n.get('parameters')} for n in admin_nodes], indent=2))\""]
res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
print(res.stdout)
