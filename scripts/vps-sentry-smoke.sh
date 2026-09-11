#!/bin/bash
set -euo pipefail
docker exec conectaking-laravel php -r 'require "/app/vendor/autoload.php"; echo class_exists("Sentry\\Laravel\\Integration") ? "class:yes\n" : "class:no\n"; echo file_exists("/app/config/sentry.php") ? "config:yes\n" : "config:no\n";'
docker exec conectaking-laravel php artisan tinker --execute='
echo "dsn_env=".(env("SENTRY_LARAVEL_DSN") ? "set" : "empty")."\n";
echo "class=".(class_exists("Sentry\\Laravel\\Integration") ? "yes" : "no")."\n";
try {
  throw new Exception("ConectaKing Sentry smoke test ".date("c"));
} catch (Throwable $e) {
  if (class_exists("Sentry\\Laravel\\Integration")) {
    \Sentry\Laravel\Integration::captureUnhandledException($e);
    echo "capture:sent\n";
  } else {
    echo "capture:skip\n";
  }
}
'
