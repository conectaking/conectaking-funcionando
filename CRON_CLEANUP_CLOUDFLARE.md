## Limpeza diária de imagens órfãs (Cloudflare Images)

Este projeto tem um script que remove imagens do **Cloudflare Images** que não estão mais referenciadas no banco/arquivos do sistema:

- Script: `scripts/cleanup-cloudflare-images.js`
- Segurança:
  - Por padrão roda em **DRY_RUN=1** (não deleta)
  - Para deletar, exige **DRY_RUN=0** + **CONFIRM_DELETE=SIM**
  - Possui **lock no Postgres** (`pg_try_advisory_lock`) para evitar rodar em duplicidade

### 1) Rodar manualmente (para testar)

Dry-run (recomendado primeiro):

```bash
npm run cleanup:cloudflare:dry
```

Deletar de verdade (somente quando você tiver certeza):

```bash
DRY_RUN=0 CONFIRM_DELETE=SIM MAX_DELETE=50 SLEEP_MS=200 node scripts/cleanup-cloudflare-images.js
```

### 2) Rodar automaticamente TODO DIA (via backend)

O `server.js` já tem um agendamento opcional. Para habilitar:

#### Variáveis obrigatórias

- `CF_ORPHAN_CLEANUP_ENABLED=1`
- `CLOUDFLARE_ACCOUNT_ID` (ou `CF_IMAGES_ACCOUNT_ID`)
- Credenciais do Cloudflare (use **UMA** das opções):
  - **Recomendado**: `CLOUDFLARE_API_TOKEN` (com permissão de Cloudflare Images Read + Edit)
  - Alternativa: `CLOUDFLARE_EMAIL` + `CLOUDFLARE_API_KEY`

#### Variáveis de segurança (obrigatórias para deletar)

- `CF_ORPHAN_CLEANUP_DRY_RUN=0`
- `CF_ORPHAN_CLEANUP_CONFIRM=SIM`

#### Variáveis opcionais (recomendado)

- `CF_ORPHAN_CLEANUP_CRON="30 5 * * *"`
  - Observação: em muitos hosts (ex.: Render), o cron roda em **UTC**.
- `CF_ORPHAN_CLEANUP_MAX_DELETE=50`
- `CF_ORPHAN_CLEANUP_SLEEP_MS=200`
- `CF_ORPHAN_CLEANUP_MIN_AGE_DAYS=1` (evita deletar uploads muito recentes)
- `CF_ORPHAN_CLEANUP_OUT_FILE=` (vazio por padrão; em FS efêmero pode não valer a pena)
- `CF_ORPHAN_CLEANUP_LOCK_KEY=20260201` (normalmente não precisa mudar)

### 3) Nota importante sobre segurança

Não coloque chaves/segredos no código. Configure tudo via **variáveis de ambiente** no servidor.

