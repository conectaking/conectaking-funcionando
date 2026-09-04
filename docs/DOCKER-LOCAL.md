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

## Notas

- Não use **Go Live** neste fluxo: o container da API já serve `public/` e `public_html/`.
- Segredos de produção (Render) não entram na imagem (`.env` está no `.dockerignore`).
- Porta padrão: **5000**. Se estiver ocupada, mude `PORT=` no `.env.docker`.
