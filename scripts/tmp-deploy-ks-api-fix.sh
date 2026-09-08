#!/bin/bash
set -e
cd /opt/conectaking
# static + server from tarball
tar xzf /tmp/ck-ks-api-fix.tgz
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 12
bash /tmp/tmp-smoke-ks-api-base.sh
# also verify config served without onrender
echo '=== config.js served ==='
curl -sS 'http://127.0.0.1:5000/config.js?v=2026-09-08-no-render' | grep -n onrender || echo 'no onrender in config (ok)'
curl -sS 'http://127.0.0.1:5000/kingSelection' | grep -oE 'config\.js[^"]+|kingSelectionEdit\.js[^"]+' | head -5
echo DONE_KS_API_FIX
