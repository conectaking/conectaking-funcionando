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

Versão atual do compose: `n8nio/n8n:2.38.7` (backup em `/opt/ck-agent/backups/n8n-*` antes de upgrades).

1. Login: `https://n8n.conectaking.com.br` (conta owner do /setup).
2. Importe `n8n/workflows/*.json` se precisar.
3. Credenciais na UI: Telegram API + OpenAI (e opcional Sheets).
4. No `.env`: `ADMIN_TELEGRAM_ID`, `CK_AGENT_JWT`, `CK_BASE_URL`, `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`.
5. Erros do processo n8n → Sentry via `N8N_SENTRY_DSN` (mesmo DSN do site / `SENTRY_LARAVEL_DSN`). `ENVIRONMENT=production` e `DEPLOYMENT_NAME=ck-agent-n8n`.
5. Ative / publique o workflow.

## Comandos úteis

```bash
cd /opt/ck-agent
docker compose logs -f --tail=100 n8n
docker compose logs -f --tail=100 evolution-api
docker stats --no-stream ck-agent-n8n ck-agent-evolution ck-agent-evo-pg ck-agent-evo-redis
curl -sS http://127.0.0.1:8080/health   # site CK
```

## Agente Telegram (IA)

Fluxo: `infra/ck-agent/n8n/workflows/ck-agent-telegram.json` (já ativo na VPS).

- **Voz:** Whisper (transcreve áudio do Telegram)
- **Memória:** últimas ~12 mensagens por chat
- **KB:** produto, planos ref., URLs, códigos
- **Ações admin (só com ordem clara):**
  - `lançar despesa R$ 100 descrição`
  - `gerar código KING-NOME` (precisa hífen)
  - `status` / `diagnóstico`
- Perguntas sobre o produto **não** geram código

Env no n8n: `OPENAI_API_KEY`, `OPENAI_MODEL`, `TELEGRAM_BOT_TOKEN`, `CK_AGENT_JWT`, `ADMIN_TELEGRAM_ID`.


WhatsApp/Evolution ficou pausado (IP Hetzner bloqueado pelo WA). O agente opera no **Telegram**.

### 1) Criar o bot (2 minutos)

1. No Telegram, abra **@BotFather**
2. Envie `/newbot`
3. Escolha nome (ex.: `Conecta King Assistente`) e username (ex.: `conectaking_bot`)
4. Copie o **token** (parece `712345:AAH...`)

### 2) Descobrir seu ID de admin

1. Abra **@userinfobot** ou **@getidsbot**
2. Copie seu **Id** numérico (ex.: `123456789`)

### 3) No n8n

1. **Credenciais** → nova **Telegram API** → cole o token do BotFather
2. Importe:
   - `ck-agent-telegram.json`
   - `ck-agent-health-telegram.json`
3. Nos nós Telegram, selecione essa credencial
4. Em **Variáveis** do n8n (ou `.env` `ADMIN_TELEGRAM_ID`) coloque seu ID
5. Ative os fluxos
6. No Telegram, abra seu bot e envie `/start` depois `status`

### 4) Clientes

Quem conversar com o bot (e não for o seu ID) cai no **Modo Cliente**.

Opcional: no `.env` da VPS:

```bash
ADMIN_TELEGRAM_ID=123456789
```

Depois: `cd /opt/ck-agent && docker compose --env-file .env up -d n8n`

## Proxy residencial (WhatsApp / QR)

Se o QR ficar em branco e `g.whatsapp.net` falhar na VPS, use **proxy residencial Brasil**.

1. Compre um proxy residencial BR (HTTP ou SOCKS5) com usuário/senha.
2. Em `/opt/ck-agent/.env` preencha:

```bash
EVO_PROXY_ENABLED=true
EVO_PROXY_HOST=host.do.provedor.com
EVO_PROXY_PORT=10000
EVO_PROXY_PROTOCOL=http
EVO_PROXY_USERNAME=seu_usuario
EVO_PROXY_PASSWORD=sua_senha
```

3. Aplique:

```bash
bash /opt/ck-agent/apply-evo-proxy.sh
```

4. No Manager: **Get QR Code** e escaneie.

Não use proxy datacenter “barato” genérico — o WhatsApp costuma bloquear igual.

## Se a RAM apertar

`free -h` + `docker stats`. Se swap crescer sem parar ou o site degradar → upgrade CX32 ou mover o agente para outra VPS.
