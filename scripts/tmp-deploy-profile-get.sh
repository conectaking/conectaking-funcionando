#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz

grep -q '^LARAVEL_PROFILE_API=' .env.prod && sed -i 's/^LARAVEL_PROFILE_API=.*/LARAVEL_PROFILE_API=true/' .env.prod || echo 'LARAVEL_PROFILE_API=true' >> .env.prod

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 8

echo "=== env ==="
docker exec conectaking-api printenv | grep LARAVEL_PROFILE || true
docker exec conectaking-laravel printenv | grep JWT_SECRET | sed 's/=.*/=***/'

TOKEN=$(docker exec conectaking-api node -e "const jwt=require('jsonwebtoken');process.stdout.write(jwt.sign({userId:'seed-admin-FNpGSFmV2bHm',email:'test@local'}, process.env.JWT_SECRET, {expiresIn:'1h'}));")
echo "token_len=${#TOKEN}"

echo "=== GET /api/profile via proxy ==="
curl -sS -D - -o /tmp/prof.json -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:5000/api/profile' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -10
docker exec conectaking-api node -e "const o=JSON.parse(require('fs').readFileSync('/tmp/prof.json','utf8')); console.log({has_details:!!o.details, slug:o.details&&o.details.profile_slug, items:(o.items||[]).length, display:o.details&&o.details.display_name, engine_hint:o.engine||null});" 2>/dev/null || node -e "
const fs=require('fs');
const o=JSON.parse(fs.readFileSync('/tmp/prof.json','utf8'));
console.log(JSON.stringify({has_details:!!o.details, slug:o.details&&o.details.profile_slug, items:(o.items||[]).length, display:o.details&&o.details.display_name, err:o.message||null}));
"

# copy file into api container for node parse if needed
if ! head -c 20 /tmp/prof.json | grep -q details; then
  echo "BODY:"; head -c 400 /tmp/prof.json; echo
fi
# host node may not exist — use docker
docker cp /tmp/prof.json conectaking-api:/tmp/prof.json
docker exec conectaking-api node -e "const o=JSON.parse(require('fs').readFileSync('/tmp/prof.json','utf8')); console.log(JSON.stringify({has_details:!!o.details, slug:o.details&&o.details.profile_slug, items:(o.items||[]).length, display:o.details&&o.details.display_name, message:o.message||null}));"

echo "=== unauthorized ==="
curl -sS -D - -o /dev/null 'http://127.0.0.1:5000/api/profile' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
echo DONE
