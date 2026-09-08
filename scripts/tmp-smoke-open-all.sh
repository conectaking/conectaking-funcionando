#!/bin/bash
set -e
cd /opt/conectaking
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -4; }
echo '=== adrianokingg ==='
curl -sS -D - -o /tmp/a.html 'http://127.0.0.1:5000/adrianokingg' | hdr
echo '=== other slug ==='
SLUG=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT profile_slug FROM users WHERE COALESCE(profile_slug,'')<>'' AND profile_slug<>'adrianokingg' LIMIT 1;" | tr -d '[:space:]')
echo "slug=$SLUG"
if [ -n "$SLUG" ]; then
  curl -sS -D - -o /tmp/o.html "http://127.0.0.1:5000/$SLUG" | hdr
fi
echo '=== ks login empty ==='
curl -sS -D - -o /tmp/ksl.json -X POST -H 'Content-Type: application/json' \
  'http://127.0.0.1:5000/api/king-selection/client/login' -d '{}' | hdr
python3 -c "import json;print(json.load(open('/tmp/ksl.json')))"
echo '=== account 401 ==='
curl -sS -D - -o /tmp/as.json 'http://127.0.0.1:5000/api/account/status' | hdr
JWT_SECRET=$(grep -E '^JWT_SECRET=' .env.prod | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
UIDN=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM users WHERE email='conectaking@gmail.com' LIMIT 1;" | tr -d '[:space:]')
TOKEN=$(docker exec -e JWT_SECRET="$JWT_SECRET" -e UIDN="$UIDN" conectaking-api node -e 'const jwt=require("jsonwebtoken");process.stdout.write(jwt.sign({userId:process.env.UIDN,isAdmin:true},process.env.JWT_SECRET,{expiresIn:"1h"}));')
echo '=== account ok ==='
curl -sS -D - -o /tmp/as2.json -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:5000/api/account/status' | hdr
python3 -c "import json;o=json.load(open('/tmp/as2.json'));print({k:o.get(k) for k in ('email','plan_code','hasKingSelection','hasFinance','hasDigitalForm')})"
echo DONE
