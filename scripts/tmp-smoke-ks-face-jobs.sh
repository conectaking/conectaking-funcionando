#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5; }
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
AUTH="Authorization: Bearer $TOKEN"
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | head -n1 | tr -d '[:space:]')
PID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_photos WHERE gallery_id=${GID} ORDER BY id DESC LIMIT 1;" | head -n1 | tr -d '[:space:]')
SLUG=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT slug FROM king_galleries WHERE id=${GID};" | head -n1 | tr -d '[:space:]')
CID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_gallery_clients WHERE gallery_id=${GID} AND enabled IS DISTINCT FROM false ORDER BY id ASC LIMIT 1;" | head -n1 | tr -d '[:space:]')
echo "gid=$GID pid=$PID slug=$SLUG cid=$CID"

echo '=== face-process-status ==='
curl -sS -D - -o /tmp/fps.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/face-process-status" -H "$AUTH" | hdr
python3 -c "import json;o=json.load(open('/tmp/fps.json')); print(o); assert o.get('success')"

echo '=== auto-separate-job ==='
curl -sS -D - -o /tmp/asj.json "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/folders/auto-separate-job" -H "$AUTH" | hdr
python3 -c "import json;o=json.load(open('/tmp/asj.json')); print(o); assert o.get('success')"

echo '=== process-faces (photo) ==='
if [ -n "$PID" ] && [ "$PID" != "0" ]; then
  curl -sS -D - -o /tmp/pf.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/photos/${PID}/process-faces" -H "$AUTH" -H 'Content-Type: application/json' -d '{}' | hdr
  python3 -c "import json;o=json.load(open('/tmp/pf.json')); print({k:o.get(k) for k in list(o)[:8]}); assert o.get('success') or 'message' in o"
else
  echo 'skip process-faces (no photo)'
fi

echo '=== process-all-faces ==='
curl -sS -D - -o /tmp/paf.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/process-all-faces" -H "$AUTH" -H 'Content-Type: application/json' -d '{"limit":1}' | hdr
python3 -c "import json;o=json.load(open('/tmp/paf.json')); print({k:o.get(k) for k in list(o)[:10]}); assert o.get('success') or 'message' in o"

echo '=== config-finalizacao HTML ==='
curl -sS -D - -o /tmp/cfg.html "http://127.0.0.1:5000/api/king-selection/config-finalizacao/${GID}?token=${TOKEN}" | hdr
python3 -c "t=open('/tmp/cfg.html',encoding='utf-8',errors='ignore').read(); print('len',len(t),'head',t[:120].replace(chr(10),' ')); assert 'finaliza' in t.lower() or 'Obrigado' in t; assert 'galleryId' in t"

echo '=== client face-results (need client jwt) ==='
# mint via access-link if possible
CTOKEN=$(curl -sS "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/clients/${CID}/access-link" -H "$AUTH" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('token') or '')" || true)
if [ -n "$CTOKEN" ]; then
  curl -sS -D - -o /tmp/cfr.json "http://127.0.0.1:5000/api/king-selection/client/face-results?page=1&limit=5" -H "Authorization: Bearer $CTOKEN" | hdr
  python3 -c "import json;o=json.load(open('/tmp/cfr.json')); print({k:o.get(k) for k in ('success','code','total','message') if k in o or True}); assert o.get('success') or 'message' in o"

  echo '=== reset-face-session ==='
  curl -sS -D - -o /tmp/rfs.json -X POST "http://127.0.0.1:5000/api/king-selection/client/reset-face-session" -H "Authorization: Bearer $CTOKEN" -H 'Content-Type: application/json' -d '{}' | hdr
  python3 -c "import json;o=json.load(open('/tmp/rfs.json')); print(o); assert o.get('success') or 'message' in o"

  echo '=== my-photos ==='
  curl -sS -D - -o /tmp/mp.json "http://127.0.0.1:5000/api/king-selection/public/galleries/${SLUG}/my-photos?clientToken=${CTOKEN}&limit=5" | hdr
  python3 -c "import json;o=json.load(open('/tmp/mp.json')); print({k:o.get(k) for k in ('success','galleryId','clientId','message')}); assert o.get('success') or 'message' in o"
else
  echo 'skip client face (no access-link token)'
fi

echo '=== enroll-face-anonymous (expect 403 if not public gallery) ==='
python3 - <<'PY'
import struct,zlib
def chunk(t,d):
    c=t+d; return struct.pack('>I',len(d))+c+struct.pack('>I',zlib.crc32(c)&0xffffffff)
raw=b'\x00'*9
ihdr=struct.pack('>IIBBBBB',1,1,8,2,0,0,0)
open('/tmp/smoke-face.png','wb').write(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',ihdr)+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b''))
PY
curl -sS -D - -o /tmp/efa.json -X POST "http://127.0.0.1:5000/api/king-selection/public/enroll-face-anonymous?slug=${SLUG}" \
  -F "image=@/tmp/smoke-face.png;type=image/png" | hdr
python3 -c "import json;o=json.load(open('/tmp/efa.json')); print(o); assert 'message' in o or o.get('success')"

echo DONE
