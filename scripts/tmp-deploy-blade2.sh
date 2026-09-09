#!/bin/bash
set -e
cd /opt/conectaking
rm -rf laravel && tar xzf /tmp/ck-laravel.tgz
rm -f laravel/.env
cp /tmp/docker-compose.prod.yml ./docker-compose.prod.yml
echo "blade_count=$(ls laravel/resources/views/pages/*.blade.php | wc -l)"
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate --no-deps laravel
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --remove-orphans
sleep 14
curl -sS http://127.0.0.1:8080/health; echo
for p in /login /dashboard /kingSelection /kingDocs /formPageEdit /admin-planos /documentos-ver /checkoutConfig /kingSelectionProject /guestListEdit; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' "http://127.0.0.1:8080$p")
  echo "$code $p"
done
curl -sS https://www.conectaking.com.br/health; echo
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
echo BLADE2_OK
