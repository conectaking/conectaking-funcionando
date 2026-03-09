-- Migration 199: Configurações de documentos (recibos/orçamentos) por usuário
-- Cores e último documento aberto para persistir entre dispositivos e ao voltar de Config.

CREATE TABLE IF NOT EXISTS documentos_user_settings (
    user_id INTEGER NOT NULL PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    header_color VARCHAR(7) DEFAULT NULL,
    accent_color VARCHAR(7) DEFAULT NULL,
    bg_color VARCHAR(7) DEFAULT NULL,
    last_document_id INTEGER DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentos_user_settings_user_id ON documentos_user_settings(user_id);

COMMENT ON TABLE documentos_user_settings IS 'Cores e último documento do usuário para recibos/orçamentos; sincronizado entre dispositivos';
COMMENT ON COLUMN documentos_user_settings.header_color IS 'Cor do cabeçalho do PDF (hex sem #)';
COMMENT ON COLUMN documentos_user_settings.accent_color IS 'Cor de destaque do PDF (hex sem #)';
COMMENT ON COLUMN documentos_user_settings.bg_color IS 'Cor de fundo do PDF (hex sem #)';
COMMENT ON COLUMN documentos_user_settings.last_document_id IS 'Último documento aberto; usado para restaurar ao voltar de Configuração';

SELECT 'Migration 199: documentos_user_settings criada.' AS status;
