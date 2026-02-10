# Limpeza de arquivos órfãos no Cloudflare (R2 e Images)

Scripts para remover do Cloudflare **imagens/arquivos que não estão mais referenciados** no banco (e, no caso do Images, em arquivos do site). Ou seja: órfãos — que sobraram após exclusões ou trocas e continuam consumindo espaço/custo.

---

## 1. Cloudflare Images (imagedelivery.net / cfimage:)

**Script:** `scripts/cleanup-cloudflare-images.js`

- Lista **todas** as imagens da conta no Cloudflare Images.
- Coleta no Postgres e em arquivos (public_html, views, public) todas as referências a `imagedelivery.net/.../<imageId>/...` e `cfimage:<id>`.
- **Órfãs** = imagens cujo ID **não** aparece em nenhuma referência.
- Por padrão roda em **DRY RUN** (não deleta). Para deletar de verdade é obrigatório `DRY_RUN=0` e `CONFIRM_DELETE=SIM`.

### Variáveis de ambiente (Cloudflare Images)

| Variável | Descrição |
|----------|-----------|
| `CF_IMAGES_ACCOUNT_ID` ou `CLOUDFLARE_ACCOUNT_ID` | ID da conta Cloudflare |
| `CF_IMAGES_API_TOKEN` ou `CLOUDFLARE_API_TOKEN` | API Token (recomendado) **ou** |
| `CLOUDFLARE_EMAIL` + `CLOUDFLARE_API_KEY` | Global API Key |
| `DB_*` | Mesmas do backend (Postgres) |

Opcionais:

- `MIN_AGE_DAYS` — só considera órfãs com mais de X dias (evita deletar uploads recentes ainda não salvos).
- `MAX_DELETE` — limite de quantas deletar por execução (0 = sem limite).
- `SLEEP_MS` — pausa em ms entre deleções (evitar rate limit).
- `OUT_FILE` — caminho de um JSON com a lista de candidatas a órfãs (sem deletar).
- `CONFIRM_DELETE=SIM` — obrigatório para executar deleção real (junto com `DRY_RUN=0`).

### Comandos (Cloudflare Images)

**No Windows (PowerShell)** — use esta sintaxe (no PowerShell `VAR=valor` não funciona):

```powershell
# Simular: só listar o que seria deletado (não deleta)
$env:DRY_RUN="1"; node scripts/cleanup-cloudflare-images.js

# Deletar órfãs de verdade
$env:DRY_RUN="0"; $env:CONFIRM_DELETE="SIM"; node scripts/cleanup-cloudflare-images.js

# Só órfãs com mais de 3 dias
$env:DRY_RUN="0"; $env:CONFIRM_DELETE="SIM"; $env:MIN_AGE_DAYS="3"; node scripts/cleanup-cloudflare-images.js
```

**No Linux / Mac / Git Bash:**

```bash
# Simular (não deleta)
DRY_RUN=1 node scripts/cleanup-cloudflare-images.js

# Deletar de verdade
DRY_RUN=0 CONFIRM_DELETE=SIM node scripts/cleanup-cloudflare-images.js
```

**CMD (Prompt de Comando):**

```cmd
set DRY_RUN=1 && node scripts/cleanup-cloudflare-images.js
set DRY_RUN=0 && set CONFIRM_DELETE=SIM && node scripts/cleanup-cloudflare-images.js
```

---

## 2. R2 (KingSelection – galleries/)

**Script:** `scripts/cleanup-r2-orphans.js`

- Lista objetos no R2 com prefixo `galleries/` (via Worker em r2.conectaking.com.br).
- Coleta no Postgres referências em `king_photos.file_path` e `king_galleries.watermark_path` (valores `r2:...` ou `galleries/...`).
- **Órfãos** = keys que **não** aparecem em nenhuma referência.
- Por padrão roda em **DRY RUN**. Para deletar de verdade é obrigatório `DRY_RUN=0` e `CONFIRM_DELETE=SIM`.

### Variáveis de ambiente (R2)

| Variável | Descrição |
|----------|-----------|
| `KINGSELECTION_WORKER_SECRET` | Mesmo valor do `KS_WORKER_SECRET` no Cloudflare Worker |
| `R2_PUBLIC_BASE_URL` ou `KINGSELECTION_WORKER_URL` | Ex.: `https://r2.conectaking.com.br` |
| `DB_*` | Mesmas do backend (Postgres) |

**Como obter o `KINGSELECTION_WORKER_SECRET`:**

1. **Se a API já está no Render:** no [Render Dashboard](https://dashboard.render.com) → seu serviço (API) → **Environment** → procure `KINGSELECTION_WORKER_SECRET` e copie o valor (ícone de copiar).
2. **Se você usa `.env` na raiz do projeto:** abra o arquivo `.env`, procure a linha `KINGSELECTION_WORKER_SECRET=...` e copie o valor (tudo depois do `=`).
3. **Esse valor é o mesmo** que está no Cloudflare Worker: foi definido com `wrangler secret put KS_WORKER_SECRET` na pasta `cf-worker-kingselection-r2`. O Cloudflare não mostra o valor depois de salvo; se você perdeu, defina um novo no Worker e atualize o Render e o `.env` com o mesmo valor.

Opcionais:

- `MAX_DELETE` — limite de keys a deletar por execução (0 = sem limite).
- `SLEEP_MS` — pausa entre batches.
- `CONFIRM_DELETE=SIM` — obrigatório para deleção real (junto com `DRY_RUN=0`).

### Comandos (R2)

**No Windows (PowerShell):**

```powershell
# Simular (não deleta)
$env:DRY_RUN="1"; node scripts/cleanup-r2-orphans.js

# Deletar órfãos de verdade
$env:DRY_RUN="0"; $env:CONFIRM_DELETE="SIM"; node scripts/cleanup-r2-orphans.js
```

**No Linux / Mac / Git Bash:**

```bash
# Simular
DRY_RUN=1 node scripts/cleanup-r2-orphans.js

# Deletar de verdade
DRY_RUN=0 CONFIRM_DELETE=SIM node scripts/cleanup-r2-orphans.js
```

**CMD (Windows):**

```cmd
set DRY_RUN=1 && node scripts/cleanup-r2-orphans.js
set DRY_RUN=0 && set CONFIRM_DELETE=SIM && node scripts/cleanup-r2-orphans.js
```

---

## Resumo rápido

| Onde | Script | Dry run | Deletar de verdade |
|------|--------|---------|---------------------|
| **Cloudflare Images** | `scripts/cleanup-cloudflare-images.js` | `DRY_RUN=1` ou `npm run cleanup:cloudflare:dry` | `DRY_RUN=0 CONFIRM_DELETE=SIM` ou `npm run cleanup:cloudflare` (com env) |
| **R2 (KingSelection)** | `scripts/cleanup-r2-orphans.js` | `DRY_RUN=1` ou `npm run cleanup:r2:dry` | `DRY_RUN=0 CONFIRM_DELETE=SIM` ou `npm run cleanup:r2` (com env) |

Os dois scripts usam **lock no Postgres** para não rodar em duplicidade (ex.: cron + manual ao mesmo tempo).  
Recomendação: rodar primeiro em **DRY RUN** e conferir a saída antes de rodar com deleção real.
