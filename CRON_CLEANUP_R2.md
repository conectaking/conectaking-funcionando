# Limpeza de órfãos R2 (KingSelection)

Sistema de exclusão automática e limpeza diária para imagens no R2, equivalente ao que existe para Cloudflare Images.

## O que foi implementado

### 1. Exclusão ao deletar foto
Quando você exclui uma foto no painel admin, o arquivo correspondente no R2 também é removido (se o `file_path` for `r2:...`).

### 2. Exclusão ao remover/trocar marca d'água
Quando você remove ou troca a marca d'água personalizada, o arquivo antigo no R2 é deletado.

### 3. Limpeza diária de órfãos
Script que remove objetos no R2 que não estão mais referenciados no banco (fotos ou marcas d'água removidas sem exclusão correta).

## Como ativar a limpeza diária

1. **Variáveis no Render:**
   ```
   R2_ORPHAN_CLEANUP_ENABLED=1
   R2_ORPHAN_CLEANUP_DRY_RUN=0          # 0 = realmente deleta; 1 = apenas simula
   R2_ORPHAN_CLEANUP_CONFIRM=SIM        # obrigatório para executar deleção
   R2_ORPHAN_CLEANUP_CRON=45 5 * * *    # 05:45 UTC (opcional, padrão já é esse)
   ```

2. O script usa `KINGSELECTION_WORKER_SECRET` e `R2_PUBLIC_BASE_URL` (ou `KINGSELECTION_WORKER_URL`) para falar com o Worker.

## Execução manual

```bash
# Simular (não deleta nada)
npm run cleanup:r2:dry

# Deletar de verdade
DRY_RUN=0 CONFIRM_DELETE=SIM node scripts/cleanup-r2-orphans.js

# Limitar quantidade e pausa entre batches
DRY_RUN=0 CONFIRM_DELETE=SIM MAX_DELETE=50 SLEEP_MS=200 node scripts/cleanup-r2-orphans.js
```

## Deploy do Worker

Depois das alterações, faça o deploy do Worker para que os novos endpoints (`/ks/delete`, `/ks/list`, `/ks/delete-batch`) funcionem:

```bash
cd cf-worker-kingselection-r2
npx wrangler deploy
```
