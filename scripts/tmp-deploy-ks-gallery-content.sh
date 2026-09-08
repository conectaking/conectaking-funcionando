#!/bin/bash
set -e
cd /opt/conectaking

for k in LARAVEL_KS; do
  grep -q "^${k}=" .env.prod && sed -i "s/^${k}=.*/${k}=true/" .env.prod || echo "${k}=true" >> .env.prod
done
if grep -q '^LARAVEL_KS_SLUGS=' .env.prod; then
  sed -i 's/^LARAVEL_KS_SLUGS=.*/LARAVEL_KS_SLUGS=eliseu/' .env.prod
else
  echo 'LARAVEL_KS_SLUGS=eliseu' >> .env.prod
fi

rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 12
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -5; }

echo '=== gallery-content ==='
curl -sS -D - -o /tmp/ksc.json 'http://127.0.0.1:5000/api/king-selection/public/gallery-content?slug=eliseu' | hdr
python3 -c "import json;o=json.load(open('/tmp/ksc.json'));g=o.get('gallery') or {};print('ok',o.get('success'),'msg',o.get('message'),'photos',len(g.get('photos') or []),'folders',len(g.get('folders') or []),'mode',g.get('access_mode'))"

echo '=== entry-splash ==='
curl -sS -D - -o /tmp/kss.jpg 'http://127.0.0.1:5000/api/king-selection/public/entry-splash?slug=eliseu' | hdr
python3 -c "b=open('/tmp/kss.jpg','rb').read(20); print('jpeg', b[:3]==b'\\xff\\xd8\\xff', 'or_text', b[:12], 'len', len(open('/tmp/kss.jpg','rb').read()))"

PID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT p.id FROM king_photos p JOIN king_galleries g ON g.id=p.gallery_id WHERE lower(g.slug)='eliseu' ORDER BY p.id LIMIT 1;" | tr -d '[:space:]')
echo "photo=$PID"
if [ -n "$PID" ]; then
  echo '=== public preview ==='
  curl -sS -D - -o /tmp/ksp.jpg "http://127.0.0.1:5000/api/king-selection/public/photos/$PID/preview?slug=eliseu&thumb=1" | hdr
  python3 -c "b=open('/tmp/ksp.jpg','rb').read(32); print('jpeg', b[:3]==b'\\xff\\xd8\\xff', 'statusish', b[:40], 'len', len(open('/tmp/ksp.jpg','rb').read()))"
fi

echo DONE
