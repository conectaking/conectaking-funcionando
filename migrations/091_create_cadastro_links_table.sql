-- Migration 091: Criar tabela cadastro_links para múltiplos links personalizados
-- Data: 2026-01-16
-- Descrição: Cria tabela para armazenar múltiplos links personalizados de cadastro para cada guest_list_item

-- Criar tabela primeiro sem foreign key para created_by_user_id
CREATE TABLE IF NOT EXISTS cadastro_links (
    id SERIAL PRIMARY KEY,
    guest_list_item_id INTEGER NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    expires_at TIMESTAMP NULL,
    max_uses INTEGER DEFAULT 999999,
    current_uses INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_user_id VARCHAR(255), -- Tipo correto: VARCHAR para corresponder à tabela users
    FOREIGN KEY (guest_list_item_id) REFERENCES guest_list_items(id) ON DELETE CASCADE
);

-- Adicionar foreign key para created_by_user_id se a tabela users existir
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'users'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'cadastro_links_created_by_user_id_fkey'
    ) THEN
        ALTER TABLE cadastro_links 
        ADD CONSTRAINT cadastro_links_created_by_user_id_fkey 
        FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key cadastro_links_created_by_user_id_fkey criada com sucesso';
    ELSE
        RAISE NOTICE 'Foreign key não criada (tabela users não existe ou constraint já existe)';
    END IF;
END $$;

-- Comentários
COMMENT ON TABLE cadastro_links IS 'Armazena múltiplos links personalizados de cadastro para cada guest_list_item';
COMMENT ON COLUMN cadastro_links.slug IS 'Slug único para o link personalizado (ex: "evento-2026-1")';
COMMENT ON COLUMN cadastro_links.description IS 'Descrição opcional do link';
COMMENT ON COLUMN cadastro_links.expires_at IS 'Data de expiração do link. NULL = sem expiração';
COMMENT ON COLUMN cadastro_links.max_uses IS 'Número máximo de vezes que o link pode ser usado. 999999 = ilimitado';
COMMENT ON COLUMN cadastro_links.current_uses IS 'Número atual de vezes que o link foi usado';

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_cadastro_links_guest_list_item_id ON cadastro_links(guest_list_item_id);
CREATE INDEX IF NOT EXISTS idx_cadastro_links_slug ON cadastro_links(slug);
CREATE INDEX IF NOT EXISTS idx_cadastro_links_expires_at ON cadastro_links(expires_at);

-- Verificação final
SELECT 'Migration 091 concluída com sucesso! Tabela cadastro_links criada.' AS status;
