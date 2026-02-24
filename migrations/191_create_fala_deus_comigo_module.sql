-- ===========================================
-- Migration 191: Criar módulo Fala Deus Comigo
-- Rotas isoladas em /api/fala-deus-comigo - não altera rotas existentes
-- ===========================================

-- PASSO 1: Adicionar fala_deus_comigo ao item_type_enum
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON t.oid = e.enumtypid
        WHERE t.typname = 'item_type_enum' AND e.enumlabel = 'fala_deus_comigo'
    ) THEN
        ALTER TYPE item_type_enum ADD VALUE 'fala_deus_comigo';
        RAISE NOTICE 'fala_deus_comigo adicionado ao item_type_enum.';
    END IF;
END $$;

-- PASSO 2: Tabela fala_deus_comigo_items (um por profile_item - config do módulo)
CREATE TABLE IF NOT EXISTS fala_deus_comigo_items (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (profile_item_id) REFERENCES profile_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fala_deus_comigo_items_profile_item ON fala_deus_comigo_items(profile_item_id);
COMMENT ON TABLE fala_deus_comigo_items IS 'Configuração do módulo Fala Deus Comigo por profile_item (logo fica em profile_items.image_url)';

CREATE OR REPLACE FUNCTION update_fala_deus_comigo_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fala_deus_comigo_items_updated_at ON fala_deus_comigo_items;
CREATE TRIGGER trigger_fala_deus_comigo_items_updated_at
    BEFORE UPDATE ON fala_deus_comigo_items
    FOR EACH ROW
    EXECUTE FUNCTION update_fala_deus_comigo_items_updated_at();

-- PASSO 3: Tabela fala_deus_comigo_mensagens (versículo + resumo + mensagem por profile_item)
CREATE TABLE IF NOT EXISTS fala_deus_comigo_mensagens (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL,
    versiculo_ref VARCHAR(200) NOT NULL,
    versiculo_texto TEXT,
    resumo TEXT,
    mensagem TEXT NOT NULL,
    attachment_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (profile_item_id) REFERENCES profile_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fala_deus_comigo_mensagens_profile_item ON fala_deus_comigo_mensagens(profile_item_id);
COMMENT ON TABLE fala_deus_comigo_mensagens IS 'Mensagens/versículos do Fala Deus Comigo (sorteio aleatório por visita)';

CREATE OR REPLACE FUNCTION update_fala_deus_comigo_mensagens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fala_deus_comigo_mensagens_updated_at ON fala_deus_comigo_mensagens;
CREATE TRIGGER trigger_fala_deus_comigo_mensagens_updated_at
    BEFORE UPDATE ON fala_deus_comigo_mensagens
    FOR EACH ROW
    EXECUTE FUNCTION update_fala_deus_comigo_mensagens_updated_at();
