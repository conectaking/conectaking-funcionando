#!/bin/bash
set -e
echo '--- host blade ---'
grep -n 'nome_cliente' /opt/conectaking/laravel/resources/views/cartao/ks-config-finalizacao.blade.php | head -5
echo '--- container blade ---'
docker exec conectaking-laravel grep -n 'nome_cliente' /app/resources/views/cartao/ks-config-finalizacao.blade.php | head -5
PASS=${CK_SMOKE_PASS:-playadryan22}
TOKEN=$(curl -sS -X POST http://127.0.0.1:5000/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"conectaking@gmail.com\",\"password\":\"$PASS\"}" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
CODE=$(curl -sS -o /tmp/cfg2.html -w '%{http_code}' "http://127.0.0.1:5000/api/king-selection/config-finalizacao/1?token=$TOKEN")
echo "http=$CODE len=$(wc -c </tmp/cfg2.html)"
head -c 250 /tmp/cfg2.html; echo
docker logs conectaking-laravel --tail 8 2>&1 | tail -8
