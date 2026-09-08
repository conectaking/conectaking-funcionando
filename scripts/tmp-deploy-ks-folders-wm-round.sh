#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 14
PASS=${CK_SMOKE_PASS:-playadryan22}
curl -sS -o /tmp/tok.json -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}"
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/tok.json'))['token'])")
AUTH="Authorization: Bearer $TOKEN"
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
echo "gid=$GID"

echo '--- open-selection-round ---'
curl -sS -D - -o /tmp/osr.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/open-selection-round" \
  -H "$AUTH" -H 'Content-Type: application/json' -d '{}' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/osr.json')); print(o); assert 'message' in o or o.get('success') or o.get('selection_round') is not None"

echo '--- folders/generate ---'
curl -sS -D - -o /tmp/fg.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/folders/generate" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d '{"count":1,"prefix":"SmokePasta","startAt":9001}' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/fg.json')); print('created',o.get('created'),'folders',len(o.get('folders') or [])); assert o.get('success') and int(o.get('created') or 0)>=0"

FID=$(python3 -c "import json;fs=json.load(open('/tmp/fg.json')).get('folders') or []; print(next((f['id'] for f in fs if 'SmokePasta' in str(f.get('name',''))), fs[-1]['id'] if fs else 0))")
echo "fid=$FID"

echo '--- folders/reorder ---'
curl -sS -D - -o /tmp/fr.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/folders/reorder" \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"folder_ids\":[${FID}]}" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/fr.json')); assert o.get('success')"

PID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_photos WHERE gallery_id=${GID} ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
echo "pid=$PID"
if [ -n "$PID" ] && [ "$PID" != "0" ] && [ -n "$FID" ] && [ "$FID" != "0" ]; then
  echo '--- assign-folder ---'
  curl -sS -D - -o /tmp/af.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/photos/assign-folder" \
    -H "$AUTH" -H 'Content-Type: application/json' \
    -d "{\"photo_ids\":[${PID}],\"folder_id\":${FID}}" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
  python3 -c "import json;o=json.load(open('/tmp/af.json')); print(o); assert o.get('success')"
fi

echo '--- watermark upload ---'
python3 - <<'PY'
import struct,zlib
def chunk(t,d):
    c=t+d; return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c)&0xffffffff)
raw=b'\x00\x00\x00\x00\x00\x00\x00\x00\x00'
ihdr=struct.pack('>IIBBBBB',1,1,8,2,0,0,0)
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',ihdr)+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
open('/tmp/smoke-wm.png','wb').write(png)
PY
curl -sS -D - -o /tmp/wu.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/watermark?which=portrait" \
  -H "$AUTH" -F "file=@/tmp/smoke-wm.png;type=image/png" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/wu.json')); print(o); assert o.get('success') and str(o.get('watermark_path') or '').startswith('r2:')"

echo '--- thank-you-image ---'
curl -sS -D - -o /tmp/ty.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/thank-you-image" \
  -H "$AUTH" -F "file=@/tmp/smoke-wm.png;type=image/png" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/ty.json')); print(o); assert o.get('success')"

echo DONE
