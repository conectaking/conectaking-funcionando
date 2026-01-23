# Script de Push Automatico do Backend
# Este script adiciona, commita e faz push automaticamente para o Bitbucket

Write-Host "Push Automatico do Backend" -ForegroundColor Cyan
Write-Host ("=" * 50) -ForegroundColor Cyan

# Navegar para a pasta do backend
$repoPath = "C:\Users\playa\Desktop\CONECTA KING MVP DEZEMBRO\conecta-king-backend"
Set-Location $repoPath

# Verificar se estamos em um repositório Git
if (-not (Test-Path ".git")) {
    Write-Host "ERRO: Esta pasta nao e um repositorio Git!" -ForegroundColor Red
    exit 1
}

# Verificar status
Write-Host "`nVerificando alteracoes..." -ForegroundColor Yellow
$status = git status --short

if (-not $status) {
    Write-Host "OK: Nenhuma alteracao para commitar!" -ForegroundColor Green
    
    # Verificar se há commits para push
    $commitsAhead = git rev-list --count origin/main..HEAD 2>$null
    if ($commitsAhead -gt 0) {
        Write-Host "Encontrados $commitsAhead commit(s) para enviar..." -ForegroundColor Yellow
        Write-Host "Fazendo push..." -ForegroundColor Yellow
        git push origin main
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "OK: Push realizado com sucesso!" -ForegroundColor Green
        } else {
            Write-Host "ERRO: Erro ao fazer push!" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "OK: Tudo sincronizado! Nada para enviar." -ForegroundColor Green
    }
    exit 0
}

# Mostrar alterações
Write-Host "`nAlteracoes encontradas:" -ForegroundColor Cyan
git status --short

# Adicionar tudo
Write-Host "`nAdicionando todas as alteracoes..." -ForegroundColor Yellow
git add .

# Fazer commit
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$commitMessage = "Auto-commit: $timestamp"
Write-Host "Fazendo commit: $commitMessage" -ForegroundColor Yellow
git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Erro ao fazer commit!" -ForegroundColor Red
    exit 1
}

# Fazer push
Write-Host "`nEnviando para Bitbucket..." -ForegroundColor Yellow
git push origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nOK: Push realizado com sucesso!" -ForegroundColor Green
    Write-Host "O Render deve detectar as mudancas e fazer deploy automaticamente." -ForegroundColor Cyan
    Write-Host "`nProximos passos:" -ForegroundColor Yellow
    Write-Host "   - Verifique o dashboard do Render: https://dashboard.render.com" -ForegroundColor White
    Write-Host "   - Aguarde 2-5 minutos para o deploy completar" -ForegroundColor White
    Write-Host "   - Teste a API: https://conectaking-api.onrender.com/api/health" -ForegroundColor White
} else {
    Write-Host "`nERRO: Erro ao fazer push!" -ForegroundColor Red
    Write-Host "`nPossiveis solucoes:" -ForegroundColor Yellow
    Write-Host "   1. Verifique se o token esta configurado corretamente" -ForegroundColor White
    Write-Host "   2. Verifique sua conexao com a internet" -ForegroundColor White
    Write-Host "   3. Tente executar: git push origin main manualmente" -ForegroundColor White
    exit 1
}

Write-Host "`nProcesso concluido!" -ForegroundColor Green
