#!/bin/bash
set -euo pipefail
echo "=== WA endpoints ==="
docker exec ck-agent-evolution sh -c '
node -e "
const https=require(\"https\");
const hosts=[\"web.whatsapp.com\",\"g.whatsapp.net\",\"v.whatsapp.net\"];
(async()=>{
  for (const h of hosts){
    await new Promise(r=>{
      const req=https.get({host:h,path:\"/\",timeout:8000},res=>{console.log(h,res.statusCode);r()});
      req.on(\"error\",e=>{console.log(h,\"ERR\",e.message);r()});
      req.on(\"timeout\",()=>{console.log(h,\"TIMEOUT\");req.destroy();r()});
    });
  }
})();
"'

echo "=== env sample ==="
docker exec ck-agent-evolution printenv | grep -E 'SERVER_URL|DATABASE|CACHE|AUTH|LOG' | sort

echo "=== increase logs and try pair code path ==="
# patch compose temporarily via recreate with more logs - done in next step
KEY=$(grep '^EVOLUTION_API_KEY=' /opt/ck-agent/.env | cut -d= -f2-)
curl -sS -X DELETE "http://127.0.0.1:8081/instance/delete/conectaking" -H "apikey: ${KEY}" || true
echo
# create without auto qr then connect
curl -sS -o /tmp/c.json -w "c:%{http_code}\n" -X POST "http://127.0.0.1:8081/instance/create" \
  -H "apikey: ${KEY}" -H "Content-Type: application/json" \
  -d '{"instanceName":"conectaking","qrcode":false,"integration":"WHATSAPP-BAILEYS"}'
sleep 2
curl -sS -o /tmp/conn.json -w "conn:%{http_code}\n" "http://127.0.0.1:8081/instance/connect/conectaking" -H "apikey: ${KEY}"
head -c 500 /tmp/conn.json; echo
sleep 5
docker logs ck-agent-evolution --since 1m 2>&1 | tail -80
