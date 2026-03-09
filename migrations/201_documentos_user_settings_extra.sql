-- Migration 201: Configurações extras (condições de pagamento, PIX, catálogo) por usuário
-- Sincroniza entre localhost e site: 20%, PIX, catálogo salvos no backend.

ALTER TABLE documentos_user_settings
ADD COLUMN IF NOT EXISTS extra_settings JSONB DEFAULT '{}';

COMMENT ON COLUMN documentos_user_settings.extra_settings IS 'Configurações extras: condicoesPagamentoPadrao, pixChave, pixNome, pixCidade, catalogoServicos (array)';

SELECT 'Migration 201: extra_settings adicionado a documentos_user_settings.' AS status;
