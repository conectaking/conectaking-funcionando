import sqlite3
import json

conn = sqlite3.connect('/var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite')
cursor = conn.cursor()

print("=== WORKFLOW: CK Agent Telegram IA Boot (mkK244lveO0N1qPR) ===")
cursor.execute("SELECT id, name, active, nodes FROM workflow_entity WHERE id = 'mkK244lveO0N1qPR';")
row = cursor.fetchone()
if row:
    print(f"Name: {row[1]} | Active: {row[2]}")
    nodes = json.loads(row[3])
    for n in nodes:
        if 'telegram' in n.get('type', '').lower():
            print("  Node:", n.get('name'), "->", n.get('parameters'), "credentials:", n.get('credentials'))

print("\n=== LATEST EXECUTIONS (All) ===")
cursor.execute("SELECT id, workflowId, status, mode, startedAt, stoppedAt FROM execution_entity ORDER BY id DESC LIMIT 10;")
for r in cursor.fetchall():
    print(r)

print("\n=== WEBHOOK REGISTRATIONS ===")
cursor.execute("SELECT * FROM webhook_entity LIMIT 10;")
for r in cursor.fetchall():
    print(r)
