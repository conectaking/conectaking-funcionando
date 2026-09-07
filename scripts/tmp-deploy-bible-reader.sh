#!/bin/bash
set -e
cd /opt/conectaking

for k in LARAVEL_UPLOAD_API LARAVEL_SATELLITES LARAVEL_PROFILE_API LARAVEL_CARD_APIS; do
  grep -q "^${k}=" .env.prod && sed -i "s/^${k}=.*/${k}=true/" .env.prod || echo "${k}=true" >> .env.prod
done

rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
cp -f /tmp/docker-compose.prod.yml docker-compose.prod.yml 2>/dev/null || true
# proxy Node (middleware) vem no tarball raiz se enviado — preferir laravel+middleware
if [ -f /tmp/ck-middleware.tgz ]; then
  tar xzf /tmp/ck-middleware.tgz -C .
fi

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 14

hdr() { tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5; }

echo "=== bible hub ==="
curl -sS -D - -o /tmp/bib.html 'http://127.0.0.1:5000/adrianokingg/biblia' | hdr
grep -cE 'Antigo Testamento|Gênesis|Novo Testamento|X-Conecta-Engine' /tmp/bib.html || true

echo "=== bible reader gn/1 ==="
curl -sS -D - -o /tmp/gn1.html 'http://127.0.0.1:5000/adrianokingg/bible/gn/1' | hdr
grep -cE 'No princípio|versículos|Próximo|Gênesis' /tmp/gn1.html || true
head -c 180 /tmp/gn1.html; echo

echo "=== bible API books ==="
curl -sS -D - -o /tmp/books.json 'http://127.0.0.1:5000/api/bible/books' | hdr
python3 -c "import json;o=json.load(open('/tmp/books.json'));print('ok',o.get('success'),'at',len((o.get('data') or {}).get('at') or []),'nt',len((o.get('data') or {}).get('nt') or []))"

echo "=== bible API chapter ==="
curl -sS -D - -o /tmp/ch.json 'http://127.0.0.1:5000/api/bible/book/jn/3' | hdr
python3 -c "import json;o=json.load(open('/tmp/ch.json'));d=o.get('data') or {};print('ok',o.get('success'),d.get('bookName'),d.get('chapter'),'verses',len(d.get('verses') or []))"

echo "=== form fields + submit ==="
DF=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT pi.id FROM profile_items pi JOIN users u ON u.id=pi.user_id WHERE u.profile_slug='adrianokingg' AND pi.item_type='digital_form' AND pi.is_active LIMIT 1;")
echo "df=$DF"
if [ -n "$DF" ]; then
  curl -sS -D - -o /tmp/form.html "http://127.0.0.1:5000/adrianokingg/form/$DF" | hdr
  grep -cE 'ck-form|Enviar|opts' /tmp/form.html || true
  curl -sS -D - -o /tmp/sub.json -X POST -H 'Content-Type: application/json' -H 'Accept: application/json' \
    --data '{"response_data":{"nome":"SmokeBible"},"responder_name":"SmokeBible"}' \
    "http://127.0.0.1:5000/adrianokingg/form/$DF/submit" | hdr
  cat /tmp/sub.json; echo
fi

echo DONE
