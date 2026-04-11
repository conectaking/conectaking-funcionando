@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if %ERRORLEVEL%==0 (
  node scripts\run-migrate-status.js
  exit /b %ERRORLEVEL%
)
if exist "%ProgramFiles%\nodejs\node.exe" (
  "%ProgramFiles%\nodejs\node.exe" scripts\run-migrate-status.js
  exit /b %ERRORLEVEL%
)
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
  "%ProgramFiles(x86)%\nodejs\node.exe" scripts\run-migrate-status.js
  exit /b %ERRORLEVEL%
)
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
  "%LOCALAPPDATA%\Programs\nodejs\node.exe" scripts\run-migrate-status.js
  exit /b %ERRORLEVEL%
)
echo [ERRO] Node.js nao encontrado. Instale de https://nodejs.org
exit /b 1
