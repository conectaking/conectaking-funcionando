#!/bin/bash
set -e
docker cp /opt/conectaking/public/dashboard.js conectaking-api:/app/public/dashboard.js
docker cp /opt/conectaking/public/dashboard.html conectaking-api:/app/public/dashboard.html
docker cp /opt/conectaking/public/js/dashboard-listeners.js conectaking-api:/app/public/js/dashboard-listeners.js
docker cp /opt/conectaking/public/js/dashboard-sortable.js conectaking-api:/app/public/js/dashboard-sortable.js
mkdir -p /opt/conectaking/laravel/public/shell
cp -f /tmp/dashboard.html /opt/conectaking/laravel/public/shell/dashboard.html || true
docker cp /tmp/dashboard.html conectaking-laravel:/app/public/shell/dashboard.html || true
echo '=== cache bust in html ==='
curl -sS http://127.0.0.1:5000/dashboard.html | grep -o 'dashboard[^"]*clicks1[^"]*' | head -5
echo '=== preventOnFilter ==='
docker exec conectaking-api grep -n 'preventOnFilter' /app/public/js/dashboard-sortable.js
echo '=== updateItemActiveStatus in listeners ==='
docker exec conectaking-api grep -n 'updateItemActiveStatus' /app/public/js/dashboard-listeners.js | head -8
echo '=== bound flag ==='
docker exec conectaking-api grep -n '__ckDashboardListenersBound' /app/public/js/dashboard-listeners.js | head -8
echo DONE
