@echo off
setlocal
cd /d "%~dp0"

REM 1) Node no PATH
where node >nul 2>nul
if %ERRORLEVEL%==0 (
  echo [migrate-auto] Usando: node ^(PATH^)
  node scripts\run-migrate-auto.js
  exit /b %ERRORLEVEL%
)

REM 2) Instalacao tipica Windows
if exist "%ProgramFiles%\nodejs\node.exe" (
  echo [migrate-auto] Usando: "%ProgramFiles%\nodejs\node.exe"
  "%ProgramFiles%\nodejs\node.exe" scripts\run-migrate-auto.js
  exit /b %ERRORLEVEL%
)

if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
  echo [migrate-auto] Usando: "%ProgramFiles(x86)%\nodejs\node.exe"
  "%ProgramFiles(x86)%\nodejs\node.exe" scripts\run-migrate-auto.js
  exit /b %ERRORLEVEL%
)

if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
  echo [migrate-auto] Usando: "%LOCALAPPDATA%\Programs\nodejs\node.exe"
  "%LOCALAPPDATA%\Programs\nodejs\node.exe" scripts\run-migrate-auto.js
  exit /b %ERRORLEVEL%
)

echo.
echo [ERRO] Node.js nao foi encontrado ^(nem no PATH nem nas pastas comuns^).
echo Instale a versao LTS: https://nodejs.org
echo Depois feche e abra o terminal de novo ^(ou o Cursor^).
echo.
exit /b 1
