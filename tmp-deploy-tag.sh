#!/bin/bash
set -e
TMP=/tmp/ck-tag
cp -f "$TMP/CartaoPublicService.php" /opt/conectaking/laravel/app/Services/CartaoVirtual/
cp -f "$TMP/AdminUsersService.php" /opt/conectaking/laravel/app/Services/Admin/
cp -f "$TMP/AdminOverviewService.php" /opt/conectaking/laravel/app/Services/Admin/
cp -f "$TMP/public.blade.php" /opt/conectaking/laravel/resources/views/cartao/
cp -f "$TMP/index.html" "$TMP/admin.js" /opt/conectaking/public/admin/
cp -f "$TMP/index.html" "$TMP/admin.js" /opt/conectaking/public_html/admin/
docker cp "$TMP/CartaoPublicService.php" conectaking-laravel:/app/app/Services/CartaoVirtual/CartaoPublicService.php
docker cp "$TMP/AdminUsersService.php" conectaking-laravel:/app/app/Services/Admin/AdminUsersService.php
docker cp "$TMP/AdminOverviewService.php" conectaking-laravel:/app/app/Services/Admin/AdminOverviewService.php
docker cp "$TMP/public.blade.php" conectaking-laravel:/app/resources/views/cartao/public.blade.php
docker exec conectaking-laravel mkdir -p /app/public/admin
docker cp "$TMP/index.html" conectaking-laravel:/app/public/admin/index.html
docker cp "$TMP/admin.js" conectaking-laravel:/app/public/admin/admin.js
docker cp "$TMP/tmp-restore-slug.sql" conectaking-db:/tmp/restore-slug.sql
docker exec conectaking-db psql -U conectaking -d conectaking -f /tmp/restore-slug.sql
docker exec conectaking-laravel php artisan optimize:clear
echo '---SMOKE---'
curl -sS -o /dev/null -w 'tag:%{http_code} -> %{redirect_url}\n' http://127.0.0.1:8080/ADRIANO-KING
curl -sS -o /dev/null -w 'slug:%{http_code}\n' http://127.0.0.1:8080/adrianokingg
curl -sS http://127.0.0.1:8080/adrianokingg | grep -oE 'href="https://www.instagram.com/[^"]+"' | head -5
echo DONE
