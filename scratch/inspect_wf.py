import sqlite3
import json

conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute("SELECT nodes FROM workflow_entity WHERE id = 'B7oTCGI5CMcp1K9T'")
row = c.fetchone()
if row:
    nodes = json.loads(row[0])
    for n in nodes:
        if "Preparar" in n.get("name", ""):
            print("PREP JS:\n", n.get("parameters", {}).get("jsCode"))
