# Runbook operacional — Conecta King

Guia curto: deploy, rollback e incidente. Detalhes em `HETZNER-DEPLOY.md`, `SECRETS-RUNBOOK.md`, `EDGE-SECURITY.md`.

## Stack (prod)

- VPS: `46.225.100.64` · app em `/opt/conectaking`
- Compose: `docker-compose.prod.yml` + `.env.prod`
- Serviços: `db`, `redis`, `laravel`, `queue`, `queue-faces`, `scheduler`
- Sem Node/`api` — full Laravel/FrankenPHP
- **Agente IA (separado):** `/opt/ck-agent` · ver `docs/CK-AGENT.md` (`n8n` + Evolution; não misturar com este compose)

## Deploy (rebuild limpo)

No PC (PowerShell), a partir do repo:

1. Empacotar `laravel/` + `public/` + `docker-compose.prod.yml` → `/tmp/ck-rebuild.tgz` na VPS  
2. Subir `scripts/deploy-vps-rebuild.sh`  
3. Na VPS: `bash /tmp/deploy-vps-rebuild.sh`

O script rebuilda `laravel`, `queue`, `scheduler`, `queue-faces`, migrate e faz smoke.

Smoke mínimo:

```bash
curl -sS http://127.0.0.1:8080/health
docker ps --filter name=conectaking
docker exec conectaking-laravel php artisan queue:failed
```

## Rollback rápido

1. Restaurar tarball anterior (se guardado) em `/tmp/ck-rebuild.tgz` e reexecutar o script, **ou**  
2. `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d` com imagem/tag anterior se existir  
3. Confirmar `/health` = `ok`

Nunca force-push nem apague volumes `pgdata` / `api_uploads` sem backup.

## Incidente — checklist

| Sintoma | Ação |
|--------|------|
| Site fora | `docker ps`; `curl 127.0.0.1:8080/health`; logs `conectaking-laravel` |
| Fila parada | `docker ps` queue; `php artisan queue:failed`; `queue:retry all` |
| Admin 403 IP | `ADMIN_IP_ALLOWLIST` no `.env.prod` (vazio = aberto) |
| Erros reais | Sentry projeto CONECTAKING · ignorar issues `Sentry smoke` (teste) |
| Uptime | Cron `maintenance:uptime-selfcheck` a cada 5 min → OpsAlert/Sentry |
| Agente WA / n8n | `cd /opt/ck-agent && docker compose ps`; docs `CK-AGENT.md` |

## Financeiro (standby)

- Flag: `FINANCE_MODULE_STANDBY=true` (default)  
- Efeito: menu oculto + `/zerar-mes` → `/dashboard`  
- Religar: `FINANCE_MODULE_STANDBY=false` no `.env.prod`, recreate `laravel`, Ctrl+F5 no painel  

## Backup

- Cron host: `scripts/backup-postgres-vps.sh`  
- Testar restore periodicamente (não só o dump)  
- Off-box: `CK_BACKUP_OFFBOX_CMD` se configurado  

## Legado

Repo raiz **sem** `server.js` / `public_html` / `modules` Node. Assets canónicos em `laravel/` + `public/` (Vite/legacy).
