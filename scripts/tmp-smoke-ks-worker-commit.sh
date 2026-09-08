#!/bin/bash
set -e
PASS=${CK_SMOKE_PASS:-playadryan22}
curl -sS -o /tmp/tok.json -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}"
TOKEN=$(python3 -c "import json;print(json.load(open('/tmp/tok.json'))['token'])")
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
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
'
docker cp conectaking-laravel:/tmp/ks-receipt.json /tmp/ks-receipt.json
python3 - <<'PY'
import json
rec=json.load(open('/tmp/ks-receipt.json'))
body={"items":[{"key":rec["key"],"receipt":rec["receipt"],"name":"smoke.jpg","order":0}]}
open('/tmp/wc-body.json','w').write(json.dumps(body))
print('key', rec['key'])
PY
GID=$(docker exec conectaking-db psql -U conectaking -d conectaking -tAc "SELECT id FROM king_galleries ORDER BY id DESC LIMIT 1;" | tr -d '[:space:]')
echo "gid=$GID"
curl -sS -D - -o /tmp/wc.json -X POST "http://127.0.0.1:5000/api/king-selection/galleries/${GID}/photos/worker-commit" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  --data-binary @/tmp/wc-body.json | tr -d '\r' | grep -iE 'HTTP/|x-conecta' | head -5
python3 -c "import json;o=json.load(open('/tmp/wc.json')); print(o); assert o.get('success') and o.get('photos')"
PID=$(python3 -c "import json;print(json.load(open('/tmp/wc.json'))['photos'][0]['id'])")
docker exec conectaking-db psql -U conectaking -d conectaking -c "DELETE FROM king_photos WHERE id=${PID};" >/dev/null
echo DONE
