#!/bin/bash
set -e
cd /opt/conectaking

# flags
for k in LARAVEL_UPLOAD_API LARAVEL_SATELLITES LARAVEL_PROFILE_API; do
  grep -q "^${k}=" .env.prod && sed -i "s/^${k}=.*/${k}=true/" .env.prod || echo "${k}=true" >> .env.prod
done

rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
cp -f /tmp/docker-compose.prod.yml docker-compose.prod.yml 2>/dev/null || true

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 12

TOKEN=$(docker exec conectaking-api node -e "const jwt=require('jsonwebtoken');process.stdout.write(jwt.sign({userId:'seed-admin-FNpGSFmV2bHm',email:'test@local'}, process.env.JWT_SECRET, {expiresIn:'1h'}));")
AUTH="Authorization: Bearer $TOKEN"
hdr() { tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5; }

echo "=== upload auth ==="
curl -sS -D - -o /tmp/uauth.json -X POST -H "$AUTH" 'http://127.0.0.1:5000/api/upload/auth' | hdr
python3 -c "import json;o=json.load(open('/tmp/uauth.json'));print({k:o.get(k) for k in ['success','imageId','accountHash','uploadURL']})"

echo "=== upload tiny png via receive-one (if r2) ==="
python3 - <<'PY'
import struct,zlib
def png(w=1,h=1):
  def chunk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
  raw=b'\x00'+b'\x00\x00\x00'+b'\x00'
  return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
open('/tmp/t.png','wb').write(png())
PY
UP=$(python3 -c "import json;print(json.load(open('/tmp/uauth.json')).get('uploadURL') or '')")
if echo "$UP" | grep -q 'receive-one'; then
  curl -sS -D - -o /tmp/up.png.json -X POST -H "$AUTH" -F "file=@/tmp/t.png;type=image/png" "$UP" | hdr
  python3 -c "import json;o=json.load(open('/tmp/up.png.json'));print({'success':o.get('success'),'url':(o.get('url') or '')[:80]})"
else
  echo "skip receive-one (CF direct upload URL)"
fi

echo "=== bible hub satellite ==="
curl -sS -D - -o /tmp/bib.html 'http://127.0.0.1:5000/adrianokingg/biblia' | hdr
grep -c 'X-Conecta-Engine\|Bíblia\|Voltar ao cartão\|verse' /tmp/bib.html || true
head -c 200 /tmp/bib.html; echo

echo "=== form by item (find digital_form) ==="
DF=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT pi.id FROM profile_items pi JOIN users u ON u.id=pi.user_id WHERE u.profile_slug='adrianokingg' AND pi.item_type='digital_form' AND pi.is_active LIMIT 1;")
echo "df=$DF"
if [ -n "$DF" ]; then
  curl -sS -D - -o /tmp/form.html "http://127.0.0.1:5000/adrianokingg/form/$DF" | hdr
  grep -c 'ck-form\|Enviar\|Formulário' /tmp/form.html || true
  curl -sS -D - -o /tmp/sub.json -X POST -H 'Content-Type: application/json' \
    --data '{"response_data":{"nome":"Smoke"},"responder_name":"Smoke"}' \
    "http://127.0.0.1:5000/adrianokingg/form/$DF/submit" | hdr
  cat /tmp/sub.json; echo
fi

echo "=== sales preview /l/loja if any ==="
STORE=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT sp.slug FROM sales_pages sp JOIN profile_items pi ON pi.id=sp.profile_item_id JOIN users u ON u.id=pi.user_id WHERE u.profile_slug='adrianokingg' LIMIT 1;")
echo "store=$STORE"
if [ -n "$STORE" ]; then
  curl -sS -D - -o /tmp/loja.html "http://127.0.0.1:5000/l/loja/adrianokingg/$STORE" | hdr
  grep -c 'store_title\|Produto\|Loja\|grid' /tmp/loja.html || true
fi

echo DONE
