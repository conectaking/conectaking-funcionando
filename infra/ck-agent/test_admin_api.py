#!/usr/bin/env python3
import json, os, urllib.request

TOKEN = None
with open('/opt/ck-agent/.env') as f:
    for line in f:
        if line.startswith('CK_AGENT_JWT='):
            TOKEN = line.strip().split('=', 1)[1].strip("'\"")
            break

headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json',
    'Accept': 'application/json'
}

def req(url, data=None, method=None):
    payload = json.dumps(data).encode('utf-8') if data is not None else None
    if method is None:
        method = 'POST' if data is not None else 'GET'
    r = urllib.request.Request(url, headers=headers, data=payload, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

print("=== 1. Test quick-manage info query ===")
status, res = req('http://127.0.0.1:8080/api/admin/users/quick-manage', {"identifier": "comercial@lapidarpisos.com.br"})
print(f"Status: {status}\nResult: {json.dumps(res, indent=2, ensure_ascii=False)}")

print("\n=== 2. Test create client user ===")
status, res = req('http://127.0.0.1:8080/api/admin/users', {
    "email": "teste.cliente.king@gmail.com",
    "password": "SenhaSegura123",
    "code": "KING-TEST1",
    "plan": "King Prime",
    "days": 60
})
print(f"Status: {status}\nResult: {json.dumps(res, indent=2, ensure_ascii=False)}")

print("\n=== 5. Test Bible Devotionals Month Themes ===")
status, res = req('http://127.0.0.1:8080/api/admin/bible/devotionals-365/month-themes/2026')
print(f"Themes status: {status}, Data: {res.get('data')}")

print("\n=== 6. Test save a theme for a month ===")
status, res = req('http://127.0.0.1:8080/api/admin/bible/devotionals-365/month-themes/2026', {
    "10": "Prosperidade & Fé Inabalável"
}, method='PUT')
print(f"Save theme status: {status}, Themes: {res.get('data', {}).get('themes')}")

# Cleanup
req('http://127.0.0.1:8080/api/admin/bible/devotionals-365/month-themes/2026', {"10": ""}, method='PUT')
r = urllib.request.Request('http://127.0.0.1:8080/api/admin/codes/KING-TEST1', headers=headers, method='DELETE')
try: urllib.request.urlopen(r)
except Exception: pass
print("=== Cleaned up test data ===")




