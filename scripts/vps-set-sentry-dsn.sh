#!/bin/bash
set -euo pipefail
DSNFILE=/tmp/ck-sentry-dsn.txt
test -f "$DSNFILE"

python3 <<'PY'
from pathlib import Path
dsn = Path('/tmp/ck-sentry-dsn.txt').read_text().replace('\r', '').replace('\n', '').strip()
assert dsn.startswith('https://'), 'bad dsn'
p = Path('/opt/conectaking/.env.prod')
lines = p.read_text().splitlines()
out, found = [], False
for line in lines:
    if line.startswith('SENTRY_LARAVEL_DSN='):
        out.append('SENTRY_LARAVEL_DSN=' + dsn)
        found = True
    else:
        out.append(line)
if not found:
    out.append('SENTRY_LARAVEL_DSN=' + dsn)
if not any(l.startswith('SENTRY_TRACES_SAMPLE_RATE=') for l in out):
    out.append('SENTRY_TRACES_SAMPLE_RATE=0.1')
p.write_text('\n'.join(out) + '\n')
print('SENTRY_LARAVEL_DSN updated')
PY
rm -f "$DSNFILE"

cd /opt/conectaking
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps laravel queue queue-faces scheduler

sleep 10
echo "=== env in container (masked) ==="
docker exec conectaking-laravel printenv SENTRY_LARAVEL_DSN | sed 's#https://[^@]*@#https://***@#'
echo "=== sentry class ==="
docker exec conectaking-laravel php -r 'require "/app/vendor/autoload.php"; echo class_exists("Sentry\\Laravel\\Integration") ? "sentry:yes\n" : "sentry:no\n";'
echo "=== sentry:test ==="
docker exec conectaking-laravel php artisan sentry:test 2>&1 | tail -40 || echo "sentry:test unavailable (ok if package config minimal)"
echo DONE
