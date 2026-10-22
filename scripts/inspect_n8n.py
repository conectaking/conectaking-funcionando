import subprocess

def run_query(query):
    cmd = [
        "ssh", "-o", "StrictHostKeyChecking=no", "root@46.225.100.64",
        f"docker exec ck-agent-n8n npx sqlite3 /home/node/.n8n/database.sqlite \"{query}\""
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    return res.stdout, res.stderr

print("--- Workflows ---")
out, err = run_query("SELECT id, name, active, updatedAt FROM workflow_entity;")
print(out)
if err:
    print("Err:", err)

print("--- Recent Executions ---")
out_exec, err_exec = run_query("SELECT id, workflowId, status, startedAt, stoppedAt FROM execution_entity ORDER BY id DESC LIMIT 10;")
print(out_exec)
if err_exec:
    print("Err exec:", err_exec)
