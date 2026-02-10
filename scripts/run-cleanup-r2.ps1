# Limpeza de imagens/objetos órfãos no R2 (galleries/)
# Mesmo estilo do cleanup de Cloudflare Images; usa Worker (r2.conectaking.com.br).

# Secret do Worker (obrigatório)
$env:KINGSELECTION_WORKER_SECRET = "COLOQUE_AQUI_SEU_SECRET"

# URL do Worker (opcional; padrão: https://r2.conectaking.com.br)
# $env:KINGSELECTION_WORKER_URL = "https://r2.conectaking.com.br"

# Deleção em lote com confirmação obrigatória
$env:DRY_RUN = "0"
$env:CONFIRM_DELETE = "SIM"
$env:MAX_DELETE = "50"
$env:SLEEP_MS = "200"
$env:OUT_FILE = "orfas-r2.json"

node (Join-Path $PSScriptRoot "cleanup-r2-orphans.js")
