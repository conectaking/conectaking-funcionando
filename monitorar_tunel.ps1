# ConectaKing - Monitoramento e Manutenção do Túnel das Câmeras IP
$ErrorActionPreference = "SilentlyContinue"

# Evitar instâncias duplicadas do túnel
$existing = Get-CimInstance Win32_Process -Filter "Name = 'ssh.exe'" | Where-Object { 
    $_.CommandLine -like "*46.225.100.64*" -and $_.CommandLine -like "*1554:172.16.100.215*" 
}

if ($existing) {
    Write-Host "[Info] Túnel SSH já está em execução (PID: $($existing.ProcessId))."
    exit 0
}

Write-Host "[Info] Iniciando túnel SSH das câmeras para o ConectaKing na nuvem..."

while ($true) {
    # Executa o SSH para encaminhar a porta da câmera Quarto Bebê (172.16.100.215:554 -> 1554)
    & ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -o TCPKeepAlive=yes -N -R 0.0.0.0:1554:172.16.100.215:554 -R 0.0.0.0:1557:172.16.100.215:5000 -R 0.0.0.0:1555:172.16.100.43:554 -R 0.0.0.0:1556:172.16.100.43:80 root@46.225.100.64

    Write-Host "[Aviso] Túnel SSH desconectado. Tentando reconectar em 5 segundos..."
    Start-Sleep -Seconds 5
}
