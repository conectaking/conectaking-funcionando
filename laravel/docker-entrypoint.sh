#!/bin/sh
set -eu

# Scheduler vive no serviço Docker `scheduler` (compose prod).
# Este entrypoint só sobe o FrankenPHP.
exec frankenphp run --config /app/Caddyfile
