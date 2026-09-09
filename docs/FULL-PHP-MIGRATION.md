# Migração FULL PHP — estado final

**Produção e local: só Laravel (FrankenPHP) + PostgreSQL. Zero Node.**

## Stack

- Edge app: FrankenPHP classic (`:8080`), TLS no Caddy do host
- Páginas: `laravel/resources/views/pages/*.blade.php`
- Assets: `public/` (JS/CSS/imagens) montados em `/legacy/public`
- Crons: `schedule:work` no entrypoint + comandos `maintenance:*`
- Checkout/PagBank: fora de escopo (HTTP 410)

## O que foi removido do repo

- `server.js`, `routes/`, `modules/`, `middleware/`, `utils/`, `views/` (EJS), `Dockerfile` Node
- `package.json` / `node_modules`
- HTML duplicado das páginas já convertidas para Blade
- Scripts e docs de Render/Express/tmp de migração

## Arranque

Local: `docker compose --env-file .env.docker up --build` → http://localhost:8080  

Prod: `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`

Health: `/health` → `{"status":"ok","engine":"laravel",...}`

## Residual intencional

| Item | Porquê |
|---|---|
| `migrations/*.sql` | Histórico do schema Postgres |
| `public/*.js|css` | Front do painel (ainda JS no browser — normal) |
| `cf-worker-kingselection-r2` | Worker Cloudflare (não é o monólito Node) |
| `data/bible` | JSON bíblia |

Não há container `api` Express. Não reintroduzir sem pedido explícito.
