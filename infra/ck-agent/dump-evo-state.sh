#!/bin/bash
set -euo pipefail
echo "=== PATH ==="
ls -la /opt/ck-agent/
echo "=== ENV ==="
cat /opt/ck-agent/.env
echo "=== PS ==="
cd /opt/ck-agent && docker compose --env-file .env ps
echo "=== PORTS ==="
ss -lntp | grep -E '5678|8081' || true
echo "=== CADDY ==="
grep -A10 -E 'n8n\.|evo\.' /etc/caddy/Caddyfile || true
echo "=== EVO ROOT ==="
curl -sS http://127.0.0.1:8081/ || true
echo
KEY=$(grep '^EVOLUTION_API_KEY=' /opt/ck-agent/.env | cut -d= -f2-)
echo "=== INSTANCES ==="
curl -sS http://127.0.0.1:8081/instance/fetchInstances -H "apikey: ${KEY}" || true
echo
echo "=== STATE ==="
curl -sS "http://127.0.0.1:8081/instance/connectionState/conectaking" -H "apikey: ${KEY}" || true
echo
echo "=== PROXY ==="
curl -sS "http://127.0.0.1:8081/proxy/find/conectaking" -H "apikey: ${KEY}" || true
echo
echo "=== EVO ENV ==="
docker inspect ck-agent-evolution --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'SERVER_URL|AUTH|DATABASE_|CACHE_|PROXY|CONFIG_|LOG_|DOCKER' || true
echo "=== VOLUMES ==="
docker volume ls | grep ck-agent || true
echo "=== NETWORK ==="
docker network inspect ck-agent-net --format '{{json .Containers}}' | head -c 2000; echo
echo "=== LOGS ==="
docker logs ck-agent-evolution --tail 50 2>&1 || true
echo "=== WA TEST ==="
docker exec ck-agent-evolution sh -c 'node -e "const https=require(\"https\");[\"web.whatsapp.com\",\"g.whatsapp.net\"].forEach(h=>{https.get({host:h,path:\"/\",timeout:5000},r=>console.log(h,r.statusCode)).on(\"error\",e=>console.log(h,\"ERR\",e.message))})"' || true
sleep 2
