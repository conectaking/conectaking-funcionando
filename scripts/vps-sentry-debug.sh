#!/bin/bash
set -euo pipefail
docker exec conectaking-laravel ls -la vendor/sentry/sentry-laravel/src/ | head -30
docker exec conectaking-laravel head -20 vendor/sentry/sentry-laravel/src/Integration.php
docker exec conectaking-laravel php <<'PHP'
<?php
require '/app/vendor/autoload.php';
echo 'Integration: ' . (class_exists(\Sentry\Laravel\Integration::class) ? 'yes' : 'no') . PHP_EOL;
echo 'ServiceProvider: ' . (class_exists(\Sentry\Laravel\ServiceProvider::class) ? 'yes' : 'no') . PHP_EOL;
$r = new ReflectionClass(\Composer\Autoload\ClassLoader::class);
echo 'ok composer' . PHP_EOL;
// list if file maps
$map = require '/app/vendor/composer/autoload_psr4.php';
foreach ($map as $ns => $paths) {
  if (stripos($ns, 'Sentry') !== false) {
    echo $ns . ' => ' . implode(',', $paths) . PHP_EOL;
  }
}
PHP
