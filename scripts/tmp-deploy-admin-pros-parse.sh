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

JWT_SECRET=$(grep -E '^JWT_SECRET=' .env.prod | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^"//;s/"$//')
UIDN=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc \
  "SELECT id FROM users WHERE COALESCE(is_admin,false)=true OR email='conectaking@gmail.com' ORDER BY CASE WHEN COALESCE(is_admin,false) THEN 0 ELSE 1 END LIMIT 1;" | tr -d '[:space:]')
TOKEN=$(docker exec -e JWT_SECRET="$JWT_SECRET" -e UIDN="$UIDN" conectaking-api node -e 'const jwt=require("jsonwebtoken"); process.stdout.write(jwt.sign({userId: process.env.UIDN, isAdmin:true}, process.env.JWT_SECRET, {expiresIn:"2h"}));')
AUTH="Authorization: Bearer $TOKEN"

echo '=== parse-paste empty ==='
curl -sS -D - -o /tmp/pp0.json -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  'http://127.0.0.1:5000/api/admin/bible/prosperidade/1/parse-paste' \
  -d '{"text":""}' | hdr
python3 -c "import json;o=json.load(open('/tmp/pp0.json')); print('empty',o.get('success'), o.get('message'))"

echo '=== parse-paste sample ==='
python3 - <<'PY' > /tmp/pp-body.json
import json
text = """ATIVAÇÃO 1: Legado e Semente
\"A semente que você planta hoje\" — KING

1. O FUNDAMENTO SAGRADO:
Provérbios 1 fala sobre sabedoria e instrução para a vida.

💎 FRASES DE IMPACTO DO KING:
\"Plante com intenção\"
\"Colha com gratidão\"

1. SENTENÇA DE ATIVAÇÃO DIÁRIA
\"Eu caminho no legado que Deus preparou para mim.\"
"""
print(json.dumps({"text": text}))
PY
curl -sS -D - -o /tmp/pp1.json -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  'http://127.0.0.1:5000/api/admin/bible/prosperidade/1/parse-paste' \
  --data-binary @/tmp/pp-body.json | hdr
python3 -c "import json;o=json.load(open('/tmp/pp1.json'));d=o.get('data') or {};s=d.get('sections') or {};print('ok',o.get('success'),'n',d.get('activation_number'),'titulo',(s.get('titulo') or '')[:40],'fund',bool(s.get('fundamento_sagrado')),'sent',bool(s.get('sentenca_ativacao')))"

echo '=== range validation ==='
curl -sS -D - -o /tmp/pr.json -X POST -H "$AUTH" -H 'Content-Type: application/json' \
  'http://127.0.0.1:5000/api/admin/bible/prosperidade/generate-range-ai' \
  -d '{"start":1,"end":20,"async":false}' | hdr
python3 -c "import json;o=json.load(open('/tmp/pr.json')); print('range',o.get('success'), o.get('message'))"

echo '=== job not found ==='
curl -sS -D - -o /tmp/pj.json -H "$AUTH" \
  'http://127.0.0.1:5000/api/admin/bible/prosperidade/generation-job/no-such-job' | hdr
python3 -c "import json;o=json.load(open('/tmp/pj.json')); print('job404',o.get('success'), o.get('message'))"

echo DONE
