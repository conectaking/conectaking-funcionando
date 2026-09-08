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
| `LARAVEL_SATELLITES` | `false` | Form, bíblia (hub/leitor/estudos/devocional), loja (respeita `LARAVEL_CARD_SLUGS`) |

**Teste sem mudar produção:** `https://www.conectaking.com.br/adrianokingg?laravel=1`  
**Prévia:** `/l/card/adrianokingg` (banner de prévia)  
**Canário (exemplo no `.env.prod`):**
```bash
LARAVEL_CARD_PUBLIC=true
LARAVEL_CARD_SLUGS=adrianokingg
LARAVEL_PROFILE_API=true
LARAVEL_UPLOAD_API=true
LARAVEL_SATELLITES=true
```

```bash
# Rebuild só o Laravel
cd /opt/conectaking
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build laravel
# Após mudar flags, recreate da API:
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate --no-deps api
```

O cartão público em produção **continua no Node** até `LARAVEL_CARD_PUBLIC=true` (ou `?laravel=1`).

## Roadmap migração cartão → Laravel

| Fase | Status | Escopo |
|---|---|---|
| 1. Página pública (Blade) | canário `adrianokingg` | Render `/:slug` + tipos principais |
| 2. Canário `LARAVEL_CARD_PUBLIC` | ligado (slug) | `LARAVEL_CARD_SLUGS=adrianokingg` |
| 3. APIs read do cartão | feito (proxy) | PIX, verse, logs, vcard, PDF |
| 4. Editor `/api/profile` | feito | CRUD + tipados + form extras |
| 5. Uploads | feito (flag) | `/api/upload/*` + PDF |
| 6. Satélites | feito (flag, canário) | form, bíblia hub+leitor+estudos+devocional 365, loja |
| 7. King Selection | depois | permanece Node (monólito grande; stub `modules/KingSelection/` paralelo) |

**Ainda Node:** King Selection completo; bíblia TTS/progresso/IA-devocional; form EJS rico (checkout/portaria); hub “Receba mais” EJS (prosperidade, cunha, IA).

APIs bíblia no Laravel: books, chapter, verse-of-day, study, salmo-do-dia, `devocional-do-dia`, `devotionals-365/:day?plain=1`, `reading-plan/day/:day` (fallback de capítulos se tabela vazia).

Satélites: hub, leitor, estudos, `devocional`, `salmo`, `plano[/:day]`.

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
