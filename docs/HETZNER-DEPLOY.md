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

Container `conectaking-laravel` (PHP 8.4) na rede Docker, proxy Node só em `/l/*`.  
Código em `/opt/conectaking/laravel`. Variável `LARAVEL_APP_KEY` no `.env.prod`.

```bash
# Rebuild só o Laravel
cd /opt/conectaking
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build laravel
```

O cartão público em produção **continua no Node** até a Blade ficar completa.

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
