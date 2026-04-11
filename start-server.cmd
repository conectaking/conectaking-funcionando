@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if %ERRORLEVEL%==0 (
  echo [start] node server.js
  node server.js
  exit /b %ERRORLEVEL%
)
if exist "%ProgramFiles%\nodejs\node.exe" (
  echo [start] "%ProgramFiles%\nodejs\node.exe" server.js
  "%ProgramFiles%\nodejs\node.exe" server.js
  exit /b %ERRORLEVEL%
)
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
  "%ProgramFiles(x86)%\nodejs\node.exe" server.js
  exit /b %ERRORLEVEL%
)
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" (
  "%LOCALAPPDATA%\Programs\nodejs\node.exe" server.js
  exit /b %ERRORLEVEL%
)
echo [ERRO] Node.js nao encontrado. Instale de https://nodejs.org
exit /b 1
