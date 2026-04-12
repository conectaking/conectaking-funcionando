@echo off
REM Chama npm.cmd do Node (evita npm.ps1 bloqueado pela Execution Policy no PowerShell).
REM Uso: npm-run.cmd run migrate-auto
REM      npm-run.cmd install
setlocal
cd /d "%~dp0"
if exist "%ProgramFiles%\nodejs\npm.cmd" (
  "%ProgramFiles%\nodejs\npm.cmd" %*
  exit /b %ERRORLEVEL%
)
if exist "%ProgramFiles(x86)%\nodejs\npm.cmd" (
  "%ProgramFiles(x86)%\nodejs\npm.cmd" %*
  exit /b %ERRORLEVEL%
)
if exist "%LOCALAPPDATA%\Programs\nodejs\npm.cmd" (
  "%LOCALAPPDATA%\Programs\nodejs\npm.cmd" %*
  exit /b %ERRORLEVEL%
)
echo [ERRO] npm.cmd nao encontrado. Instale Node.js LTS ou use: node scripts\run-migrate-auto.js
exit /b 1
