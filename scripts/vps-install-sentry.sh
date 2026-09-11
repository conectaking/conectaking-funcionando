#!/bin/bash
# Instala Sentry no container em execução (persiste até rebuild; composer.lock no repo já tem o pacote)
set -euo pipefail
echo "Installing sentry/sentry-laravel in running container..."
docker exec conectaking-laravel composer require sentry/sentry-laravel:^4.27 --no-interaction --no-ansi 2>&1 | tail -40
docker exec conectaking-laravel php -r 'echo class_exists("Sentry\\Laravel\\Integration") ? "sentry:yes\n" : "sentry:no\n";'
if grep -q '^SENTRY_LARAVEL_DSN=' /opt/conectaking/.env.prod; then
  VAL=$(grep -E '^SENTRY_LARAVEL_DSN=' /opt/conectaking/.env.prod | tail -1 | cut -d= -f2- | tr -d '\r')
  if [[ -z "$VAL" ]]; then
    echo "SENTRY_LARAVEL_DSN vazio — pacote instalado mas sem DSN (não reporta ainda)"
  else
    echo "SENTRY_LARAVEL_DSN definido (mascarado)"
  fi
else
  echo "SENTRY_LARAVEL_DSN=" >> /opt/conectaking/.env.prod
  echo "SENTRY_LARAVEL_DSN chave adicionada vazia — cole o DSN do Sentry quando tiver"
fi
