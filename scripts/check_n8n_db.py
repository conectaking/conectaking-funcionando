import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('46.225.100.64', username='root')

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    return out, err

out, err = run('sqlite3 /var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite "SELECT id, name, active, versionId FROM workflow_entity;"')
print("WORKFLOW ENTITY:")
print(out)
if err: print("ERR:", err)

out, err = run('sqlite3 /var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite ".schema workflow_history"')
print("WORKFLOW HISTORY SCHEMA:")
print(out)
if err: print("ERR:", err)

out, err = run('sqlite3 /var/lib/docker/volumes/ck-agent_n8n_data/_data/database.sqlite "SELECT versionId, workflowId, createdAt FROM workflow_history WHERE workflowId=\'mkK244lveO0N1qPR\';"')
print("WORKFLOW HISTORY ROWS for mkK244lveO0N1qPR:")
print(out)
if err: print("ERR:", err)

ssh.close()
