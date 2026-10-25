param(
    [switch]$Force,
    [switch]$Restart
)

# ConectaKing - Monitoramento e Manutenção do Túnel das Câmeras IP
$ErrorActionPreference = "SilentlyContinue"

# Se o usuário clicou no botão "Iniciar Túnel" ou pediu reinício forçado
if ($Force -or $Restart) {
    Write-Host "[Info] Forçando reinicialização do túnel SSH..."
    Get-CimInstance Win32_Process -Filter "Name = 'ssh.exe'" | Where-Object { 
        $_.CommandLine -like "*46.225.100.64*" -and ($_.CommandLine -like "*1554:172.16.100.215*" -or $_.CommandLine -like "*1554*")
    } | ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
} else {
    # Evitar instâncias duplicadas se o túnel já estiver saudável
    $existing = Get-CimInstance Win32_Process -Filter "Name = 'ssh.exe'" | Where-Object { 
        $_.CommandLine -like "*46.225.100.64*" -and $_.CommandLine -like "*1554:172.16.100.215*" 
    }
    if ($existing) {
        Write-Host "[Info] Túnel SSH já está em execução (PID: $($existing.ProcessId))."
        exit 0
    }
}

Write-Host "[Info] Iniciando túnel SSH das câmeras para o ConectaKing na nuvem..."

while ($true) {
    # Executa o SSH para encaminhar a porta da câmera Quarto Bebê (172.16.100.215:554 -> 1554)
    # -o ExitOnForwardFailure=yes garante que se a porta falhar no servidor, o SSH sai imediatamente e tenta reconectar
    & ssh -o StrictHostKeyChecking=no `
          -o ConnectTimeout=10 `
          -o ServerAliveInterval=10 `
          -o ServerAliveCountMax=2 `
          -o TCPKeepAlive=yes `
          -o ExitOnForwardFailure=yes `
          -N `
          -R 0.0.0.0:1554:172.16.100.215:554 `
          -R 0.0.0.0:1557:172.16.100.215:5000 `
          -R 0.0.0.0:1555:172.16.100.43:554 `
          -R 0.0.0.0:1556:172.16.100.43:80 `
          root@46.225.100.64

    Write-Host "[Aviso] Túnel SSH desconectado. Tentando reconectar em 3 segundos..."
    Start-Sleep -Seconds 3
}
