# Observabilidade

## Sentry (opcional)

1. Criar projeto em sentry.io
2. `composer require sentry/sentry-laravel` (no `laravel/`)
3. Definir em `.env.prod`:
   ```
   SENTRY_LARAVEL_DSN=https://...@....ingest.sentry.io/...
   SENTRY_TRACES_SAMPLE_RATE=0.1
   ```
4. Redeploy `laravel`, `queue`, `queue-faces`, `scheduler`

O `bootstrap/app.php` reporta exceções se o DSN estiver definido **e** o pacote instalado.

## Logs

Produção: `LOG_CHANNEL=stderr` → `docker logs conectaking-laravel`.
