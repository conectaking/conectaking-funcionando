# Gera secrets locais (PowerShell) — NÃO usar em produção
$ErrorActionPreference = 'Stop'
$jwt = -join ((1..48) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
# APP_KEY estilo base64 Laravel
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$appKey = 'base64:' + [Convert]::ToBase64String($bytes)

Write-Host "JWT_SECRET=$jwt"
Write-Host "LARAVEL_APP_KEY=$appKey"
Write-Host ""
Write-Host "Copie para .env.docker (local apenas)."
