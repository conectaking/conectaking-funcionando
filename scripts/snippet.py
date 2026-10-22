import subprocess

py = """import sqlite3
import json

conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute("SELECT nodes FROM workflow_entity WHERE id='mkK244lveO0N1qPR'")
row = c.fetchone()
nodes = json.loads(row[0])
node = [n for n in nodes if n.get('name') == 'Executar Admin'][0]
code = node['parameters']['jsCode']

lines = code.split('\\n')
print('\\n'.join(lines[2755:2805]))
"""

p = subprocess.Popen(["ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64", "cat > /tmp/check_ld2.py && python3 /tmp/check_ld2.py"], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding='utf-8')
stdout, stderr = p.communicate(input=py)
safe_stdout = stdout.encode('ascii', 'backslashreplace').decode('ascii')
print(safe_stdout)
if stderr:
    print("ERR:", stderr)
