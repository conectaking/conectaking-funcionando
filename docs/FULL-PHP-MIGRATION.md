# Migração FULL PHP — estado final

**Produção e local: só Laravel (FrankenPHP) + PostgreSQL. Zero Node. Sem checkout/gateway.**

## Stack

- Edge app: FrankenPHP classic (`:8080`), TLS no Caddy do host
- Páginas: `laravel/resources/views/pages/*.blade.php` (inclui ADM e King Selection cliente)
- Assets: `public/` (JS/CSS/imagens) montados em `/legacy/public`
- Crons: `schedule:work` no entrypoint + comandos `maintenance:*`
- Checkout / PagBank / Mercado Pago: **fora de escopo** (HTTP 410)

## Removido

- Monólito Express (`server.js`, `routes/`, `modules/`, EJS, Dockerfile Node, `package.json`)
- HTML duplicado das páginas já em Blade
- `public_html/backend` (Express morto)
- SPA HTML `ks-spa/kingSelectionCliente.html` (Blade canónico)
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
| `cf-worker-kingselection-r2` | Worker Cloudflare R2 (edge, não monólito Node) |
| `data/bible` | JSON bíblia |
| `migrations/*.sql` | Histórico do schema Postgres |

Deploy limpo: `scripts/deploy-vps-rebuild.sh` + tarball `laravel/` + `public/` + `docker-compose.prod.yml`.

Residuais antigos removidos: pasta `public_html/`, rotas `/l/*`, mount Docker legado, guards/comentários Hostinger/Render/:5000, shell dashboard duplicado.

Ainda intencional (não é Node): front JS do painel em `public/` + `FrontLegacyController` (serve assets); auth JWT do painel; Worker R2.

Não reintroduzir checkout/gateway sem pedido explícito.
