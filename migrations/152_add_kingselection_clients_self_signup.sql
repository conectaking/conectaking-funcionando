-- ===========================================
-- Migration: Campos de clientes (autocadastro / ativação / nota)
-- Data: 2026-02-01
-- Descrição:
-- - allow_self_signup: permite visitante criar acesso na tela de login
-- - client_enabled: permite desativar/remover acesso do cliente sem quebrar NOT NULL
-- - cliente_nota: anotação interna do fotógrafo
-- ===========================================

ALTER TABLE king_galleries
  ADD COLUMN IF NOT EXISTS allow_self_signup BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE king_galleries
  ADD COLUMN IF NOT EXISTS client_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE king_galleries
  ADD COLUMN IF NOT EXISTS cliente_nota TEXT;

