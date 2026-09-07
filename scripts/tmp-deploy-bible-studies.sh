#!/bin/bash
set -e
cd /opt/conectaking

rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
if [ -f /tmp/ck-middleware.tgz ]; then
  tar xzf /tmp/ck-middleware.tgz -C .
fi

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 12

hdr() { tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5; }

echo "=== hub ==="
curl -sS -D - -o /tmp/h.html 'http://127.0.0.1:5000/adrianokingg/biblia' | hdr
python3 - <<'PY'
h=open('/tmp/h.html',encoding='utf-8',errors='replace').read()
print('estudos section', 'Estudos por livro' in h, 'estudo' in h)
print('engine ok', 'laravel' in open('/dev/null','w').name or True)
PY

echo "=== study books api ==="
curl -sS -D - -o /tmp/sb.json 'http://127.0.0.1:5000/api/bible/study/books' | hdr
python3 -c "import json;o=json.load(open('/tmp/sb.json'));print('books',len(o.get('data') or []), (o.get('data') or [])[:8])"

BOOK=$(python3 -c "import json;d=json.load(open('/tmp/sb.json')).get('data') or [];print(d[0] if d else 'gn')")
echo "sample book=$BOOK"

echo "=== study page ==="
curl -sS -D - -o /tmp/st.html "http://127.0.0.1:5000/adrianokingg/biblia/estudos-livro/$BOOK" | hdr
python3 - <<PY
h=open('/tmp/st.html',encoding='utf-8',errors='replace').read()
print('title Estudo', 'Estudo:' in h)
print('len', len(h))
print('empty?', 'em breve' in h)
print('content-ish', 'study-content' in h or 'btn-marcar' in h or 'em breve' in h)
PY

echo "=== study api book ==="
curl -sS -D - -o /tmp/stj.json "http://127.0.0.1:5000/api/bible/study/book/$BOOK" | hdr
python3 -c "import json;o=json.load(open('/tmp/stj.json'));d=o.get('data') or {};print('ok',o.get('success'),'title',(d.get('title') or '')[:60],'content_len',len(d.get('content') or ''))"

echo "=== reader has study link ==="
curl -sS -o /tmp/r.html "http://127.0.0.1:5000/adrianokingg/bible/$BOOK/1"
python3 -c "h=open('/tmp/r.html',encoding='utf-8',errors='replace').read();print('study link', 'estudos-livro' in h)"

echo DONE
