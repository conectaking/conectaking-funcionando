import json
import subprocess

# Read workflow from VPS
res = subprocess.run(["ssh", "root@46.225.100.64", "cat /tmp/mkK244lveO0N1qPR.json"], capture_output=True, text=True, encoding="utf-8")
wf = json.loads(res.stdout)

nodes = wf[0]["nodes"]
for n in nodes:
    if n["name"] == "Preparar (texto/voz)":
        print("=== PREPARAR ===")
        print(n["parameters"]["jsCode"])
    if n["name"] == "Executar Admin":
        print("=== EXECUTAR ADMIN (first 500 chars) ===")
        print(n["parameters"]["jsCode"][:500])
