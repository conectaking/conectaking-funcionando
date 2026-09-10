# Conecta King

Stack de produção: **Laravel 12 + FrankenPHP + PostgreSQL** (sem Node).

## Arranque local

```bash
cp .env.docker.example .env.docker   # se ainda não existir
docker compose --env-file .env.docker up --build
```

- App: http://localhost:8080  
- Health: http://localhost:8080/health  

## Produção (VPS)

Rebuild limpo (recomendado — sem `docker cp`):

```bash
# no PC: gerar tarball laravel/ + public/ + docker-compose.prod.yml
# no VPS:
bash /tmp/deploy-vps-rebuild.sh   # scripts/deploy-vps-rebuild.sh
```

Ou só rebuild local no servidor:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Caddy do host faz TLS e `reverse_proxy 127.0.0.1:8080`.
## Estrutura

| Caminho | Função |
|---|---|
| `laravel/` | Aplicação PHP (rotas, Blade, services, jobs) |
| `public/` | Assets estáticos canónicos (JS/CSS/imagens) |
| `migrations/` | SQL histórico do schema Postgres |
| `data/bible/` | Dados bíblia (JSON) |
| `cf-worker-kingselection-r2/` | Cloudflare Worker R2 (upload KS) |
| `docs/` | Documentação (cutover PHP, deploy) |
| `scripts/` | Helpers Blade/VPS (sem Node) |

## Notas

- Páginas de app vivem em `laravel/resources/views/pages/*.blade.php`.
- Checkout / PagBank / Mercado Pago estão **fora de escopo** (HTTP 410).
- Scheduler: o entrypoint do container `laravel` corre `php artisan schedule:run` a cada 60s.
  **Não** ligue cron no host a fazer o mesmo (evita jobs duplicados).
- Detalhe da migração: `docs/FULL-PHP-MIGRATION.md`.
- Variáveis de produção: `laravel/.env.example.conectaking` → `.env.prod` no VPS.
