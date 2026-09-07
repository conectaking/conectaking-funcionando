#!/bin/sh
set -e
docker exec conectaking-api sh -c 'grep -c activateAdminPane public_html/admin/admin.js'
docker exec conectaking-api sh -c 'grep -c "R2 devolve url" public/dashboard.js'
docker exec conectaking-api sh -c 'grep -c Configurações public/kingSelectionProject.html'
docker exec conectaking-api sh -c 'grep -c "Pedidos de edição" public/kingSelectionProject.js'
docker exec conectaking-api sh -c 'grep -c id=\"aplicativo\" public_html/index.html || true'
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:5000/admin/
curl -sS http://127.0.0.1:5000/kingSelectionProject.html | grep -o 'Configurações' | head -3
echo OK
