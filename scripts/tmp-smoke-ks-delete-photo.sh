#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
TMP=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "INSERT INTO king_photos (gallery_id, file_path, original_name, \"order\") VALUES (${GID}, 'r2:galleries/${GID}/smoke/tmp-del3.jpg', 'tmp-del3.jpg', 9997) RETURNING id;" | tr -d '[:space:]')
echo "TMP=$TMP"
curl -sS -D - -o /tmp/dp3.json -X DELETE "http://127.0.0.1:5000/api/king-selection/photos/${TMP}" -H "$AUTH" | tr -d '\r' | grep -iE 'HTTP/|x-conecta|content-type'
echo BODY:
cat /tmp/dp3.json
echo
node -e "
const { isLaravelKsPath } = (()=>{ try { return require('/opt/conectaking/middleware/laravelProxy'); } catch(e){ return {}; } })();
console.log('export has isLaravelKsPath', typeof isLaravelKsPath);
"
docker exec conectaking-api node -e "
const fs=require('fs');
const src=fs.readFileSync('/app/middleware/laravelProxy.js','utf8');
const m=src.match(/function isLaravelKsPath[\s\S]*?^}/m);
eval(src.replace('module.exports','global.__exp=')+';');
// can't easily. Just test regex:
const pathOnly='/api/king-selection/photos/${TMP}';
const method='DELETE';
const re=/^\\/(?:l\\/)?api\\/king-selection\\/photos\\/\\d+$/i;
console.log('match', method, pathOnly, re.test(pathOnly));
"
