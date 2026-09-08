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
AUTH="Authorization: Bearer $TOKEN"
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
echo "gid=$GID"

docker exec -e GID="$GID" conectaking-laravel php -r '
require "/app/vendor/autoload.php";
$app=require "/app/bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$gid=(int)getenv("GID");
$key="galleries/".$gid."/smoke/".bin2hex(random_bytes(4)).".jpg";
$secret=trim((string)env("KINGSELECTION_WORKER_SECRET"));
if($secret===""){fwrite(STDERR,"no secret\n"); exit(2);}
$now=time();
$payload=["typ"=>"ks_receipt","galleryId"=>$gid,"key"=>$key,"iat"=>$now,"exp"=>$now+900];
$header=["alg"=>"HS256","typ"=>"KS"];
$b64=function($d){$j=json_encode($d,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);return rtrim(strtr(base64_encode($j),"+/","-_"),"=");};
$h=$b64($header);$p=$b64($payload);
$sig=rtrim(strtr(base64_encode(hash_hmac("sha256",$h.".".$p,$secret,true)),"+/","-_"),"=");
file_put_contents("/tmp/ks-receipt.json", json_encode(["key"=>$key,"receipt"=>"$h.$p.$sig"]));
echo "ok\n";
'
docker cp conectaking-laravel:/tmp/ks-receipt.json /tmp/ks-receipt.json
KEY=$(python3 -c "import json;print(json.load(open('/tmp/ks-receipt.json'))['key'])")
RECEIPT=$(python3 -c "import json;print(json.load(open('/tmp/ks-receipt.json'))['receipt'])")
echo "key=$KEY"

echo '--- worker-commit ---'
python3 - <<PY
import json,urllib.request
body={"items":[{"key":"$KEY","receipt":"$RECEIPT","name":"smoke.jpg","order":0}]}
req=urllib.request.Request(
  "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/photos/worker-commit",
  data=json.dumps(body).encode(),
  headers={"Authorization":"$TOKEN","Content-Type":"application/json"},
  method="POST",
)
with urllib.request.urlopen(req) as r:
  raw=r.read(); print("status", r.status); print("engine", r.headers.get("x-conecta-engine")); print("proxy", r.headers.get("x-conecta-proxy"))
  open("/tmp/wc.json","wb").write(raw)
PY
python3 -c "import json;o=json.load(open('/tmp/wc.json')); print(o); assert o.get('success') and o.get('photos')"
PID=$(python3 -c "import json;print(json.load(open('/tmp/wc.json'))['photos'][0]['id'])")
docker exec conectaking-db psql -U conectaking -d conectaking -c "DELETE FROM king_photos WHERE id=${PID};" >/dev/null
echo DONE
