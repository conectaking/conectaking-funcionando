import subprocess

remote_py = """import json
with open('/tmp/mkK244lveO0N1qPR.json') as f:
    d = json.load(f)
for n in d[0]['nodes']:
    if 'Preparar' in n['name']:
        print(json.dumps(n))
"""

res = subprocess.run(["ssh", "root@46.225.100.64", f"python3 -c \"{remote_py}\""], capture_output=True, text=True)
print(res.stdout)
