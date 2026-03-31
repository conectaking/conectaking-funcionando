-- Total acordado manual + metadados de parcelamento (Fotos vendidas)
-- Data: 2026-03-31

ALTER TABLE IF EXISTS king_client_payment_requests
  ADD COLUMN IF NOT EXISTS negotiated_total_cents INTEGER NULL,
  ADD COLUMN IF NOT EXISTS down_payment_cents INTEGER NULL,
  ADD COLUMN IF NOT EXISTS installment_count INTEGER NULL;

COMMENT ON COLUMN king_client_payment_requests.negotiated_total_cents IS 'Total combinado com o cliente (centavos). Se preenchido, substitui o total estimado pelos pacotes.';
COMMENT ON COLUMN king_client_payment_requests.down_payment_cents IS 'Entrada declarada (centavos), informativo; o recebido real segue em amount_received_cumulative_cents.';
COMMENT ON COLUMN king_client_payment_requests.installment_count IS 'Número de parcelas combinadas (1 = à vista), informativo.';
