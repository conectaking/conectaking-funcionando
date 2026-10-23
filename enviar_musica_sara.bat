@echo off
chcp 65001 >nul
title Enviar Música para a Alexa da Sara (Charlene)

if "%~1"=="" (
    echo =======================================================
    echo   COMO USAR ESTE ARQUIVO:
    echo =======================================================
    echo   1. Pegue qualquer arquivo de musica (.mp3) no seu PC
    echo   2. ARRASTE e SOLTE o arquivo em cima deste icone (.bat)
    echo   3. Ele vai enviar direto para a Alexa da Sara na VPS!
    echo =======================================================
    echo.
    set /p ARQ="Ou digite/cole o caminho do arquivo MP3 aqui: "
) else (
    set "ARQ=%~1"
)

if not exist "%ARQ%" (
    echo.
    echo [ERRO] O arquivo especificado nao foi encontrado!
    pause
    exit /b
)

for %%F in ("%ARQ%") do set "NOME=%%~nxF"

echo.
echo [1/2] Enviando "%NOME%" para o servidor VPS...
scp -O "%ARQ%" root@46.225.100.64:/tmp/musica_temp.mp3

if %errorlevel% neq 0 (
    echo [ERRO] Falha ao enviar para a VPS via SCP.
    pause
    exit /b
)

echo [2/2] Salvando na pasta da Sara e da Charlene...
ssh root@46.225.100.64 "docker cp /tmp/musica_temp.mp3 conectaking-laravel:\"/app/storage/app/public/sara/musicas/%NOME%\" && rm -f /tmp/musica_temp.mp3"

echo.
echo =======================================================
echo   SUCESSO! Musica adicionada a playlist da Sara!
echo   Basta dizer na Alexa:
echo   "Alexa, pede para a Charlene tocar as musicas da Sara"
echo =======================================================
echo.
pause
