-- Valor restante a parcelar + intervalo em dias (Fotos vendidas)
-- Data: 2026-03-31

ALTER TABLE IF EXISTS king_client_payment_requests
  ADD COLUMN IF NOT EXISTS remaining_balance_cents INTEGER NULL,
  ADD COLUMN IF NOT EXISTS installment_interval_days INTEGER NULL;

COMMENT ON COLUMN king_client_payment_requests.remaining_balance_cents IS 'Valor restante combinado a parcelar (centavos), informativo.';
COMMENT ON COLUMN king_client_payment_requests.installment_interval_days IS 'Intervalo em dias entre parcelas do restante, informativo.';
-- installment_count (215) representa quantas parcelas para o valor restante
