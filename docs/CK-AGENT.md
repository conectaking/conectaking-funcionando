# CK Agent — Agente IA Conecta King (n8n + Evolution)

Stack **separado** do site: `/opt/ck-agent` na VPS `46.225.100.64`.  
Não altera o `docker-compose.prod.yml` do Conecta King.

## O que este stack faz

| Canal | Comportamento |
|-------|----------------|
| Seu WhatsApp (Admin) | Diagnóstico, alertas, lançar gastos, gerar códigos ADM |
| Cliente | Atendimento / FAQ (Assistente do Conecta King) |
| Cron ~5 min | Se `/health` falhar → avisa no seu WhatsApp |

**Não** programa nem faz deploy do site (isso continua no Cursor).

## Pré-requisitos

1. DNS A:
   - `n8n.conectaking.com.br` → `46.225.100.64`
   - `evo.conectaking.com.br` → `46.225.100.64`
2. Swap 2 GiB na VPS (já provisionado se o bring-up rodou).
3. Disco com margem (após prune de build cache).

## Subir na VPS

```bash
# Do repo (ou copie a pasta infra/ck-agent)
mkdir -p /opt/ck-agent
# cole docker-compose.yml + .env

cd /opt/ck-agent
cp .env.example .env   # se ainda não tiver
# edite .env: senhas, EVOLUTION_API_KEY, N8N_*

docker compose --env-file .env pull
docker compose --env-file .env up -d
docker compose ps
```

## Caddy

Anexe o conteúdo de `Caddyfile.snippet` em `/etc/caddy/Caddyfile` **sem apagar** os blocos `www` / `tag`, depois:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

TLS Let's Encrypt sobe sozinho quando o DNS estiver certo.

## Evolution — QR WhatsApp

1. Abra `https://evo.conectaking.com.br` (header `apikey: SEU_EVOLUTION_API_KEY` nas APIs).
2. Crie instância (ex.: `conectaking`):

```bash
curl -sS -X POST 'https://evo.conectaking.com.br/instance/create' \
  -H "apikey: $EVOLUTION_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"instanceName":"conectaking","integration":"WHATSAPP-BAILEYS","qrcode":true}'
```

3. Pegue o QR: `GET /instance/connect/conectaking` com o mesmo header.
4. Escaneie no WhatsApp do **número do agente** (pode ser o da empresa).
5. Webhook da instância → n8n:

```text
https://n8n.conectaking.com.br/webhook/ck-agent-wa
```

Eventos sugeridos: `MESSAGES_UPSERT`.

## n8n

1. Login: `https://n8n.conectaking.com.br` (Basic Auth do `.env`).
2. Importe `n8n/workflows/*.json`.
3. Credenciais a criar na UI:
   - OpenAI API
   - HTTP Header Auth / login JWT Conecta King
   - Google Sheets (opcional no MVP)
   - Evolution API (apikey) para **enviar** respostas
4. Ajuste `ADMIN_WHATSAPP` no nó Set / variáveis (E.164 só dígitos, ex. `5511999...`).
5. Ative os workflows.

## Comandos úteis

```bash
cd /opt/ck-agent
docker compose logs -f --tail=100 n8n
docker compose logs -f --tail=100 evolution-api
docker stats --no-stream ck-agent-n8n ck-agent-evolution ck-agent-evo-pg ck-agent-evo-redis
curl -sS http://127.0.0.1:8080/health   # site CK
```

## Segurança

- Portas 5678/8081 **só** em `127.0.0.1`.
- Não commitar `.env`.
- Cliente nunca recebe tools de admin (IF no fluxo).
- Retenção de executions n8n: 72h.

## Se a RAM apertar

`free -h` + `docker stats`. Se swap crescer sem parar ou o site degradar → upgrade CX32 ou mover o agente para outra VPS.
