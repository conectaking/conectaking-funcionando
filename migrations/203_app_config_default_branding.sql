-- ===========================================
-- Migration 203: app_config e logomarca padrão (ADM)
-- Tabela de configuração global; logomarca padrão para contas que não definiram a própria.
-- ===========================================

CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO app_config (key, value, updated_at)
VALUES (
    'default_branding',
    '{"logo_url": null, "logo_size": 60, "logo_link": null}'::jsonb,
    NOW()
)
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE app_config IS 'Configurações globais da aplicação (ex.: logomarca padrão para o rodapé do cartão)';

SELECT 'Migration 203: app_config e default_branding criados.' AS status;
