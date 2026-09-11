# Runbook de secrets — Conecta King

## Secrets críticos (produção)

| Variável | Onde | Notas |
|---|---|---|
| `LARAVEL_APP_KEY` | `.env.prod` / compose | Rotação invalida cookies/sessões encriptadas |
| `JWT_SECRET` | `.env.prod` | Rotação desloga todos (JWT) |
| `POSTGRES_PASSWORD` | `.env.prod` | Atualizar compose + restart `db`/`laravel`/`queue*` |
| `REDIS_PASSWORD` | opcional | Se definido, alinhar todos os serviços |
| `KINGSELECTION_WORKER_SECRET` / `KS_WORKER_SECRET` | Laravel + Cloudflare Worker | Mesmo valor nos dois lados |
| `SENTRY_LARAVEL_DSN` | opcional | APM |
| `ADMIN_IP_ALLOWLIST` | opcional | CSV IPs/CIDR admin |
| `CK_BACKUP_OFFBOX_CMD` | host | Comando off-box do backup |
| `SMTP_*` | e-mail | Ver `docs/EMAIL-DNS-CHECKLIST.md` |

## TTLs JWT

```
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=30d
```

O `expires_at` na tabela `refresh_tokens` segue `JWT_REFRESH_EXPIRES_IN`.

## Rotação JWT (zero-downtime aproximado)

1. Gerar novo `JWT_SECRET` (32+ bytes aleatórios).
2. Deploy com secret novo → utilizadores re-login.
3. Opcional: manter janela curta de dual-verify (não implementado).

## Local

Nunca reutilizar secrets de prod. Gerar com:

```powershell
# scripts/gen-local-secrets.ps1
```

Defaults fracos em `docker-compose.yml` são **somente** para máquina de desenvolvimento isolada.
