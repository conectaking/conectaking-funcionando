-- ===========================================
-- Migration: Criar módulo de Lista de Convidados
-- Data: 2026-01-07
-- Descrição: Sistema completo de gestão de convidados para eventos
-- ===========================================

-- PASSO 1: Adicionar guest_list ao item_type_enum
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'guest_list' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
    ) THEN
        ALTER TYPE item_type_enum ADD VALUE 'guest_list';
        RAISE NOTICE 'guest_list adicionado ao item_type_enum com sucesso!';
    ELSE
        RAISE NOTICE 'guest_list já existe no item_type_enum.';
    END IF;
END $$;

-- PASSO 2: Criar tabela guest_list_items
CREATE TABLE IF NOT EXISTS guest_list_items (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL,
    
    -- Informações do evento
    event_title VARCHAR(255) NOT NULL DEFAULT 'Lista de Convidados',
    event_description TEXT,
    event_date DATE,
    event_time TIME,
    event_location TEXT,
    
    -- Configurações
    max_guests INTEGER, -- Limite de convidados (null = ilimitado)
    require_confirmation BOOLEAN DEFAULT true,
    allow_self_registration BOOLEAN DEFAULT true,
    
    -- Links de acesso
    registration_token VARCHAR(100) UNIQUE, -- Token para link de inscrição
    confirmation_token VARCHAR(100) UNIQUE, -- Token para link de confirmação
    
    -- Metadados
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key
    FOREIGN KEY (profile_item_id) REFERENCES profile_items(id) ON DELETE CASCADE
);

-- PASSO 3: Criar tabela guests
CREATE TABLE IF NOT EXISTS guests (
    id SERIAL PRIMARY KEY,
    guest_list_id INTEGER NOT NULL,
    
    -- Informações do convidado
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    document VARCHAR(50), -- CPF/CNPJ (opcional)
    
    -- Status
    status VARCHAR(20) DEFAULT 'registered', -- registered, confirmed, checked_in, cancelled
    registration_source VARCHAR(20) DEFAULT 'self', -- self, admin, import
    
    -- Confirmação
    confirmed_at TIMESTAMP,
    confirmed_by VARCHAR(255), -- ID do usuário que confirmou (se não for auto-confirmação)
    
    -- Check-in (conferência)
    checked_in_at TIMESTAMP,
    checked_in_by VARCHAR(255), -- ID do usuário que fez o check-in
    
    -- Observações
    notes TEXT,
    
    -- Metadados
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key
    FOREIGN KEY (guest_list_id) REFERENCES guest_list_items(id) ON DELETE CASCADE
);

-- Adicionar foreign keys para users se a tabela existir
DO $$ 
BEGIN
    -- Verificar se a tabela users existe e adicionar foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        -- Verificar se a constraint já existe antes de criar
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'guests_confirmed_by_fkey'
        ) THEN
            ALTER TABLE guests 
            ADD CONSTRAINT guests_confirmed_by_fkey 
            FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'guests_checked_in_by_fkey'
        ) THEN
            ALTER TABLE guests 
            ADD CONSTRAINT guests_checked_in_by_fkey 
            FOREIGN KEY (checked_in_by) REFERENCES users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_guest_list_items_profile_item ON guest_list_items(profile_item_id);
CREATE INDEX IF NOT EXISTS idx_guest_list_items_registration_token ON guest_list_items(registration_token);
CREATE INDEX IF NOT EXISTS idx_guest_list_items_confirmation_token ON guest_list_items(confirmation_token);
CREATE INDEX IF NOT EXISTS idx_guests_guest_list ON guests(guest_list_id);
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status);
CREATE INDEX IF NOT EXISTS idx_guests_checked_in_at ON guests(checked_in_at DESC);

-- Comentários
COMMENT ON TABLE guest_list_items IS 'Armazena listas de convidados dos usuários';
COMMENT ON TABLE guests IS 'Armazena convidados das listas';
COMMENT ON COLUMN guest_list_items.registration_token IS 'Token único para link público de inscrição';
COMMENT ON COLUMN guest_list_items.confirmation_token IS 'Token único para link público de confirmação';
COMMENT ON COLUMN guests.status IS 'Status: registered (inscrito), confirmed (confirmado), checked_in (conferido), cancelled (cancelado)';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_guest_list_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_guest_list_items_updated_at
    BEFORE UPDATE ON guest_list_items
    FOR EACH ROW
    EXECUTE FUNCTION update_guest_list_items_updated_at();

CREATE OR REPLACE FUNCTION update_guests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_guests_updated_at
    BEFORE UPDATE ON guests
    FOR EACH ROW
    EXECUTE FUNCTION update_guests_updated_at();

-- Verificação final
SELECT 'Migration 061 concluída com sucesso! Módulo de Lista de Convidados criado.' AS status;

