-- Liga cada pedido de edição (modo público) à rodada de seleção no painel do fotógrafo.
ALTER TABLE king_client_edit_requests
  ADD COLUMN IF NOT EXISTS selection_batch INTEGER;

COMMENT ON COLUMN king_client_edit_requests.selection_batch IS
  'Rodada de seleção (selection_batch) congelada neste pedido — ex.: Seleção 1, Seleção 2.';

SELECT 'Migration 236: edit request selection_batch' AS status;
