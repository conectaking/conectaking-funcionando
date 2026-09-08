# Deploy Hetzner (produção)

Servidor: `conectaking-prod` · IP `46.225.100.64`  
Stack: Docker (`api` + `postgres`) em `/opt/conectaking`

## URLs

| O quê | URL |
|---|---|
| Health | http://46.225.100.64/health |
| Login | http://46.225.100.64/login.html |
| Painel | http://46.225.100.64/dashboard.html |
| Cartão (Node, produção) | `/:slug` ex. `/adrianokingg` |
| Cartão (Laravel, prévia) | `/l/card/:slug` |
| API cartão Laravel | `/l/api/card/:slug` |

## Laravel (migração gradual)

Container `conectaking-laravel` (PHP 8.4) na rede Docker, proxy Node.

| Variável | Default | Função |
|---|---|---|
| `LARAVEL_CARD_ENABLED` | `true` | Liga proxy `/l/*` |
| `LARAVEL_CARD_PUBLIC` | `false` | Se `true`, `/:slug` passa a Laravel |
| `LARAVEL_CARD_SLUGS` | vazio | Canário: lista `slug1,slug2` (vazio = todos quando PUBLIC=true) |
| `LARAVEL_PROFILE_API` | `false` | Editor `/api/profile*` → Laravel (JWT) |
| `LARAVEL_UPLOAD_API` | `false` | `/api/upload/*` e `/api/upload/pdf` → Laravel |
| `LARAVEL_SATELLITES` | `false` | Form, bíblia, loja (respeita `LARAVEL_CARD_SLUGS`) |
| `LARAVEL_ADMIN_BIBLE` | = satélites | Admin prosperidade + Dev365 (JWT admin) |
| `LARAVEL_KS` | `false` | King Selection landing + APIs públicas read-only |
| `LARAVEL_KS_SLUGS` | vazio | Canário de **slugs de galeria** KS (ex. `eliseu`) |

**Teste sem mudar produção:** `https://www.conectaking.com.br/adrianokingg?laravel=1`  
**Prévia:** `/l/card/adrianokingg` (banner de prévia)  
**Produção atual (todos os slugs):**
```bash
LARAVEL_CARD_PUBLIC=true
LARAVEL_CARD_SLUGS=
LARAVEL_PROFILE_API=true
LARAVEL_UPLOAD_API=true
LARAVEL_SATELLITES=true
LARAVEL_ADMIN_BIBLE=true
LARAVEL_KS=true
LARAVEL_KS_SLUGS=
```

## O que já está em PHP (Laravel) em produção

Flags atuais (canário): cartão/`adrianokingg`, profile, upload, satélites, KS/`eliseu`, admin bíblia, dashboard.

| Área | Estado |
|---|---|
| Cartão público Blade + APIs read | **Todos os slugs** (`LARAVEL_CARD_SLUGS` vazio) |
| Editor profile + uploads | Ligado |
| Form / guest-list / bíblia pública / loja | Todos (satélites) |
| Admin prosperidade + Dev365 (incl. async jobs) | Ligado |
| KS público + client login/acesso + select/select-bulk/finalize/gallery + export/edit + SPA | **Todos** (`LARAVEL_KS_SLUGS` vazio) |
| KS watermark preview/download (GD diagonal) | Ligado (modo off/none intacto) |
| KS painel fotógrafo (CRUD + upload + pastas + clientes + PUT) | F4b Laravel |
| KS vendas (sales-config, clients, round, payment-terms/review, approve) | Laravel |
| KS access-link + reset-password cliente | Laravel |
| KS uploads/presign-batch (R2 SigV4) | Laravel |
| KS watermark-file (GET preview PNG) | Laravel |
| KS payment-proof (GET admin + POST cliente) + volume uploads compartilhado | Laravel |
| KS worker-token + gallery reset-password | Laravel |
| KS face (admin process/status/results/detail, auto-separate, client face-results/cache/reset/search, public my-photos/enroll-anonymous) | Laravel |
| KS facial panel (`/facial/*` status/clients/jobs/matches/process/progress/delete/diagnose) + aws-check/aws-ping | Laravel |
| KS config-finalizacao (HTML Blade) + thank-you-image | Laravel |
| KS pastas avançadas / AI / zip / process-all-faces | Laravel (process-all-faces + auto-separate + zip já no PHP) |
| Dashboard boot | auth login/refresh/logout + modules + analytics + branding + finance boot + login/dashboard shell (`LARAVEL_DASHBOARD=true`) |
| Finance CRUD (transactions/cards/categories/accounts/goals/profiles + income-breakdown) | Laravel |
| Finance extras (upgrade-plans, whatsapp-config, zerar-senha/verify/put, zerar-mes, admin clientes-senhas) | Laravel |
| Finance leftovers (budgets, reports, transfer, upload, profile by id, Serasa PDF/OCR) | Laravel (`pdftotext` + `tesseract`) |
| Guest-list admin (CRUD listas/convidados + QR + reset-tokens + team GET + export/pdf) | Laravel (export/pdf = JSON paridade Node) |

