import sqlite3, json

with open('/tmp/patched_nodes.json', 'r', encoding='utf-8') as f:
    nodes = json.load(f)

nodes_str = json.dumps(nodes, ensure_ascii=False)

conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute("UPDATE workflow_entity SET nodes = ? WHERE id = 'mkK244lveO0N1qPR'", (nodes_str,))
conn.commit()
conn.close()
print('SQLITE UPDATED SUCCESSFULLY!')
