#!/bin/sh
set -eu

# Scheduler em background (substitui node-cron do Express).
php /app/artisan schedule:work --verbose >> /proc/1/fd/1 2>> /proc/1/fd/2 &

exec frankenphp run --config /app/Caddyfile