## O que ainda falta (código Node → PHP)

| Prioridade | Item | Notas |
|---|---|---|
| Baixa | KS CompareFaces chunked (`face-results?chunked=1` com REKOG_ON_DEMAND=1) | opcional; prod está com ON_DEMAND=0 |
| Removido do roadmap | Checkout / PagBank | **Não será usado** — não migrar |
| N/A | TTS | Browser-only |

## Ops (já OK neste VPS)

- Caddy HTTPS em `conectaking.com.br` / `www` / `cnking.bio`
- UFW: 22/80/443
- DNS via Cloudflare (proxy) → origem Hetzner `46.225.100.64`

**Não falta** OpenAI / JWT / R2 / `LARAVEL_APP_KEY` para o que já migrou.

```bash
# Rebuild só o Laravel
cd /opt/conectaking
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build laravel
# Após mudar flags, recreate da API:
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
```

## Roadmap migração cartão → Laravel

| Fase | Status | Escopo |
|---|---|---|
| 1–6 | feito | cartão, profile, upload, satélites |
| 7. King Selection | parcial | público + client login/gallery/preview |
| 8. KS completo | depois | select, uploads, watermark, vendas, face |
| 9. Dashboard | parcial | `account/status`; HTML/finance ainda Node |

**Ainda Node (residual):** ver lista completa em [`docs/FULL-PHP-MIGRATION.md`](FULL-PHP-MIGRATION.md). Meta: Caddy → Laravel e desligar container `api`.

Devocional 365 público: Laravel serve `/api/bible/devotionals-365/{day}` com temas + enriquecimento IA opcional (`OPENAI_API_KEY` / `ai=0` / `plain=1`).

Admin prosperidade (Laravel): list/get/save/publish/export/import/storytelling-map/`generate-ai`, **parse-paste**, **generate-range-ai** (sync + async jobs em Cache) + generation-job get/cancel.

Admin devotionals-365 (Laravel): days, admin-full, day get/put/delete, month-themes, generate tema, `day/:d/generate-ai`, **generate-range-ai** (máx. 31 dias), **generate-month-ai**, **generate-calendar-months-async** + generation-job get/cancel (Cache).

King Selection:
```
LARAVEL_KS=true
LARAVEL_KS_SLUGS=
```
Landing SPA: `/kingSelection/{slug}` (Laravel; `?landing=1` = landing; `?engine=node` = SPA Node). Client APIs: login|acesso|select|finalize|export|edit-request*|gallery|preview.

**Nota deploy:** não embutir `laravel/.env` (sqlite local) na imagem — o compose injeta `DB_CONNECTION=pgsql`. O `Dockerfile` remove `.env` no build e `.dockerignore` ignora o arquivo.


## Login inicial (banco novo)

- E-mail: `conectaking@gmail.com`
- Senha: a que você definiu (alterada no VPS)


## Comandos no VPS

```bash
ssh root@46.225.100.64
cd /opt/conectaking
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f api
```

## Redeploy (do PC)

1. Gerar tarball do projeto (sem `node_modules` / `.env`)
2. `scp` para `/opt/conectaking/`
3. Extrair e:

```bash
cd /opt/conectaking
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## Próximos passos

- Apontar domínio (DNS A → `46.225.100.64`)
- HTTPS (Caddy ou Nginx + Let's Encrypt)
- Firewall Hetzner (22/80/443) no painel Cloud
