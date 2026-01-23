-- Migration: Criar tabela para configuração de preview do link do site
-- Data: 2025-01-31
-- Descrição: Permite personalizar a imagem de preview do link compartilhado no WhatsApp

CREATE TABLE IF NOT EXISTS site_link_preview_config (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL DEFAULT 'CONECTAKING',
    subtitle TEXT,
    bg_color_1 VARCHAR(7) NOT NULL DEFAULT '#991B1B',
    bg_color_2 VARCHAR(7) NOT NULL DEFAULT '#000000',
    text_color VARCHAR(7) NOT NULL DEFAULT '#F5F5F5',
    subtitle_color VARCHAR(7) NOT NULL DEFAULT '#FFC700',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice para buscar configuração ativa rapidamente
CREATE INDEX IF NOT EXISTS idx_link_preview_active ON site_link_preview_config(is_active) WHERE is_active = true;

-- Comentários nas colunas
COMMENT ON TABLE site_link_preview_config IS 'Configurações para personalização da preview do link do site no WhatsApp';
COMMENT ON COLUMN site_link_preview_config.title IS 'Título principal exibido na preview';
COMMENT ON COLUMN site_link_preview_config.subtitle IS 'Subtítulo exibido na preview';
COMMENT ON COLUMN site_link_preview_config.bg_color_1 IS 'Cor primária do gradiente de fundo (hex)';
COMMENT ON COLUMN site_link_preview_config.bg_color_2 IS 'Cor secundária do gradiente de fundo (hex)';
COMMENT ON COLUMN site_link_preview_config.text_color IS 'Cor do texto principal (hex)';
COMMENT ON COLUMN site_link_preview_config.subtitle_color IS 'Cor do subtítulo (hex)';
COMMENT ON COLUMN site_link_preview_config.is_active IS 'Se a configuração está ativa (apenas uma pode estar ativa)';
