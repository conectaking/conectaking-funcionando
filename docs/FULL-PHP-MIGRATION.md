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
| `public/` JS/CSS fonte | Canónico para alias `@legacy` no Vite (build empacota) |
| `FrontLegacyController` | Serve imagens/static de `public/` + `api-config.js` / health |
| Auth JWT custom | Contrato do painel (não Sanctum) |
| Guards `onrender` / `:5000` | Defesa contra API antiga em cache/localStorage |
| `cf-worker-kingselection-r2` | Worker Cloudflare R2 (edge) |
| `data/bible`, `migrations/*.sql` | Dados / histórico schema |
| Font Awesome e CDNs (Chart, Cropper…) | Externos de propósito |
| `recibos-modulo-nav.js` | Clássico (`data-active` via `document.currentScript`); hrefs limpos `/…` |
| `admin-prosperidade-31` | Redirect para `#prosperidade` |
| CSS perfil público (`css/profile.css` etc.) | Cartão/satélite, não painel Blade |
| Aliases `/*.html` em `web.php` | Compat bookmarks antigos; JS novo usa rotas limpas |

### Vite (páginas — concluído)

- Build no Docker (context raiz) → `laravel/public/build`
- **JS** de todas as Blades de produto (auth → painel → KS → forms → admin → recibos → docs → kingDocs…)
- **CSS** legado empacotado via `import '@legacy/*.css'` nas entries (style, auth, dashboard, admin, salesPageEdit, ui, recibos-mobile, profile-wifi)
- Font Awesome / CDNs / `recibos-modulo-nav.js` continuam clássicos
- `admin-prosperidade-31` = redirect (sem entry)
- Corrigido `admin.css` (bloco órfão / `}` extra em `.stats-grid`)

Deploy limpo: `scripts/deploy-vps-rebuild.sh` + tarball `laravel/` + `public/` + `docker-compose.prod.yml`.

Não reintroduzir checkout/gateway sem pedido explícito.
