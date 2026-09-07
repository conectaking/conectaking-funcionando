#!/bin/bash
set -e
grep -n 'king_selection\|verse-of-day\|Ver no Mapa\|item_type === .location\|King Selection' /opt/conectaking/views/profile.ejs | head -50
echo '==== DB extra ===='
docker exec conectaking-db psql -U conectaking -d conectaking -c "SELECT form_title FROM digital_form_items WHERE profile_item_id=9;"
docker exec conectaking-db psql -U conectaking -d conectaking -c "\dt *king*"
docker exec conectaking-db psql -U conectaking -d conectaking -c "SELECT id, slug, title, status FROM king_selection_galleries LIMIT 5;" 2>/dev/null || true
docker exec conectaking-db psql -U conectaking -d conectaking -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name ILIKE '%gall%' ORDER BY 1;"
# how node renders ks - snippet around item loop fallthrough
python3 - <<'PY'
import re
html=open('/tmp/node.html',encoding='utf-8',errors='ignore').read()
# find king selection related anchors
for m in re.finditer(r'.{0,80}king[Ss]election.{0,80}', html):
    print('NODE:', m.group(0).replace('\n',' ')[:160])
for m in re.finditer(r'verse-of-day[\s\S]{0,200}', html):
    print('VERSE:', m.group(0)[:200].replace('\n',' '))
    break
# digital form button text
for m in re.finditer(r'data-item-id=\"9\"[\s\S]{0,200}', html):
    print('FORM9:', m.group(0)[:200].replace('\n',' '))
PY
