import sqlite3
import json

conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
c = conn.cursor()
c.execute("SELECT data FROM execution_data WHERE executionId = 2454")
row = c.fetchone()
if row and row[0]:
    d = json.loads(row[0])
    print("TYPE:", type(d))
    if isinstance(d, dict):
        print("KEYS:", d.keys())
        print("RESULTDATA:", json.dumps(d.get("resultData"), indent=2)[:1000])
    elif isinstance(d, list):
        print("LEN:", len(d))
        print("FIRST ITEM:", json.dumps(d[0], indent=2)[:1000])
