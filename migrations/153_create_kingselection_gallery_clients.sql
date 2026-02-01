-- ===========================================
-- Migration: Clientes por galeria (multi-client)
-- Data: 2026-02-01
-- Descrição:
-- - Cria tabela king_gallery_clients (vários clientes por galeria)
-- - Cria índice único por (gallery_id, lower(email))
-- - Faz backfill do cliente "principal" a partir de king_galleries
-- ===========================================

CREATE TABLE IF NOT EXISTS king_gallery_clients (
  id SERIAL PRIMARY KEY,
  gallery_id INTEGER NOT NULL REFERENCES king_galleries(id) ON DELETE CASCADE,
  nome VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(60),
  senha_hash VARCHAR(255) NOT NULL,
  senha_enc TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_king_gallery_clients_gallery_id ON king_gallery_clients(gallery_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_king_gallery_clients_gallery_email ON king_gallery_clients(gallery_id, lower(email));

-- Backfill do cliente principal (se ainda não existir)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='king_galleries' AND column_name='senha_enc') THEN
    INSERT INTO king_gallery_clients (gallery_id, nome, email, telefone, senha_hash, senha_enc, enabled, created_at, updated_at)
    SELECT
      g.id,
      CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='king_galleries' AND column_name='cliente_nome') THEN g.cliente_nome ELSE NULL END,
      g.cliente_email,
      CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='king_galleries' AND column_name='cliente_telefone') THEN g.cliente_telefone ELSE NULL END,
      g.senha_hash,
      g.senha_enc,
      TRUE,
      NOW(),
      NOW()
    FROM king_galleries g
    WHERE g.cliente_email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM king_gallery_clients c
        WHERE c.gallery_id = g.id AND lower(c.email) = lower(g.cliente_email)
      );
  ELSE
    INSERT INTO king_gallery_clients (gallery_id, nome, email, telefone, senha_hash, senha_enc, enabled, created_at, updated_at)
    SELECT
      g.id,
      CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='king_galleries' AND column_name='cliente_nome') THEN g.cliente_nome ELSE NULL END,
      g.cliente_email,
      CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='king_galleries' AND column_name='cliente_telefone') THEN g.cliente_telefone ELSE NULL END,
      g.senha_hash,
      NULL,
      TRUE,
      NOW(),
      NOW()
    FROM king_galleries g
    WHERE g.cliente_email IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM king_gallery_clients c
        WHERE c.gallery_id = g.id AND lower(c.email) = lower(g.cliente_email)
      );
  END IF;
END $$;

