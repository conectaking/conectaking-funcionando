-- Pagamentos parciais + cortesia explícita (Fotos vendidas por evento)
-- Data: 2026-03-29

ALTER TABLE IF EXISTS king_client_payment_requests
  ADD COLUMN IF NOT EXISTS amount_received_cumulative_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS courtesy_cents INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN king_client_payment_requests.amount_received_cumulative_cents IS 'Total em centavos já confirmado pelo fotógrafo (parcelas/entradas).';
COMMENT ON COLUMN king_client_payment_requests.courtesy_cents IS 'Valor em centavos concedido como cortesia (resto abonado).';

-- Status 'partial' permitido em status (TEXT): aplicado pelo app; não requer CHECK novo.

UPDATE king_client_payment_requests
SET amount_received_cumulative_cents = COALESCE(amount_cents, 0)
WHERE lower(COALESCE(status, '')) IN ('confirmed', 'partial')
  AND COALESCE(amount_received_cumulative_cents, 0) = 0
  AND COALESCE(amount_cents, 0) > 0;
