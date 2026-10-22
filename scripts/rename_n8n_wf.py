import sqlite3

conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
cursor = conn.cursor()
cursor.execute("UPDATE workflow_entity SET name = ? WHERE id = ?;", ("CK Agente King — IA Admin & Finanças", "mkK244lveO0N1qPR"))
conn.commit()
print("Updated rows:", cursor.rowcount)
