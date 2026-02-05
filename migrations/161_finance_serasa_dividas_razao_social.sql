-- Migration: Adicionar coluna Razão social na tabela de dívidas Serasa
-- Captura o campo "Razão social" da tela Serasa (ex: ITAU UNIBANCO S.A.)

ALTER TABLE finance_serasa_dividas
ADD COLUMN IF NOT EXISTS razao_social VARCHAR(120);

COMMENT ON COLUMN finance_serasa_dividas.razao_social IS 'Razão social da empresa responsável (ex: ITAU UNIBANCO S.A.).';
