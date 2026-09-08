#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
sleep 12
PASS=${CK_SMOKE_PASS:-playadryan22}
curl -sS -o /tmp/tok.json -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}"
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/tok.json'))['token'])")
AUTH="Authorization: Bearer $TOKEN"
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
PID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_photos WHERE gallery_id=${GID} ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
echo "gid=$GID pid=$PID"

python3 - <<'PY'
import struct,zlib
def chunk(t,d):
    c=t+d; return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c)&0xffffffff)
raw=b'\x00\x00\x00\x00\x00\x00\x00\x00\x00'
ihdr=struct.pack('>IIBBBBB',1,1,8,2,0,0,0)
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',ihdr)+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
open('/tmp/smoke-cover.png','wb').write(png)
PY

echo '--- link-cover-upload ---'
curl -sS -D - -o /tmp/lcu.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/link-cover-upload" \
  -H "$AUTH" -F "file=@/tmp/smoke-cover.png;type=image/png" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/lcu.json')); print(o); assert o.get('success') and str(o.get('gallery_link_cover_file_path') or '').startswith('r2:')"

echo '--- link-cover-preview after upload ---'
curl -sS -D - -o /tmp/lcp.bin "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/link-cover-preview" -H "$AUTH" \
  | tr -d '\r' | grep -iE 'HTTP/|x-conecta|content-type' | head -6
python3 -c "import os;n=os.path.getsize('/tmp/lcp.bin'); print('preview_bytes',n); assert n>50"

echo '--- edited-upload ---'
curl -sS -D - -o /tmp/eu.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/photos/${PID}/edited-upload" \
  -H "$AUTH" -F "file=@/tmp/smoke-cover.png;type=image/png" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/eu.json')); print(o); assert o.get('success') and str(o.get('edited_file_path') or '').startswith('r2:')"
echo DONE
