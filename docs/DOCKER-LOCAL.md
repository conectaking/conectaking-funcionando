# Docker local — Conecta King

Pré-visualizar o painel e a API no PC **antes** de subir para Render/Hetzner, sem Go Live.

## Requisitos

- Docker Desktop instalado e **ligado**
- Na pasta do projeto (`conectaking-funcionando`)

## Primeira vez

```powershell
copy .env.docker.example .env.docker
docker compose --env-file .env.docker up --build
```

Aguarde a API subir (migrations rodam no start). Depois abra:

| O quê | URL |
|---|---|
| Painel | http://localhost:5000/dashboard.html?api=local |
| Health | http://localhost:5000/health |
| Login | http://localhost:5000/login.html?api=local |

O `?api=local` faz o JavaScript falar com a API do Docker (`localhost:5000`), não com o Render.

## Parar

```powershell
docker compose down
```

Os dados do Postgres local ficam no volume `pgdata` (não apagam com `down`).

Para zerar o banco local:

```powershell
docker compose down -v
```

## Criar usuário local

Com o banco vazio, use o fluxo de registro do próprio site/login, ou importe um dump do Render se quiser dados reais:

```powershell
# Exemplo (ajuste o caminho do dump):
docker compose exec -T db pg_restore -U conectaking -d conectaking --no-owner < backup.dump
```

## Copiar usuários/senhas do Render para o Docker

Sim: as senhas no banco são **hash** — ao copiar o Postgres, o login de produção funciona no Docker.

### Pré-requisito

No painel do Render → seu **PostgreSQL** → **Connect** → copie a URL **External** (não a Internal).

Coloque no arquivo do `.env` (o caminho em `.env.path`), por exemplo:

```env
DATABASE_URL=postgresql://USER:SENHA@HOST-externo.render.com/DB?sslmode=require
```

ou confira se `DB_HOST` / `DB_USER` / `DB_PASSWORD` / `DB_DATABASE` são da conexão **External**.

Seu PC precisa conseguir conectar na porta **5432** do host externo do Render (firewall/rede).

### Comando

Com o Docker Desktop ligado e `conectaking-db` no ar:

```powershell
cd C:\Users\playa\OneDrive\Documentos\conectaking-funcionando
docker compose --env-file .env.docker up -d
node scripts/sync-render-db-to-docker.js
```

Depois: http://localhost:5000/login.html com o **mesmo e-mail e senha** de produção.

### Se der erro SSL / “Connection terminated”

1. Confirme que está usando a URL **External** do Render (não Internal).  
2. No Render → Database → Info: banco não pode estar suspenso.  
3. Teste de outra rede (4G) — alguns Wi‑Fi bloqueiam porta 5432.  
4. Alternativa: no Render Shell / máquina que conecta, gere o dump e coloque em `backups/render-to-docker.dump`, depois rode só o restore (peça ajuda se precisar).

## Notas

- Não use **Go Live** neste fluxo: o container da API já serve `public/` e `public_html/`.
- Segredos de produção (Render) não entram na imagem (`.env` está no `.dockerignore`).
- Porta padrão: **5000**. Se estiver ocupada, mude `PORT=` no `.env.docker`.
