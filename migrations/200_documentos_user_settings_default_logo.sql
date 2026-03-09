-- Migration 200: Logo padrão de Configuração (recibos/orçamentos) por usuário
-- Sincroniza entre localhost e site: a logo definida em Configuração fica no backend.

ALTER TABLE documentos_user_settings
ADD COLUMN IF NOT EXISTS default_logo_url TEXT;

COMMENT ON COLUMN documentos_user_settings.default_logo_url IS 'URL (ou data URL) da logo definida em Configuração; usada como padrão quando o documento não tem logo própria';

SELECT 'Migration 200: default_logo_url adicionado a documentos_user_settings.' AS status;
