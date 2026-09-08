#!/bin/bash
set -e
cd /opt/conectaking

rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .
cp -f /tmp/docker-compose.prod.yml docker-compose.prod.yml

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 12
hdr() { tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5; }

DAY=$(python3 -c "from datetime import datetime; from zoneinfo import ZoneInfo; d=datetime.now(ZoneInfo('America/Sao_Paulo')); print(d.timetuple().tm_yday if d.timetuple().tm_yday<=365 else 365)")
echo "day=$DAY"

echo "=== page ==="
curl -sS -D - -o /tmp/dev.html "http://127.0.0.1:5000/adrianokingg/biblia/devocional/$DAY" | hdr
python3 -c "h=open('/tmp/dev.html',encoding='utf-8',errors='replace').read(); print('mark-btn','btn-mark-read' in h, 'err','Server Error' in h)"

echo "=== mark-read ==="
curl -sS -D - -o /tmp/dm.json -X POST 'http://127.0.0.1:5000/api/bible/devotional/mark-read' \
  -H 'Content-Type: application/json' \
  -d "{\"visitor_id\":\"smoke-dev-vid\",\"day_of_year\":$DAY,\"slug\":\"adrianokingg\"}" | hdr
python3 -c "import json;o=json.load(open('/tmp/dm.json'));print('ok',o.get('success'),o.get('data'),o.get('message'))"

echo "=== read-status ==="
curl -sS -D - -o /tmp/ds.json "http://127.0.0.1:5000/api/bible/devotional/read-status?visitor_id=smoke-dev-vid&days=$DAY" | hdr
python3 -c "import json;o=json.load(open('/tmp/ds.json'));r=(o.get('data') or {}).get('read') or [];print('ok',o.get('success'),'n',len(r),r[:1])"

echo DONE
