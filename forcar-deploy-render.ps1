# Script para Forcar Deploy no Render usando Deploy Hook
# Use este script se o Auto-Deploy nao estiver funcionando

Write-Host "Forcar Deploy no Render" -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor Cyan

# INSTRUCOES:
# 1. No Render, va em Settings > Build & Deploy
# 2. Na secao "Deploy Hook", clique no icone de olho para revelar a URL
# 3. Copie a URL completa
# 4. Cole a URL abaixo na variavel $deployHookUrl

$deployHookUrl = "COLE_A_URL_DO_DEPLOY_HOOK_AQUI"

if ($deployHookUrl -eq "COLE_A_URL_DO_DEPLOY_HOOK_AQUI") {
    Write-Host "`nERRO: Voce precisa configurar a URL do Deploy Hook!" -ForegroundColor Red
    Write-Host "`nComo obter a URL:" -ForegroundColor Yellow
    Write-Host "1. Acesse: https://dashboard.render.com" -ForegroundColor White
    Write-Host "2. Va para o servico conectaking-api" -ForegroundColor White
    Write-Host "3. Clique em Settings > Build & Deploy" -ForegroundColor White
    Write-Host "4. Na secao Deploy Hook, clique no icone de olho" -ForegroundColor White
    Write-Host "5. Copie a URL completa" -ForegroundColor White
    Write-Host "6. Cole a URL na variavel `$deployHookUrl neste script" -ForegroundColor White
    exit 1
}

Write-Host "`nEnviando requisicao para o Deploy Hook..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri $deployHookUrl -Method POST -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        Write-Host "OK: Deploy iniciado com sucesso!" -ForegroundColor Green
        Write-Host "Verifique o painel do Render para acompanhar o progresso." -ForegroundColor Cyan
    } else {
        Write-Host "AVISO: Resposta recebida com status $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERRO: Falha ao acionar o Deploy Hook" -ForegroundColor Red
    Write-Host "Detalhes: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nVerifique se a URL esta correta e se o servico esta ativo no Render." -ForegroundColor Yellow
    exit 1
}

Write-Host "`nProcesso concluido!" -ForegroundColor Green
