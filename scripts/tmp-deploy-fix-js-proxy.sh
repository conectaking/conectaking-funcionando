#!/bin/bash
set -e
cd /opt/conectaking
cp -f /tmp/laravelProxy.js middleware/laravelProxy.js
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 12
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta|content-type'|head -8; }

echo '=== /js/dashboard-editor.js (must be Node JS, not Laravel HTML) ==='
curl -sS -D - -o /tmp/js-ed.js http://127.0.0.1:5000/js/dashboard-editor.js | hdr
python3 -c "
import pathlib
b=pathlib.Path('/tmp/js-ed.js').read_bytes()
print('bytes', len(b), 'starts', b[:40])
assert len(b)>500, 'empty'
assert b'x-conecta-engine' not in b.lower()
text=b.decode('utf-8','ignore')[:80]
assert '<html' not in text.lower()
print('OK js asset')
"

echo '=== /css (sample) ==='
curl -sS -D - -o /dev/null http://127.0.0.1:5000/css/ 2>/dev/null | hdr || true

echo '=== grep reserved fix in container ==='
docker exec conectaking-api grep -n 'profileSlug).toLowerCase\|/\.[a-z0-9]' /app/middleware/laravelProxy.js | head -10
echo DONE
