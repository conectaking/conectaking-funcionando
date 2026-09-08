#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 12
hdr(){ tr -d '\r'|grep -iE 'HTTP/|x-conecta'|head -4; }

DAY=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc \
  "SELECT day_of_year FROM bible_devotionals_365 WHERE COALESCE(reflexao,'')<>'' ORDER BY day_of_year LIMIT 1;" | tr -d '[:space:]')
echo "day=$DAY"

echo '=== plain ==='
curl -sS -D - -o /tmp/d1.json "http://127.0.0.1:5000/api/bible/devotionals-365/$DAY?plain=1" | hdr
python3 -c "import json;o=json.load(open('/tmp/d1.json'));d=o.get('data') or {};print('plain',o.get('success'), 'tema' in d, d.get('day_of_year'), (d.get('titulo') or '')[:40])"

echo '=== themes ai=0 ==='
curl -sS -D - -o /tmp/d2.json "http://127.0.0.1:5000/api/bible/devotionals-365/$DAY?ai=0" | hdr
python3 -c "import json;o=json.load(open('/tmp/d2.json'));d=o.get('data') or {};print({k:d.get(k) for k in ('day_of_year','tema_mes','tema_ano','tema_modo_aplicado','estilo_devocional','ai_gerado','titulo')})"

echo '=== no query (may call AI or aviso) ==='
curl -sS -D - -o /tmp/d3.json --max-time 100 "http://127.0.0.1:5000/api/bible/devotionals-365/$DAY" | hdr
python3 -c "import json;o=json.load(open('/tmp/d3.json'));d=o.get('data') or {};print({k:d.get(k) for k in ('success','ai_gerado','ai_aviso','tema_mes') if k!='success'}); print('ok',o.get('success'), 'tema', bool(d.get('tema_mes')))"

echo DONE
