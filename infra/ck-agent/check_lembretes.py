#!/usr/bin/env python3
import json, os, urllib.request

env = {}
with open('/opt/ck-agent/.env') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            k, v = line.strip().split('=', 1)
            env[k] = v.strip("'\"")

token = env.get('CK_AGENT_JWT', '')

# 1. GET atual
req = urllib.request.Request(
    'http://127.0.0.1:8080/api/finance/king-data?profile_id=1',
    headers={'Authorization': f'Bearer {token}', 'Accept': 'application/json'}
)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    kingDb = data.get('data', {})

print("Antes:", kingDb.get('lembretes'))

# 2. PUT com lembrete de teste
sample = {
    'id': 'lem_test_1',
    'titulo': 'Ir para a academia',
    'tipo': 'compromisso',
    'data': '2026-09-23',
    'hora_inicio': '17:00',
    'hora_fim': '18:00',
    'status': 'ativo',
    'notificado': False
}
kingDb['lembretes'] = [sample]

putReq = urllib.request.Request(
    'http://127.0.0.1:8080/api/finance/king-data?profile_id=1',
    headers={'Authorization': f'Bearer {token}', 'Accept': 'application/json', 'Content-Type': 'application/json'},
    data=json.dumps({'profile_id': 1, 'data': kingDb}).encode('utf-8'),
    method='PUT'
)
with urllib.request.urlopen(putReq) as resp:
    putRes = json.loads(resp.read().decode('utf-8'))
    print("Depois do PUT:", putRes.get('data', {}).get('lembretes'))
