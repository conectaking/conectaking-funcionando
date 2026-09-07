-- Desativar módulos descontinuados na disponibilidade por plano.
-- Mantém Recibos e Orçamentos. Não apaga dados históricos.

UPDATE module_plan_availability
SET is_available = false,
    updated_at = COALESCE(updated_at, NOW())
WHERE module_type IN (
  'agenda',
  'contract',
  'kingbrief',
  'king_bolao',
  'photographer_site'
);
