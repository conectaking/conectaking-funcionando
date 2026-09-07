#!/bin/bash
set -e
curl -sS http://127.0.0.1:5000/adrianokingg > /tmp/n.html
curl -sS http://127.0.0.1:5000/l/card/adrianokingg > /tmp/l.html
python3 - <<'PY'
import re
n=open('/tmp/n.html',encoding='utf-8',errors='ignore').read()
l=open('/tmp/l.html',encoding='utf-8',errors='ignore').read()
checks=[
 'share-btn','Salvar Contato','Ver no Mapa','verse-of-day-box','profile-button-pix-qrcode',
 'pix-qrcode-modal','profile-banner-container','Página de Vendas','Formulário','wifi-modal',
 'vitrine-text','youtube','instagram-embed','profile-carousel','background-image-overlay',
 'profile-actions','branding-logo','verse-of-day-box--bottom','profile-button-pix '
]
print(f'bytes N={len(n)} L={len(l)}')
for c in checks:
    print(f'{c:32} N={n.count(c):3} L={l.count(c):3}')
# item types debug from node
m=re.search(r"Tipos de itens:', \[(.*?)\]", n)
print('node types:', m.group(1) if m else '?')
PY
docker exec conectaking-db psql -U conectaking -d conectaking -tAc "
SELECT item_type||'='||count(*) FROM profile_items pi
JOIN users u ON u.id=pi.user_id
WHERE LOWER(u.profile_slug)='adrianokingg' AND pi.is_active
GROUP BY item_type ORDER BY 1;"
