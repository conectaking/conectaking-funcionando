# Deploy Hetzner (full PHP)

## Serviços

- `db` — Postgres 16  
- `laravel` — FrankenPHP `:8080`  
- Caddy no host — TLS + `reverse_proxy 127.0.0.1:8080`

Não existe serviço Node/`api`.

## Comandos

```bash
cd /opt/conectaking
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
curl -sS http://127.0.0.1:8080/health
```

## Volumes

- `./public` → `/legacy/public` (JS/CSS)  
- `./public_html` → `/legacy/public_html` (espelho assets)  
- volume `api_uploads` → `/shared/uploads`

## Scheduler

O entrypoint corre `php artisan schedule:work`. Backup no host:

```cron
* * * * * docker exec conectaking-laravel php artisan schedule:run >> /var/log/conectaking-schedule.log 2>&1
```

Ver também `docs/FULL-PHP-MIGRATION.md` e `README.md`.
