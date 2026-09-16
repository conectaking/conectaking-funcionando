import urllib.request

routes = [
    '/', '/login', '/registro', '/recuperar-senha', '/dashboard', 
    '/dashboard-finance', '/kingForms', '/kingSelection', '/kingDocs', 
    '/admin', '/guestListEdit', '/salesPageEdit', '/conta',
    '/adrianokingg', '/adrianokingg/biblia', '/adrianokingg/biblia/estudos-livro',
    '/health', '/up'
]

print(f"{'ROTA':<35} | {'STATUS':<10}")
print("-" * 50)
for r in routes:
    req = urllib.request.Request('http://127.0.0.1:8080' + r, headers={'Host': 'www.conectaking.com.br', 'User-Agent': 'Mozilla/5.0'})
    try:
        res = urllib.request.urlopen(req, timeout=5)
        print(f"{r:<35} | {res.status} OK")
    except urllib.error.HTTPError as e:
        print(f"{r:<35} | HTTP {e.code}")
    except Exception as e:
        print(f"{r:<35} | ERR: {e}")
