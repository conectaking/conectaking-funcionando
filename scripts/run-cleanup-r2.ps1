# Limpeza de imagens/objetos órfãos no R2 (galleries/)
# Mesmo estilo do cleanup de Cloudflare Images; usa Worker (r2.conectaking.com.br).
#
# ONDE PEGAR O KINGSELECTION_WORKER_SECRET:
#   1) Se sua API já roda no Render: Render Dashboard -> seu serviço -> Environment -> copie o valor de KINGSELECTION_WORKER_SECRET.
#   2) Se você usa .env na raiz do projeto: abra o arquivo .env e copie o valor de KINGSELECTION_WORKER_SECRET=...
#   3) Esse valor deve ser o MESMO configurado no Cloudflare Worker (KS_WORKER_SECRET), definido com: wrangler secret put KS_WORKER_SECRET
#
# Se o .env na raiz já tiver KINGSELECTION_WORKER_SECRET, não precisa definir abaixo (o Node carrega o .env).

# Secret do Worker (só defina se NÃO estiver no .env)
# $env:KINGSELECTION_WORKER_SECRET = "seu_secret_aqui"

# URL do Worker (opcional; padrão: https://r2.conectaking.com.br)
# $env:KINGSELECTION_WORKER_URL = "https://r2.conectaking.com.br"

# Deleção: 0 = sem limite (apaga TODAS as órfãs); use um número (ex: 50) para limitar por execução
$env:DRY_RUN = "0"
$env:CONFIRM_DELETE = "SIM"
$env:MAX_DELETE = "0"
$env:SLEEP_MS = "200"
$env:OUT_FILE = "orfas-r2.json"

# Rodar a partir da raiz do projeto para o Node carregar o .env
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location $projectRoot
try {
  node (Join-Path $PSScriptRoot "cleanup-r2-orphans.js")
} finally {
  Pop-Location
}
