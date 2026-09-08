#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
curl -sS -o /tmp/tok.json -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}"
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/tok.json'))['token'])")
AUTH="Authorization: Bearer $TOKEN"
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
CID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_gallery_clients WHERE gallery_id=${GID} AND enabled IS DISTINCT FROM false ORDER BY id ASC LIMIT 1;" | tr -d '[:space:]')
# ensure a photo row exists for edited-upload
PID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_photos WHERE gallery_id=${GID} ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
if [ -z "$PID" ] || [ "$PID" = "0" ]; then
  PID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "INSERT INTO king_photos (gallery_id, file_path, original_name, \"order\") VALUES (${GID}, 'r2:galleries/${GID}/smoke/placeholder.jpg', 'placeholder.jpg', 0) RETURNING id;" | tr -d '[:space:]')
fi
echo "gid=$GID cid=$CID pid=$PID"

python3 -c "import json;o=json.load(open('/tmp/pw.json')) if False else None" >/dev/null 2>&1 || true
curl -sS -D - -o /tmp/pw.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/clients/${CID}/password" -H "$AUTH" \
  | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/pw.json')); print('pwd_ok', bool(o.get('password')) or 'Senha' in o.get('message','')); assert o.get('success') or 'Senha' in o.get('message','')"

curl -sS -D - -o /tmp/lcp.bin "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/link-cover-preview" -H "$AUTH" \
  | tr -d '\r' | grep -iE 'HTTP/|x-conecta|content-type' | head -6
python3 -c "import os;n=os.path.getsize('/tmp/lcp.bin'); print('preview_bytes',n); assert n>10"

python3 - <<'PY'
import struct,zlib
def chunk(t,d):
    c=t+d; return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c)&0xffffffff)
raw=b'\x00\x00\x00\x00\x00\x00\x00\x00\x00'
ihdr=struct.pack('>IIBBBBB',1,1,8,2,0,0,0)
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',ihdr)+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
open('/tmp/smoke-cover.png','wb').write(png)
PY

curl -sS -D - -o /tmp/lcu.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/link-cover-upload" \
  -H "$AUTH" -F "file=@/tmp/smoke-cover.png;type=image/png" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/lcu.json')); print(o); assert o.get('success') and str(o.get('gallery_link_cover_file_path') or '').startswith('r2:')"

curl -sS -D - -o /tmp/eu.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/photos/${PID}/edited-upload" \
  -H "$AUTH" -F "file=@/tmp/smoke-cover.png;type=image/png" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/eu.json')); print(o); assert o.get('success') and str(o.get('edited_file_path') or '').startswith('r2:')"
echo DONE
