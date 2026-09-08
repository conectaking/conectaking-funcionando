#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 14
PASS=${CK_SMOKE_PASS:-playadryan22}
curl -sS -o /tmp/tok.json -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}"
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/tok.json'))['token'])")
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
echo "gid=$GID"

echo '--- ai/share-text validation ---'
curl -sS -D - -o /tmp/ai1.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/ai/share-text" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"kind":"bad"}' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/ai1.json')); print(o); assert 'kind' in o.get('message','').lower() or 'custom_append' in o.get('message','')"

echo '--- ai/share-text custom_append ---'
curl -sS -D - -o /tmp/ai2.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/ai/share-text" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"kind":"custom_append","hint":"tom curto e alegre","projectName":"Smoke","shareLink":"https://example.com/g"}' \
  | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/ai2.json')); print({k:(str(v)[:120] if isinstance(v,str) else v) for k,v in o.items()}); assert o.get('text') or 'OPENAI' in o.get('message','') or 'Limite' in o.get('message','')"

echo '--- ai/sales-whatsapp-template ---'
curl -sS -D - -o /tmp/ai3.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/ai/sales-whatsapp-template" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"kind":"approved","hint":"seja breve"}' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/ai3.json')); print({k:(str(v)[:120] if isinstance(v,str) else v) for k,v in o.items()}); assert o.get('text') or 'OPENAI' in o.get('message','') or 'Limite' in o.get('message','')"

echo '--- ai/support-default-message ---'
curl -sS -D - -o /tmp/ai4.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/ai/support-default-message" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"buttonLabel":"Suporte","hint":"pedido de ajuda com download"}' | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/ai4.json')); print({k:(str(v)[:120] if isinstance(v,str) else v) for k,v in o.items()}); assert o.get('text') or 'OPENAI' in o.get('message','') or 'Limite' in o.get('message','')"
echo DONE
