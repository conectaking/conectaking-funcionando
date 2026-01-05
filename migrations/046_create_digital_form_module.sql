-- ===========================================
-- Migration: Adicionar módulo Formulário Digital
-- Data: 2026-01-05
-- Descrição: Adiciona suporte para formulários digitais estilo Google Forms
-- ===========================================

-- PASSO 1: Adicionar digital_form ao item_type_enum
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'digital_form' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
    ) THEN
        ALTER TYPE item_type_enum ADD VALUE 'digital_form';
        RAISE NOTICE 'digital_form adicionado ao item_type_enum com sucesso!';
    ELSE
        RAISE NOTICE 'digital_form já existe no item_type_enum.';
    END IF;
END $$;

-- PASSO 2: Criar tabela digital_form_items para armazenar dados do formulário
CREATE TABLE IF NOT EXISTS digital_form_items (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL,
    
    -- Configuração básica do formulário
    form_title VARCHAR(255) NOT NULL DEFAULT 'Formulário Digital',
    form_logo_url TEXT,
    form_description TEXT,
    
    -- Textos opcionais (pedidos de oração, nossos encontros, etc)
    prayer_requests_text TEXT,
    meetings_text TEXT,
    welcome_text TEXT,
    
    -- Campo de destino (WhatsApp, email, etc)
    whatsapp_number VARCHAR(50),
    
    -- Formato de exibição (button ou banner)
    display_format VARCHAR(20) DEFAULT 'button' CHECK (display_format IN ('button', 'banner')),
    banner_image_url TEXT, -- URL da imagem quando formato é banner
    
    -- Campos do formulário armazenados como JSON
    -- Estrutura: { fields: [{ type: 'text', label: 'Nome', required: true, order: 1 }, ...] }
    form_fields JSONB DEFAULT '[]'::jsonb,
    
    -- Configurações visuais
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    primary_color VARCHAR(7) DEFAULT '#4A90E2',
    text_color VARCHAR(7) DEFAULT '#333333',
    
    -- Metadados
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key
    FOREIGN KEY (profile_item_id) REFERENCES profile_items(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_digital_form_items_profile_item ON digital_form_items(profile_item_id);
CREATE INDEX IF NOT EXISTS idx_digital_form_items_created_at ON digital_form_items(created_at DESC);

-- Comentários
COMMENT ON TABLE digital_form_items IS 'Armazena dados dos formulários digitais dos usuários';
COMMENT ON COLUMN digital_form_items.profile_item_id IS 'ID do item do tipo digital_form em profile_items';
COMMENT ON COLUMN digital_form_items.form_fields IS 'Campos do formulário em formato JSON (perguntas, tipos, etc)';
COMMENT ON COLUMN digital_form_items.display_format IS 'Formato de exibição: button ou banner';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_digital_form_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_digital_form_items_updated_at
    BEFORE UPDATE ON digital_form_items
    FOR EACH ROW
    EXECUTE FUNCTION update_digital_form_items_updated_at();

-- Verificação final
SELECT 'Migration 046 concluída com sucesso! Tabela digital_form_items criada.' AS status;

