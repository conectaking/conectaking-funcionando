@echo off
echo ========================================
echo   Iniciando Servidor Conecta King
echo ========================================
echo.
echo Verificando se Node.js esta instalado...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERRO: Node.js nao encontrado!
    echo Por favor, instale o Node.js primeiro.
    pause
    exit /b 1
)

echo Node.js encontrado!
echo.
echo Iniciando servidor na porta 5000...
echo.
echo Pressione Ctrl+C para parar o servidor
echo.
echo ========================================
echo.

node server.js

pause
