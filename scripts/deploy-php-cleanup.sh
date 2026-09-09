#!/bin/bash
set -e
BASE=/opt/conectaking
# pull latest from git if repo exists
cd "$BASE"
if [ -d .git ]; then
  git fetch origin main || true
  git checkout main || true
  git pull origin main || true
fi

# Host copies from /tmp if provided
if [ -d /tmp/ck-php ]; then
  cp -f /tmp/ck-php/web.php "$BASE/laravel/routes/web.php"
  cp -f /tmp/ck-php/app.php "$BASE/laravel/bootstrap/app.php"
  cp -f /tmp/ck-php/KingSelectionPublicController.php "$BASE/laravel/app/Http/Controllers/CartaoVirtual/"
  cp -f /tmp/ck-php/kingSelectionCliente.blade.php "$BASE/laravel/resources/views/pages/"
  cp -f /tmp/ck-php/admin.blade.php "$BASE/laravel/resources/views/pages/"
  cp -f /tmp/ck-php/formPageEdit.js "$BASE/public/formPageEdit.js"
  cp -f /tmp/ck-php/formPageEdit.js "$BASE/public_html/formPageEdit.js" 2>/dev/null || true
fi

# Remove Node backend residual
rm -rf "$BASE/public_html/backend"

# Into container
docker cp "$BASE/laravel/routes/web.php" conectaking-laravel:/app/routes/web.php
docker cp "$BASE/laravel/bootstrap/app.php" conectaking-laravel:/app/bootstrap/app.php
docker cp "$BASE/laravel/app/Http/Controllers/CartaoVirtual/KingSelectionPublicController.php" conectaking-laravel:/app/app/Http/Controllers/CartaoVirtual/KingSelectionPublicController.php
docker cp "$BASE/laravel/resources/views/pages/kingSelectionCliente.blade.php" conectaking-laravel:/app/resources/views/pages/kingSelectionCliente.blade.php
docker cp "$BASE/laravel/resources/views/pages/admin.blade.php" conectaking-laravel:/app/resources/views/pages/admin.blade.php
docker cp "$BASE/public/formPageEdit.js" conectaking-laravel:/app/public/formPageEdit.js
docker exec conectaking-laravel rm -rf /app/app/Http/Controllers/Payment /app/app/Services/Payment /app/public/ks-spa || true
docker exec conectaking-laravel php artisan optimize:clear

echo '---SMOKE---'
curl -sS -o /dev/null -w 'admin:%{http_code}\n' http://127.0.0.1:8080/admin/
curl -sS -o /dev/null -w 'admin2:%{http_code}\n' http://127.0.0.1:8080/admin
curl -sS -o /dev/null -w 'checkout:%{http_code}\n' http://127.0.0.1:8080/checkoutConfig
curl -sS -o /dev/null -w 'mp:%{http_code}\n' -X POST http://127.0.0.1:8080/api/payment/create-preference
curl -sS -o /dev/null -w 'health:%{http_code}\n' http://127.0.0.1:8080/health
test ! -d "$BASE/public_html/backend" && echo 'backend_gone=yes'
docker exec conectaking-laravel test ! -f /app/app/Services/Payment/MercadoPagoService.php && echo 'mp_gone=yes'
echo DONE
