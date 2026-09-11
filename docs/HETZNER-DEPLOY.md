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

## Fila / failed_jobs

Health: `curl -sS http://127.0.0.1:8080/health` → campo `failed_jobs`.

```bash
docker exec conectaking-laravel php artisan queue:failed
docker exec conectaking-laravel php artisan queue:retry all
# ou limpar após análise:
docker exec conectaking-laravel php artisan queue:flush
docker exec conectaking-laravel php artisan maintenance:failed-jobs-alert
```

Alerta horário via scheduler (`maintenance:failed-jobs-alert` → log `queue.failed_jobs`).

## Backup Postgres


Script: `scripts/backup-postgres-vps.sh` (retenção 7 dias em `/opt/conectaking/backups`).

```bash
chmod +x /opt/conectaking/scripts/backup-postgres-vps.sh
# Cron diário 03:15 UTC
(crontab -l 2>/dev/null | grep -v backup-postgres-vps; echo '15 3 * * * /opt/conectaking/scripts/backup-postgres-vps.sh >> /var/log/conectaking-backup.log 2>&1') | crontab -
```

Teste manual: `bash /opt/conectaking/scripts/backup-postgres-vps.sh`

## Scheduler

O entrypoint do container `laravel` já corre `php artisan schedule:run` a cada ~60s
(`laravel/docker-entrypoint.sh`). **Não** configure cron no host para o mesmo comando
(duplica jobs).

Serviços esperados: `db`, `redis`, `laravel`, `queue`, `queue-faces`, `scheduler`.

## Checklist pós-deploy

```bash
curl -sS http://127.0.0.1:8080/health
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
docker exec conectaking-laravel php artisan migrate --force --no-interaction
```

Health saudável: `"status":"ok"`.  
Queue saudável: healthcheck por processo `queue:work` (não porta 2019).
Worker faces: fila `ks-faces`. Scheduler dedicado (não no entrypoint do laravel).
Off-box: `CK_BACKUP_OFFBOX_CMD` — ver `scripts/backup-postgres-vps.sh`. Docs: `EDGE-SECURITY.md`, `SECRETS-RUNBOOK.md`.

Ver também `docs/OPS-RUNBOOK.md` (deploy/rollback/incidente), `docs/FULL-PHP-MIGRATION.md`, `README.md` e `laravel/.env.example.conectaking`.
