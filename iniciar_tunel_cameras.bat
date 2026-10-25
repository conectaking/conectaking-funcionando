@echo off
title ConectaKing - Tunel das Cameras IP
cd /d "%~dp0"
echo ======================================================
echo    ConectaKing - Conector do Tunel das Cameras IP
echo ======================================================
echo.
echo Mantendo a conexao das cameras (Quarto Bebe e Sala)
echo com o servidor ConectaKing na nuvem...
echo.
echo Para fechar a janela sem encerrar o tunel, feche-a normalmente.
echo Para encerrar o tunel, pressione CTRL+C.
echo ======================================================
powershell.exe -ExecutionPolicy Bypass -File "%~dp0monitorar_tunel.ps1"
pause
