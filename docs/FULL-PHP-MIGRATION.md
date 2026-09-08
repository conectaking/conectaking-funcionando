# Migração FULL PHP — sem Node

Objetivo: **Caddy → Laravel**, zero container `api` (Express). Front em Blade (ou HTML servido pelo Laravel até virar Blade). APIs 100% PHP.

## Resposta direta: o Node pode sair?

**Sim.** Hoje ele só existe porque o Caddy faz `reverse_proxy 127.0.0.1:5000`.  
Quando Laravel servir estáticos + todas as APIs + `/health`, o Caddy aponta para `:8080` e o serviço `api` desliga.

## Já em Laravel (não migrar de novo)

- Cartão virtual (Blade + APIs)
- Profile / upload / satélites (form, guest-list, bíblia, loja)
- King Selection (quase tudo) + facial panel
- Finance + Serasa
- Auth login/refresh/logout + dashboard boot (modules/analytics/branding)
- Admin bíblia (prosperidade / Dev365)

## Lista COMPLETA do que ainda depende do Node

### A) Infra (obrigatório para matar o Node)

| # | Item | Ação |
|---|---|---|
| A1 | Caddy aponta para `:5000` | Mudar para `:8080` (Laravel) |
| A2 | `artisan serve` frágil como edge | Preferir FrankenPHP ou nginx+php-fpm |
| A3 | Estáticos `public/` + `public_html/` | Montar/servir via `laravel/public` |
| A4 | Rotas HTML Express (`/login`, `/dashboard`, `/kingSelection*`, …) | Rotas Laravel (arquivo ou Blade) |
| A5 | `GET /health` | Endpoint Laravel (LB/Caddy) |
| A6 | `NODE_INTERNAL_URL` no Laravel | Remover após residual zero |
| A7 | Cron / auto-migrate Node | `php artisan schedule` + migrate no deploy |
| A8 | Desligar container `conectaking-api` | Compose sem serviço `api` |

### B) APIs ainda só no Node

| # | API | Notas |
|---|---|---|
| B1 | `POST /api/auth/register` | ✅ Laravel |
| B2 | `/api/password/*` (forgot/reset) | ✅ Laravel |
| B3 | `/api/account/*` (details/status/upgrade/password/debug) | ✅ Laravel |
| B4 | `/api/subscription/*` | ✅ Laravel |
| B5 | `/api/link-limits` | ✅ Laravel |
| B6 | `/api/documentos/*` (+ OCR) | |
| B7 | `/api/orcamentos` + recibos | |
| B8 | `/api/king-docs/*` | |
| B9 | `/api/checkin/:itemId` (agregado dashboard) | portaria guest já Laravel |
| B10 | `/api/inquiry/*` | |
| B11 | `/api/generator/*` | |
| B12 | `/api/payment`, `/api/suggestions`, `/api/push` | |
| B13 | `/api/location` | |
| B14 | `/api/v1/sales-pages/*` | página pública loja já Laravel |
| B15 | `/api/image` (proxy de imagem) | |
| B16 | `/api/admin/*` (exceto bíblia) | planos, OG/personalizar-link, etc. |
| B17 | `/api/business/*` (além branding/team) | |
| B18 | `/api/analytics/*` (além KPIs do boot) | |
| B19 | `/api/pix/*` (além QR do cartão) | |
| B20 | `/api/checkout/*` + webhooks PagBank | incluir se quiser zero Node |
| B21 | KS CompareFaces chunked | `face-results?chunked=1` se `REKOG_ON_DEMAND=1` |

### C) Front HTML → Blade (ou servir pelo Laravel)

| # | Página |
|---|---|
| C1 | login / registro / recuperar-senha / conta |
| C2 | dashboard |
| C3 | kingSelection* (Edit, Project, Cliente, Gallery, Review, Success) |
| C4 | formPageEdit, salesPageEdit, guestListEdit* |
| C5 | kingDocs*, kingForms, documentos*, orcamentos, recibos* |
| C6 | admin-planos, admin-devocionais, admin-prosperidade |
| C7 | checkoutConfig, termos, privacidade, index, demais HTML |

**Nota:** Na fase de matar o Node, basta o Laravel **servir** esses HTML (igual Express). Converter tudo para `.blade.php` pode ser paralelo/depois — o critério “sem Node” é a casca HTTP.

## Ordem de execução

1. **Edge Laravel** — health, estáticos, rotas HTML, compose mounts  
2. **APIs residual** — B1→B21 (prioridade: password, account, subscription, documentos, king-docs, admin)  
3. **CompareFaces chunked** — B21  
4. **Caddy → :8080** + smoke total  
5. **Remover serviço `api`**  
6. **HTML → Blade** (C1–C7) até zero HTML legado  

## Progresso

- [x] Lista completa documentada
- [x] `/health` Laravel
- [x] Front legado (HTML/JS) servido pelo Laravel + volumes `public`/`public_html`
- [x] `/api/password/forgot|reset` → Laravel
- [x] `/api/account/*` + status com plan map completo + linkLimits
- [x] `/api/subscription/*` + plans-public
- [x] `/api/link-limits/*`
- [x] `POST /api/auth/register`
- [ ] Demais APIs B6–B21 (documentos, king-docs, admin, …)
- [ ] CompareFaces chunked
- [ ] Caddy → `:8080`
- [ ] Remover container `api`
- [ ] HTML → Blade (C1–C7)


- [ ] Caddy → só Laravel  
- [ ] Container `api` parado/removido  
- [ ] Nenhuma rota `/api/*` respondida por Express  
- [ ] Front servido por Laravel (Blade ou static)  
- [ ] Sem `NODE_INTERNAL_URL` / sem proxy `laravelProxy.js`
