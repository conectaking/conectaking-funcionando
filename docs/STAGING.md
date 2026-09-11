# Staging

## Objetivo

Ambiente isolado (`staging.conectaking.com.br`) com DB e R2 **não** de produção.

## Setup mínimo

1. DNS A/AAAA → VPS (ou segundo VPS)
2. Copiar `.env.prod` → `.env.staging` e alterar:
   - `APP_ENV=staging`
   - `APP_URL=https://staging.conectaking.com.br`
   - `APP_DEBUG=false`
   - DB name distinto
   - `KINGSELECTION_WORKER_SECRET` / bucket R2 de staging
3. `docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build`
4. Caddy host com site `staging.conectaking.com.br`

## Regras

- Nunca apontar Worker R2 de prod
- Seed mínimo; sem dados reais de clientes
- Robots: `Disallow: /` em staging (opcional)
