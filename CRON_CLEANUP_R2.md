# Limpeza de órfãos R2 (KingSelection)

Sistema de exclusão automática e limpeza diária para imagens, logomarcas e vídeos no R2, equivalente ao que existe para Cloudflare Images.

**Sobre "pastas":** No R2 não existem pastas reais — são apenas prefixos nas keys. Quando todos os objetos de um prefixo são deletados, a pasta some automaticamente. A limpeza remove objetos órfãos (incluindo logomarcas antigas trocadas e placeholders de pasta, se existirem).

## Marca d'água / Logo não envia?

Se a marca d'água não for enviada, confira no **Render → Environment**:

- **`KINGSELECTION_WORKER_SECRET`** — deve existir e ser **igual** ao `KS_WORKER_SECRET` no Cloudflare Worker. Sem isso, o upload da logo retorna erro 501.

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

**Requisito:** O arquivo `.env` na raiz do projeto deve ter `KINGSELECTION_WORKER_SECRET` (mesmo valor do `KS_WORKER_SECRET` no Cloudflare Worker). Sem isso, o script falha com "não configurado".

**Importante:** Execute sempre na pasta raiz do projeto (`conectaking-funcionando-1`), não dentro de `cf-worker-kingselection-r2`. Se estiver em `cf-worker-kingselection-r2`, use `cd ..` primeiro.

```powershell
# Simular (não deleta nada)
npm run cleanup:r2:dry

# Deletar de verdade (PowerShell — use ; em vez de &&)
$env:DRY_RUN="0"; $env:CONFIRM_DELETE="SIM"; node scripts/cleanup-r2-orphans.js
```

No **CMD** (Prompt de Comando):
```cmd
set DRY_RUN=0 && set CONFIRM_DELETE=SIM && node scripts/cleanup-r2-orphans.js
```

## Deploy do Worker

Depois das alterações, faça o deploy do Worker para que os novos endpoints (`/ks/delete`, `/ks/list`, `/ks/delete-batch`) funcionem:

```bash
cd cf-worker-kingselection-r2
npx wrangler deploy
```
