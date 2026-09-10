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
- `./public` → `/legacy/public` (assets canónicos)
- volume `api_uploads` → `/shared/uploads`

## Scheduler

O entrypoint do container `laravel` já corre `php artisan schedule:run` a cada ~60s
(`laravel/docker-entrypoint.sh`). **Não** configure cron no host para o mesmo comando
(duplica jobs).

Serviços esperados: `db`, `redis`, `laravel`, `queue`.

## Checklist pós-deploy

```bash
curl -sS http://127.0.0.1:8080/health
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
docker exec conectaking-laravel php artisan migrate --force --no-interaction
```

Health saudável: `"status":"ok"`, `"queue":"redis"`, `"redis":true`.

Ver também `docs/FULL-PHP-MIGRATION.md`, `README.md` e `laravel/.env.example.conectaking`.
