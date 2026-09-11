#!/bin/bash
set -euo pipefail
cd /opt/conectaking
echo "=== composer require in container ==="
docker exec conectaking-laravel composer require sentry/sentry-laravel:^4.27 --no-interaction --update-with-dependencies 2>&1 | tail -50
echo "=== verify files ==="
docker exec conectaking-laravel find vendor/sentry/sentry-laravel -name 'Integration.php' | head -5
docker exec conectaking-laravel php <<'PHP'
<?php
require '/app/vendor/autoload.php';
echo 'Integration: ' . (class_exists(\Sentry\Laravel\Integration::class) ? 'yes' : 'no') . PHP_EOL;
PHP

# publish config into image filesystem
docker exec conectaking-laravel php artisan vendor:publish --provider="Sentry\Laravel\ServiceProvider" --tag=config --force 2>&1 | tail -10 || true
docker exec conectaking-laravel test -f config/sentry.php && echo config:yes || echo config:no

# pull composer files back to host so next rebuild keeps package
docker cp conectaking-laravel:/app/composer.json /opt/conectaking/laravel/composer.json
docker cp conectaking-laravel:/app/composer.lock /opt/conectaking/laravel/composer.lock
docker cp conectaking-laravel:/app/config/sentry.php /opt/conectaking/laravel/config/sentry.php 2>/dev/null || true

# smoke capture via artisan report
docker exec conectaking-laravel php artisan tinker --execute='
app()->make(\Illuminate\Contracts\Debug\ExceptionHandler::class)->report(new Exception("ConectaKing Sentry smoke ".date("c")));
echo "reported\n";
' 2>&1 | tail -20

# also try sentry:test
docker exec conectaking-laravel php artisan sentry:test 2>&1 | tail -25 || true
echo DONE
