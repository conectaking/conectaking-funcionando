-- ===========================================
-- Migration 193: Limite KingBrief por plano (minutos/mês)
-- Só ADM edita em "Planos". NULL = ilimitado.
-- ===========================================

ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS kingbrief_minutes_per_month INTEGER DEFAULT NULL;

COMMENT ON COLUMN subscription_plans.kingbrief_minutes_per_month IS 'Limite de minutos de áudio KingBrief por mês. NULL = ilimitado. Editável só pelo ADM em Planos.';

SELECT 'Migration 193: kingbrief_minutes_per_month adicionado a subscription_plans.' AS status;
