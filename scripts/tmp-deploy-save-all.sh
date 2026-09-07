#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
grep -q '^LARAVEL_PROFILE_API=' .env.prod && sed -i 's/^LARAVEL_PROFILE_API=.*/LARAVEL_PROFILE_API=true/' .env.prod || echo 'LARAVEL_PROFILE_API=true' >> .env.prod

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 8

TOKEN=$(docker exec conectaking-api node -e "const jwt=require('jsonwebtoken');process.stdout.write(jwt.sign({userId:'seed-admin-FNpGSFmV2bHm',email:'test@local'}, process.env.JWT_SECRET, {expiresIn:'1h'}));")

echo "=== GET profile ==="
curl -sS -D - -o /tmp/p1.json -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:5000/api/profile' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
docker cp /tmp/p1.json conectaking-api:/tmp/p1.json
BIO=$(docker exec conectaking-api node -e "const o=JSON.parse(require('fs').readFileSync('/tmp/p1.json','utf8')); process.stdout.write(String((o.details&&o.details.bio)||''));")
ITEMS=$(docker exec conectaking-api node -e "const o=JSON.parse(require('fs').readFileSync('/tmp/p1.json','utf8')); process.stdout.write(String((o.items||[]).length));")
echo "items_before=$ITEMS"

# save-all details only (não mexe em itens)
MARKER=" [ck-laravel-save]"
NEW_BIO="${BIO%"$MARKER"}$MARKER"
PAYLOAD=$(docker exec conectaking-api node -e "
const o=JSON.parse(require('fs').readFileSync('/tmp/p1.json','utf8'));
const details=Object.assign({}, o.details, { bio: process.argv[1] });
process.stdout.write(JSON.stringify({ details, items: [] }));
" "$NEW_BIO")

echo "=== PUT save-all (details only) ==="
curl -sS -D - -o /tmp/save.json -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @<(echo "$PAYLOAD") \
  'http://127.0.0.1:5000/api/profile/save-all' | tr -d '\r' | grep -iE 'HTTP/|x-conecta|X-Profile' | head -10

# PowerShell-safe alternative if process substitution fails — write file
printf '%s' "$PAYLOAD" > /tmp/save-payload.json
curl -sS -D - -o /tmp/save.json -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @/tmp/save-payload.json \
  'http://127.0.0.1:5000/api/profile/save-all' | tr -d '\r' | grep -iE 'HTTP/|x-conecta|X-Profile' | head -10

docker cp /tmp/save.json conectaking-api:/tmp/save.json
docker exec conectaking-api node -e "const o=JSON.parse(require('fs').readFileSync('/tmp/save.json','utf8')); console.log(JSON.stringify({success:o.success, message:o.message, items:(o.items||[]).length, err:o.message&&!o.success}));"

echo "=== GET again ==="
curl -sS -o /tmp/p2.json -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:5000/api/profile'
docker cp /tmp/p2.json conectaking-api:/tmp/p2.json
docker exec conectaking-api node -e "const o=JSON.parse(require('fs').readFileSync('/tmp/p2.json','utf8')); console.log(JSON.stringify({bio:(o.details&&o.details.bio)||'', items:(o.items||[]).length, hasMarker:String((o.details&&o.details.bio)||'').includes('[ck-laravel-save]')}));"

# restore bio without marker
RESTORE=$(docker exec conectaking-api node -e "
const o=JSON.parse(require('fs').readFileSync('/tmp/p1.json','utf8'));
process.stdout.write(JSON.stringify({ details: o.details, items: [] }));
")
printf '%s' "$RESTORE" > /tmp/restore.json
curl -sS -o /dev/null -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" --data-binary @/tmp/restore.json 'http://127.0.0.1:5000/api/profile/save-all'
echo DONE
