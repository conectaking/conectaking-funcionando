#!/bin/bash
set -euo pipefail
echo "=== dsn ==="
docker exec conectaking-laravel printenv SENTRY_LARAVEL_DSN | sed 's#https://[^@]*@#https://***@#' || echo missing
echo "=== integration file ==="
docker exec conectaking-laravel test -f vendor/sentry/sentry-laravel/src/Sentry/Laravel/Integration.php && echo file:yes || echo file:no
echo "=== sentry:test ==="
docker exec conectaking-laravel php artisan sentry:test 2>&1 | tail -20
