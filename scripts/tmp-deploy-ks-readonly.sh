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
cp -f /tmp/docker-compose.prod.yml docker-compose.prod.yml

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 12
hdr() { tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5; }

echo "=== landing KS ==="
curl -sS -D - -o /tmp/ks.html 'http://127.0.0.1:5000/kingSelection/eliseu' | hdr
python3 -c "h=open('/tmp/ks.html',encoding='utf-8',errors='replace').read(); print('ELISEU' in h, 'King Selection' in h, 'err','Server Error' in h, 'len',len(h))"

echo "=== api gallery ==="
curl -sS -D - -o /tmp/ksg.json 'http://127.0.0.1:5000/api/king-selection/public/gallery?slug=eliseu' | hdr
python3 -c "import json;o=json.load(open('/tmp/ksg.json'));g=o.get('gallery') or {};print('ok',o.get('success'),g.get('nome_projeto'),g.get('status'),g.get('total_photos'),g.get('access_mode'))"

echo "=== share meta ==="
curl -sS -D - -o /tmp/ksm.json 'http://127.0.0.1:5000/api/king-selection/public/gallery-share-meta/eliseu' | hdr
python3 -c "import json;o=json.load(open('/tmp/ksm.json'));print('ok',o.get('success'),o.get('ogTitle'), (o.get('ogImage') or '')[:60])"

echo "=== engine=node bypass ==="
curl -sS -D - -o /tmp/ksn.html 'http://127.0.0.1:5000/kingSelection/eliseu?engine=node' | hdr
python3 -c "h=open('/tmp/ksn.html',encoding='utf-8',errors='replace').read(); print('node-spa-ish', 'kingSelectionCliente' in h or 'King Selection' in h, 'laravel-landing', 'Abrir galeria (completa)' in h)"

echo DONE
