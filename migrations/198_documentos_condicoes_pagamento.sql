-- ===========================================
-- Migration 198: Recibos/Orçamentos – condições de pagamento
-- Campo para anotações de forma de pagamento (ex.: 20% marcação, 30% antes, 50% no dia).
-- Itens continuam em itens_json; pode usar "conteudo_pacote" ou "detalhes" por item (sem alteração de coluna).
-- ===========================================

ALTER TABLE documentos ADD COLUMN IF NOT EXISTS condicoes_pagamento TEXT;

COMMENT ON COLUMN documentos.condicoes_pagamento IS 'Condições de pagamento / forma de pagamento (ex.: 20% para marcação, 30% um dia antes do evento, 50% no encerramento). Exibido no PDF abaixo dos valores.';

SELECT 'Migration 198: documentos.condicoes_pagamento adicionado.' AS status;
