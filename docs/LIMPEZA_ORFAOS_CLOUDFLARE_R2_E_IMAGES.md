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

```bash
# Na raiz do projeto (conectaking-funcionando-1)

# Simular: só listar o que seria deletado (não deleta)
DRY_RUN=1 node scripts/cleanup-cloudflare-images.js
# ou
npm run cleanup:cloudflare:dry

# Deletar de verdade (exige CONFIRM_DELETE=SIM)
DRY_RUN=0 CONFIRM_DELETE=SIM node scripts/cleanup-cloudflare-images.js
# ou
DRY_RUN=0 CONFIRM_DELETE=SIM npm run cleanup:cloudflare

# Só órfãs com mais de 3 dias
DRY_RUN=0 CONFIRM_DELETE=SIM MIN_AGE_DAYS=3 node scripts/cleanup-cloudflare-images.js

# Salvar lista de candidatas em arquivo (sem deletar)
DRY_RUN=1 OUT_FILE=orphans-cf-images.json node scripts/cleanup-cloudflare-images.js
```

**PowerShell (Windows):**

```powershell
$env:DRY_RUN="0"; $env:CONFIRM_DELETE="SIM"; node scripts/cleanup-cloudflare-images.js
```

**CMD (Windows):**

```cmd
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

Opcionais:

- `MAX_DELETE` — limite de keys a deletar por execução (0 = sem limite).
- `SLEEP_MS` — pausa entre batches.
- `CONFIRM_DELETE=SIM` — obrigatório para deleção real (junto com `DRY_RUN=0`).

### Comandos (R2)

```bash
# Na raiz do projeto (não dentro de cf-worker-kingselection-r2)

# Simular: só listar o que seria deletado (não deleta)
DRY_RUN=1 node scripts/cleanup-r2-orphans.js
# ou
npm run cleanup:r2:dry

# Deletar de verdade (exige CONFIRM_DELETE=SIM)
DRY_RUN=0 CONFIRM_DELETE=SIM node scripts/cleanup-r2-orphans.js
# ou
DRY_RUN=0 CONFIRM_DELETE=SIM npm run cleanup:r2
```

**PowerShell (Windows):**

```powershell
$env:DRY_RUN="0"; $env:CONFIRM_DELETE="SIM"; node scripts/cleanup-r2-orphans.js
```

**CMD (Windows):**

```cmd
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
