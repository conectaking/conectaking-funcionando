#!/usr/bin/env python3
import json, urllib.request

env = {}
with open('/opt/ck-agent/.env') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k] = v.strip("'\"")

token = env.get('TELEGRAM_BOT_TOKEN', '')
if not token:
    print("Token não encontrado")
    exit(1)

# getMyName
url_get = f"https://api.telegram.org/bot{token}/getMyName"
with urllib.request.urlopen(url_get) as resp:
    print("Nome atual no Telegram:", resp.read().decode())

# setMyName para 'Agente King'
url_set = f"https://api.telegram.org/bot{token}/setMyName"
data = json.dumps({"name": "Agente King"}).encode('utf-8')
req = urllib.request.Request(url_set, data=data, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as resp:
    print("Resultado setMyName:", resp.read().decode())
