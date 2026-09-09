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
| `migrations/*.sql` | Histórico do schema Postgres |
| `public/*.js\|css` | Front do painel (JS no browser — normal) |
| `public/admin/*.js\|css` | Assets do painel ADM (página em Blade) |
| `cf-worker-kingselection-r2` | Worker Cloudflare R2 (edge, não monólito Node) |
| `data/bible` | JSON bíblia |
| `public_html/` | Espelho de assets no VPS (`LEGACY_PUBLIC_HTML_PATH`); assets críticos também espelhados em `public/` |

Deploy limpo (sem `docker cp`): `scripts/deploy-vps-rebuild.sh` + tarball `laravel/` + `public/` + `public_html/` + `docker-compose.prod.yml`.

Limpeza pós-migração (feita): scripts `tmp-*`/`patch-admin-*`, pasta `Checkout/` vazia, Blade órfã `kingSelection.blade.php`, stubs PHP Hostinger KS, `.git` aninhado em `public_html`, env `MERCADOPAGO_*` no compose, UI PagBank no editor de forms.

Não há container `api` Express. Não reintroduzir checkout/gateway sem pedido explícito.
