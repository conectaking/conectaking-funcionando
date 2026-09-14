# Observabilidade

## Sentry (opcional)

1. Criar projeto em sentry.io
2. `composer require sentry/sentry-laravel` (no `laravel/`)
3. Definir em `.env.prod`:
   ```
   SENTRY_LARAVEL_DSN=https://...@....ingest.sentry.io/...
   SENTRY_TRACES_SAMPLE_RATE=0.1

   # CK Agent (n8n) — mesmo DSN ou projeto dedicado:
   # em /opt/ck-agent/.env → N8N_SENTRY_DSN=... (compose já passa ao container)
   ```
4. Redeploy `laravel`, `queue`, `queue-faces`, `scheduler`

O `bootstrap/app.php` reporta exceções se o DSN estiver definido **e** o pacote instalado.

## Alertas → King Assistente (Telegram)

Fluxo desejado: **erro no Conecta King → Sentry/Ops → n8n → Telegram do admin**.

1. Webhook n8n (já ativo): `https://n8n.conectaking.com.br/webhook/ck-agent-sentry`
2. Laravel `OpsAlertService` envia para esse webhook se `CK_AGENT_ALERT_WEBHOOK` estiver no `.env` (e opcional `CK_SENTRY_WEBHOOK_SECRET`).
3. No Sentry (UI): **Alerts → Create Alert Rule** → “Issue Alert” → Action **Send a notification via webhook** → URL acima. Assim issues novas/regressões também avisam o agente.
4. Falhas do próprio workflow do agente usam o workflow **CK Agent — Error → Telegram**.

## Logs

Produção: `LOG_CHANNEL=stderr` → `docker logs conectaking-laravel`.
