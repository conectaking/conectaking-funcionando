import subprocess

cmd = ["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", 
       "python3 -c \"import sqlite3, json; conn=sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite'); c=conn.cursor(); c.execute('SELECT nodes FROM workflow_entity WHERE id=\\'mkK244lveO0N1qPR\\''); row=c.fetchone(); nodes=json.loads(row[0]); node=[n for n in nodes if n.get('name')=='Executar Admin'][0]; open('/tmp/executar_admin.js', 'w').write(node.get('parameters', {}).get('jsCode', ''))\""]
subprocess.run(cmd, capture_output=True, text=True)

# Read file
cmd2 = ["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", "head -n 100 /tmp/executar_admin.js"]
res = subprocess.run(cmd2, capture_output=True, text=True)
print(res.stdout)
