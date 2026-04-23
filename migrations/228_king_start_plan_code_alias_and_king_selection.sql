-- Alinha produto: King Start (plan_code basic em module_plan_availability) inclui King Selection.
-- A UI do dashboard usa module_plan_availability; o código da app também normaliza
-- subscription_plans.plan_code (ex.: king_start -> basic).

UPDATE module_plan_availability
SET is_available = true, updated_at = NOW()
WHERE module_type = 'king_selection' AND plan_code = 'basic';

SELECT 'Migration 228: king_selection ativo para basic (King Start).' AS status;
