#!/bin/bash
set -e
echo "==== ITENS DB ===="
docker exec conectaking-db psql -U conectaking -d conectaking -c "
SELECT pi.id, pi.item_type, LEFT(COALESCE(pi.title,''),40) AS title,
       LEFT(COALESCE(pi.destination_url,''),60) AS dest,
       (pi.image_url IS NOT NULL AND length(trim(pi.image_url))>0) AS has_img
FROM profile_items pi
JOIN users u ON u.id = pi.user_id
WHERE LOWER(u.profile_slug)='adrianokingg' AND pi.is_active=true
ORDER BY pi.display_order;
"
curl -sS http://127.0.0.1:5000/l/card/adrianokingg > /tmp/lar.html
curl -sS http://127.0.0.1:5000/adrianokingg > /tmp/node.html
echo "==== COMPARE ===="
python3 - <<'PY'
import re
lar=open('/tmp/lar.html',encoding='utf-8',errors='ignore').read()
node=open('/tmp/node.html',encoding='utf-8',errors='ignore').read()
checks=[
 'background-image-overlay-img','share-btn','Salvar Contato','Ver no Mapa',
 'profile-button-pix-qrcode','pix-qrcode-modal','profile-banner-container',
 'Página de Vendas','Formulário','verse-of-day','kingSelection','king_selection',
 'vitrine-text','texto-bloco','wifi-','profile-link','digital_form','guest-list'
]
print(f'lar_bytes={len(lar)} node_bytes={len(node)}')
for c in checks:
    print(f'{c:30} L={lar.count(c):3} N={node.count(c):3}')
# extract item types from node debug script if present
m=re.search(r"Tipos de itens:', \[(.*?)\]", node)
if m:
    print('node item types:', m.group(1)[:300])
# hrefs of interest
for label,pat in [('form', r'href="(/[^"]*form[^"]*)"'),('loja', r'href="(/[^"]*minha-loja[^"]*|/[^"]+/[^"]+)"'),('wa', r'href="(https://wa\.me[^"]*)"'),('ig', r'href="(https://www\.instagram[^"]*)"')]:
    print(label,'LAR', re.findall(pat,lar)[:3])
    print(label,'NODE', re.findall(pat,node)[:3])
PY

echo "==== LINK CHECKS ===="
# form link from laravel
FORM=$(grep -oE 'href="/adrianokingg/form/[0-9]+"' /tmp/lar.html | head -1 | sed 's/href="//;s/"//')
LOJA=$(grep -oE 'href="/adrianokingg/[^"]+"' /tmp/lar.html | grep -v form | grep -v vcard | head -1 | sed 's/href="//;s/"//')
VCARD=$(grep -oE 'href="/vcard/[^"]+"' /tmp/lar.html | head -1 | sed 's/href="//;s/"//')
echo "FORM=$FORM LOJA=$LOJA VCARD=$VCARD"
for u in "$FORM" "$LOJA" "$VCARD"; do
  [ -z "$u" ] && continue
  code=$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:5000$u" || echo err)
  echo "$u -> $code"
done
# location item?
docker exec conectaking-db psql -U conectaking -d conectaking -tAc "
SELECT 'location_count='||count(*) FROM profile_items pi JOIN users u ON u.id=pi.user_id
WHERE LOWER(u.profile_slug)='adrianokingg' AND pi.item_type='location' AND pi.is_active;
"
docker exec conectaking-db psql -U conectaking -d conectaking -tAc "
SELECT 'texto='||count(*) FROM profile_items pi JOIN users u ON u.id=pi.user_id
WHERE LOWER(u.profile_slug)='adrianokingg' AND pi.item_type='texto_com_botao' AND pi.is_active;
"
docker exec conectaking-db psql -U conectaking -d conectaking -tAc "
SELECT 'ks='||count(*) FROM profile_items pi JOIN users u ON u.id=pi.user_id
WHERE LOWER(u.profile_slug)='adrianokingg' AND pi.item_type='king_selection' AND pi.is_active;
"
docker exec conectaking-db psql -U conectaking -d conectaking -tAc "
SELECT 'bible='||count(*) FROM profile_items pi JOIN users u ON u.id=pi.user_id
WHERE LOWER(u.profile_slug)='adrianokingg' AND pi.item_type='bible' AND pi.is_active;
"
