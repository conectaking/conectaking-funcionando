-- ===========================================
-- Migration: Rodadas de seleção (lotes)
-- Data: 2026-03-21
-- Descrição:
-- - selection_batch em king_selections: em que rodada a foto foi escolhida
-- - selection_round em king_gallery_clients / king_galleries: rodada atual (incrementa ao abrir nova seleção)
-- ===========================================

ALTER TABLE king_selections
  ADD COLUMN IF NOT EXISTS selection_batch INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_king_selections_gallery_batch
  ON king_selections(gallery_id, selection_batch);

ALTER TABLE king_gallery_clients
  ADD COLUMN IF NOT EXISTS selection_round INTEGER NOT NULL DEFAULT 1;

ALTER TABLE king_galleries
  ADD COLUMN IF NOT EXISTS selection_round INTEGER NOT NULL DEFAULT 1;
