#!/bin/bash
set -e
cd /opt/conectaking
cp -f /tmp/dashboard.js public/dashboard.js
cp -f /tmp/dashboard-cartao.js public/js/dashboard-cartao.js
cp -f /tmp/dashboard-listeners.js public/js/dashboard-listeners.js
cp -f /tmp/dashboard-edit-modal.js public/js/dashboard-edit-modal.js
cp -f /tmp/dashboard.html public/dashboard.html
mkdir -p laravel/public/shell
cp -f /tmp/dashboard.html laravel/public/shell/dashboard.html
docker cp /tmp/dashboard.js conectaking-api:/app/public/dashboard.js
docker cp /tmp/dashboard-cartao.js conectaking-api:/app/public/js/dashboard-cartao.js
docker cp /tmp/dashboard-listeners.js conectaking-api:/app/public/js/dashboard-listeners.js
docker cp /tmp/dashboard-edit-modal.js conectaking-api:/app/public/js/dashboard-edit-modal.js
docker cp /tmp/dashboard.html conectaking-api:/app/public/dashboard.html
docker cp /tmp/dashboard.html conectaking-laravel:/app/public/shell/dashboard.html || true
echo '=== verify globals in container ==='
docker exec conectaking-api grep -n 'window.kingSelectionAdminUrl' /app/public/dashboard.js | head -3
docker exec conectaking-api grep -n 'ITEM_TYPE_LABELS_FOR_VCARD' /app/public/js/dashboard-cartao.js | tail -5
curl -sS http://127.0.0.1:5000/js/dashboard-cartao.js?v=2026-09-08-globals1 | grep -c 'ITEM_TYPE_LABELS_FOR_VCARD'
curl -sS http://127.0.0.1:5000/dashboard.js?v=2026-09-08-globals1 | grep -c 'window.kingSelectionAdminUrl'
echo DONE
