-- ============================================================
-- Postgres LOCAL – criar utilizador e base para desenvolvimento
-- Executar no DBeaver: ligado ao servidor PostgreSQL local (como superuser, ex.: postgres)
-- ============================================================

-- 1) Criar o utilizador (ignora erro se já existir)
CREATE ROLE conecta_king_db_user WITH LOGIN PASSWORD 'conecta_local_2026';

-- 2) Criar a base de dados
CREATE DATABASE conecta_king_db OWNER conecta_king_db_user;

-- 3) Conectar à base "conecta_king_db" no DBeaver e executar o bloco abaixo para permissões:
-- GRANT ALL PRIVILEGES ON DATABASE conecta_king_db TO conecta_king_db_user;
-- GRANT ALL ON SCHEMA public TO conecta_king_db_user;
