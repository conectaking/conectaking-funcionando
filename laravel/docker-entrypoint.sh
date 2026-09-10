#!/bin/sh
set -eu

# Scheduler leve: um schedule:run por minuto (em vez de schedule:work --verbose 24/7).
(
  while true; do
    php /app/artisan schedule:run --no-ansi >> /proc/1/fd/1 2>> /proc/1/fd/2 || true
    sleep 60
  done
) &

exec frankenphp run --config /app/Caddyfile
