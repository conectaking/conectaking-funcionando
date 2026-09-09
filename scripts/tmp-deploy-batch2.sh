#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
tar xzf /tmp/ck-middleware.tgz -C .
cp /tmp/docker-compose.prod.yml ./docker-compose.prod.yml
# safety: API Dockerfile must stay Node (not PHP spilled into root)
if ! grep -q 'FROM node' Dockerfile; then
  echo 'FATAL: root Dockerfile is not Node — abort' >&2
  head -5 Dockerfile >&2
  exit 1
fi
test -f laravel/artisan
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod build api
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
sleep 22
bash /tmp/tmp-smoke-batch2.sh
