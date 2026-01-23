@echo off
REM ===========================================
REM EXECUTAR MIGRATION VIA LINHA DE COMANDO
REM ===========================================
REM 
REM INSTRUÇÕES:
REM 1. Abra o PowerShell ou CMD
REM 2. Navegue até a pasta do projeto
REM 3. Execute este arquivo .bat
REM
REM OU execute diretamente:
REM psql -h [HOST] -U [USER] -d [DATABASE] -f MIGRATION-ULTRA-SIMPLES.sql
REM ===========================================

echo Executando migration via psql...
echo.
echo IMPORTANTE: Configure as variaveis abaixo com seus dados de conexao!
echo.

REM Configure estas variaveis com seus dados de conexao
set PGHOST=virginia-postgres.render.com
set PGPORT=5432
set PGDATABASE=conecta_king_db
set PGUSER=seu_usuario
set PGPASSWORD=sua_senha

REM Executar migration
psql -h %PGHOST% -p %PGPORT% -U %PGUSER% -d %PGDATABASE% -f MIGRATION-ULTRA-SIMPLES.sql

pause

