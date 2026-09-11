#!/bin/bash
set -euo pipefail
docker exec conectaking-laravel sh -c 'composer show -i 2>/dev/null | grep -i sentry || echo "composer: no sentry"'
docker exec conectaking-laravel sh -c 'grep -i sentry bootstrap/cache/packages.php 2>/dev/null || echo no-packages-cache'
docker exec conectaking-laravel php artisan package:discover --ansi 2>&1 | tail -25
docker exec conectaking-laravel composer install --no-interaction --optimize-autoloader 2>&1 | tail -30
docker exec conectaking-laravel php artisan package:discover --ansi 2>&1 | grep -i sentry || echo discover-no-sentry
docker exec conectaking-laravel php artisan list 2>&1 | grep -i sentry || echo no-sentry-commands
docker exec conectaking-laravel php artisan sentry:test 2>&1 | tail -15 || true
