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

**Teste sem mudar produção:** `https://www.conectaking.com.br/adrianokingg?laravel=1`  
**Prévia:** `/l/card/adrianokingg` (banner de prévia)  
**Canário (exemplo no `.env.prod`):**
```bash
LARAVEL_CARD_PUBLIC=true
LARAVEL_CARD_SLUGS=adrianokingg
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
| 1. Página pública (Blade) | em andamento | Render `/:slug` + tipos principais; APIs satélite ainda Node |
| 2. Canário `LARAVEL_CARD_PUBLIC` | pronto (off) | Ligar slug a slug |
| 3. APIs read do cartão | pendente | PIX QR, verse-of-day, vcard, PDF, logs |
| 4. Editor `/api/profile` | pendente | GET/save-all + CRUD itens |
| 5. Páginas satélite | depois | form, sales, bible, king selection |

**Ainda Node (necessário para “cartão 100% PHP”):** dashboard/editor, uploads, analytics CRUD, e páginas `/form`, `/biblia`, loja, King Selection.


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
