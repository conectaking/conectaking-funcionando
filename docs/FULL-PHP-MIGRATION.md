# Migração FULL PHP — estado final

**Produção e local: só Laravel (FrankenPHP) + PostgreSQL. Zero Node. Sem checkout/gateway.**

## Stack

- Edge app: FrankenPHP classic (`:8080`), TLS no Caddy do host
- Páginas: `laravel/resources/views/pages/*.blade.php` (ADM, dashboard, KS, forms, docs, etc.)
- Assets: `public/` (JS/CSS/imagens) montados em `/legacy/public`
- Crons: `schedule:work` no entrypoint + comandos `maintenance:*`
- Checkout / PagBank / Mercado Pago: **fora de escopo** (HTTP 410)

## Removido

- Monólito Express (`server.js`, `routes/`, `modules/`, EJS, Dockerfile Node, `package.json` raiz)
- HTML duplicado das páginas já em Blade (`public/*.html` = 0)
- Pasta `public_html/` e mount Docker legado
- Rotas duplicadas `/l/api/...` (fica só redirect 301 `/l/{path}` → `/{path}`)
- Controllers/services de Payment/MercadoPago
- Docs Render / Hostinger / listas de separação Node

## Arranque

Local: `docker compose --env-file .env.docker up --build` → http://localhost:8080  

Prod: `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build`

Health: `/health` → `{"status":"ok","engine":"laravel",...}`

## Residual intencional

| Item | Porquê |
|---|---|
| `public/` | **Canónico** — JS/CSS/imagens do painel (montado em `/legacy/public`) |
| `FrontLegacyController` | Serve assets de `public/` + `api-config.js` / health |
| Auth JWT custom | Contrato do painel (não Sanctum) |
| Guards `onrender` / `:5000` em `config.js` / `dashboard.js` | Defesa contra API antiga em cache/localStorage |
| `cf-worker-kingselection-r2` | Worker Cloudflare R2 (edge, não monólito Node) |
| `data/bible` | JSON bíblia |
| `migrations/*.sql` | Histórico do schema Postgres |

Deploy limpo: `scripts/deploy-vps-rebuild.sh` + tarball `laravel/` + `public/` + `docker-compose.prod.yml`.

### Próximo salto (opcional, grande)

Mover o front de `public/` para Vite + `laravel/public` / componentes Blade — não é limpeza residual; é refactor de frontend.

Não reintroduzir checkout/gateway sem pedido explícito.
