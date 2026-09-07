#!/bin/bash
set -e
TOKEN=$(docker exec conectaking-api node -e "const jwt=require('jsonwebtoken');process.stdout.write(jwt.sign({userId:'seed-admin-FNpGSFmV2bHm',email:'test@local'}, process.env.JWT_SECRET, {expiresIn:'1h'}));")
curl -sS -o /tmp/prof.json -H "Authorization: Bearer $TOKEN" 'http://127.0.0.1:5000/api/profile'
docker cp /tmp/prof.json conectaking-api:/tmp/prof.json
docker exec conectaking-api node -e "const o=JSON.parse(require('fs').readFileSync('/tmp/prof.json','utf8')); console.log(JSON.stringify({has_details:!!o.details, slug:o.details&&o.details.profile_slug, items:(o.items||[]).length, display:o.details&&o.details.display_name, rgb:!!(o.details&&o.details.button_color_rgb), message:o.message||null}, null, 2));"
echo "unauthorized=$(curl -sS -o /dev/null -w '%{http_code}' 'http://127.0.0.1:5000/api/profile')"
