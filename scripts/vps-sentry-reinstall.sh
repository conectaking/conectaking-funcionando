#!/bin/bash
set -euo pipefail
echo "=== tree ==="
docker exec conectaking-laravel find vendor/sentry -maxdepth 4 -type f | head -40
echo "=== composer why ==="
docker exec conectaking-laravel composer show sentry/sentry-laravel 2>&1 | head -25
echo "=== reinstall ==="
docker exec conectaking-laravel composer reinstall sentry/sentry-laravel --no-interaction 2>&1 | tail -20
echo "=== after ==="
docker exec conectaking-laravel find vendor/sentry/sentry-laravel -name 'Integration.php' | head -5
docker exec conectaking-laravel php <<'PHP'
<?php
require '/app/vendor/autoload.php';
echo 'Integration: ' . (class_exists(\Sentry\Laravel\Integration::class) ? 'yes' : 'no') . PHP_EOL;
PHP
