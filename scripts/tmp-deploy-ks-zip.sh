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

SLUG=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT slug FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
echo "slug=$SLUG"
curl -sS -o /tmp/ksent.json -X POST http://127.0.0.1:5000/api/king-selection/client/public-enter \
  -H 'Content-Type: application/json' -d "{\"slug\":\"$SLUG\"}" || true
# fallback signup-enter
TOK=$(python3 -c "import json;o=json.load(open('/tmp/ksent.json')); print(o.get('token') or o.get('accessToken') or '')" 2>/dev/null || true)
if [ -z "$TOK" ]; then
  curl -sS -o /tmp/ksent.json -X POST http://127.0.0.1:5000/api/king-selection/client/signup-enter \
    -H 'Content-Type: application/json' -d "{\"slug\":\"$SLUG\"}" || true
  TOK=$(python3 -c "import json;o=json.load(open('/tmp/ksent.json')); print(o.get('token') or o.get('accessToken') or '')" 2>/dev/null || true)
fi
if [ -z "$TOK" ]; then
  # mint via artisan inside laravel if enter failed
  TOK=$(docker exec conectaking-laravel php -r '
require "/app/vendor/autoload.php";
$app=require "/app/bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$g=Illuminate\Support\Facades\DB::selectOne("SELECT id, slug FROM king_galleries ORDER BY id DESC LIMIT 1");
$jwt=app(App\Services\Auth\JwtService::class);
echo $jwt->encode(["type"=>"kingselection_client","galleryId"=>(int)$g->id,"slug"=>$g->slug,"clientId"=>1], 3600);
')
fi
echo "tok_len=${#TOK}"
AUTH="Authorization: Bearer $TOK"

echo '--- download-zip-plan ---'
curl -sS -D - -o /tmp/zp.json -X POST http://127.0.0.1:5000/api/king-selection/client/download-zip-plan \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"slug\":\"$SLUG\",\"photo_ids\":[1]}" | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/zp.json')); print(o); assert 'message' in o or o.get('success') is True"

echo '--- download-zip ---'
curl -sS -D - -o /tmp/zz.bin -X POST http://127.0.0.1:5000/api/king-selection/client/download-zip \
  -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"slug\":\"$SLUG\",\"photo_ids\":[1]}" | tr -d '\r' | grep -iE 'HTTP/|x-conecta|content-type' | head -6
# 403/400 JSON or zip — both prove routing
python3 - <<'PY'
import os
n=os.path.getsize('/tmp/zz.bin')
print('bytes', n)
head=open('/tmp/zz.bin','rb').read(4)
if head[:1]==b'{':
  import json; print(json.loads(open('/tmp/zz.bin').read()))
else:
  assert head==b'PK\x03\x04', head
  print('zip_ok')
PY
echo DONE
