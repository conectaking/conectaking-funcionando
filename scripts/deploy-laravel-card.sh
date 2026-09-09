#!/bin/bash
# Deploy Laravel no VPS (tarball com topo laravel/).
set -euo pipefail
cd /opt/conectaking
tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
chmod +x laravel/docker-entrypoint.sh 2>/dev/null || true
sed -i 's/\r$//' laravel/docker-entrypoint.sh 2>/dev/null || true
docker compose -f docker-compose.prod.yml --env-file .env.prod build laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --remove-orphans
sleep 14
curl -sS http://127.0.0.1:8080/health; echo
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
echo DEPLOY_LARAVEL_OK
