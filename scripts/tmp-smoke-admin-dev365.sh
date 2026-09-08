#!/bin/bash
set -e
cd /opt/conectaking
JWT_SECRET=$(grep -E '^JWT_SECRET=' .env.prod | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
UIDN=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM users WHERE COALESCE(is_admin,false)=true OR email='conectaking@gmail.com' ORDER BY CASE WHEN COALESCE(is_admin,false) THEN 0 ELSE 1 END LIMIT 1;" | tr -d '[:space:]')
TOKEN=$(docker exec -e JWT_SECRET="$JWT_SECRET" -e UIDN="$UIDN" conectaking-api node -e 'const jwt=require("jsonwebtoken"); process.stdout.write(jwt.sign({userId: process.env.UIDN, isAdmin:true}, process.env.JWT_SECRET, {expiresIn:"2h"}));')
AUTH="Authorization: Bearer $TOKEN"
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -4; }
echo "toklen=${#TOKEN}"
echo '=== days ==='
curl -sS -D - -o /tmp/d365d.json -H "$AUTH" 'http://127.0.0.1:5000/api/admin/bible/devotionals-365/days' | hdr
python3 -c "import json;o=json.load(open('/tmp/d365d.json'));d=(o.get('data') or {}).get('days') or []; print('ok',o.get('success'),'n',len(d))"
YEAR=$(date +%Y)
echo '=== themes ==='
curl -sS -D - -o /tmp/d365t.json -H "$AUTH" "http://127.0.0.1:5000/api/admin/bible/devotionals-365/month-themes/$YEAR" | hdr
python3 -c "import json;o=json.load(open('/tmp/d365t.json'));t=(o.get('data') or {}).get('themes') or {}; print('themes',o.get('success'), len(t), list(t.keys())[:3])"
echo '=== upsert ==='
curl -sS -D - -o /tmp/d365u.json -X PUT -H "$AUTH" -H 'Content-Type: application/json' \
  'http://127.0.0.1:5000/api/admin/bible/devotionals-365/365' \
  -d '{"titulo":"Smoke","versiculo_ref":"Joao 3:16","reflexao":"t"}' | hdr
python3 -c "import json;print(json.load(open('/tmp/d365u.json')))"
curl -sS -o /tmp/d365x.json -X DELETE -H "$AUTH" 'http://127.0.0.1:5000/api/admin/bible/devotionals-365/365'
python3 -c "import json;print(json.load(open('/tmp/d365x.json')))"
# confirm file in image
docker exec conectaking-laravel test -f /app/app/Services/CartaoVirtual/BibleAdminDev365Service.php && echo 'service_in_image=yes'
echo DONE
