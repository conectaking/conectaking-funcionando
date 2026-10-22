@echo off
title ConectaKing - Tunel das Cameras IP
echo ======================================================
echo    ConectaKing - Conector do Tunel das Cameras IP
echo ======================================================
echo.
echo Mantendo a conexao das cameras (Quarto Bebe e Sala)
echo com o servidor ConectaKing na nuvem...
echo.
echo Pressione CTRL+C para encerrar.
echo ======================================================

:loop
ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=6 -N -R 0.0.0.0:1554:172.16.100.215:554 -R 0.0.0.0:1557:172.16.100.215:5000 -R 0.0.0.0:1555:172.16.100.43:554 -R 0.0.0.0:1556:172.16.100.43:80 root@46.225.100.64
echo.
echo [Aviso] Conexao perdida ou reiniciada. Reconectando em 3 segundos...
timeout /t 3 /nobreak >nul
goto loop
