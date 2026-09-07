#!/bin/sh
curl -sS 'http://127.0.0.1:5000/admin/index.html' | grep -o 'Visão Geral' | head -2
curl -sS 'http://127.0.0.1:5000/admin/admin.js?v=2026-09-07-fix2' | sed -n '1784p'
curl -sS 'http://127.0.0.1:5000/admin/index.html' | grep -oE 'admin\.(css|js)\?v=[^"]+' | head -4
docker exec conectaking-api node --check public_html/admin/admin.js && echo SYNTAX_OK
