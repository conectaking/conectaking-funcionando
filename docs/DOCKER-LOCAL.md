# Docker local — Conecta King (Laravel / FrankenPHP)

Pré-visualizar o painel no PC **antes** de subir para a VPS. Só `db` + `laravel` — sem Node.

## Requisitos

- Docker Desktop instalado e ligado
- Pasta do projeto (`conectaking-funcionando`)

## Primeira vez

```powershell
copy .env.docker.example .env.docker
docker compose --env-file .env.docker up --build
```

Aguarde o health ficar ok. Depois:

| O quê | URL |
|---|---|
| App | http://localhost:8080 |
| Login | http://localhost:8080/login |
| Dashboard | http://localhost:8080/dashboard |
| Health | http://localhost:8080/health |

A API e as páginas Blade são o mesmo host (`:8080`). Não uses `?api=local` nem porta `5000`.

## Parar

```powershell
docker compose down
```

Dados do Postgres ficam no volume (não apagam com `down`).

Zerar o banco local:

```powershell
docker compose down -v
```

## Produção

Ver `docs/HETZNER-DEPLOY.md` e `docs/FULL-PHP-MIGRATION.md`.
