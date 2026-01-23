-- ===========================================
-- Migration: Criar módulo de Contratos Digitais
-- Data: 2026-01-07
-- Descrição: Sistema completo de contratos digitais com assinatura
-- ===========================================

-- PASSO 1: Adicionar contract ao item_type_enum
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'contract' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'item_type_enum')
    ) THEN
        ALTER TYPE item_type_enum ADD VALUE 'contract';
        RAISE NOTICE 'contract adicionado ao item_type_enum com sucesso!';
    ELSE
        RAISE NOTICE 'contract já existe no item_type_enum.';
    END IF;
END $$;

-- PASSO 2: Criar tabela contract_items
CREATE TABLE IF NOT EXISTS contract_items (
    id SERIAL PRIMARY KEY,
    profile_item_id INTEGER NOT NULL,
    
    -- Informações do contrato
    contract_title VARCHAR(255) NOT NULL DEFAULT 'Contrato',
    contract_type VARCHAR(50) DEFAULT 'general', -- general, service, rental, sale, etc
    contract_template TEXT, -- Template HTML do contrato
    
    -- Configurações de assinatura
    require_signature BOOLEAN DEFAULT true,
    require_stamp BOOLEAN DEFAULT true,
    allow_digital_signature BOOLEAN DEFAULT true,
    allow_photo_signature BOOLEAN DEFAULT true,
    
    -- Carimbo personalizado
    stamp_image_url TEXT, -- URL da imagem do carimbo
    stamp_text VARCHAR(100), -- Texto do carimbo
    
    -- Metadados
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key
    FOREIGN KEY (profile_item_id) REFERENCES profile_items(id) ON DELETE CASCADE
);

-- PASSO 3: Criar tabela contract_signatures
CREATE TABLE IF NOT EXISTS contract_signatures (
    id SERIAL PRIMARY KEY,
    contract_item_id INTEGER NOT NULL,
    
    -- Informações do signatário
    signer_name VARCHAR(255) NOT NULL,
    signer_email VARCHAR(255),
    signer_phone VARCHAR(50),
    signer_document VARCHAR(50), -- CPF/CNPJ
    
    -- Dados da assinatura
    signature_type VARCHAR(20) DEFAULT 'digital', -- digital, photo
    signature_data TEXT, -- Base64 da assinatura ou URL da foto
    stamp_applied BOOLEAN DEFAULT false,
    stamp_data TEXT, -- Dados do carimbo aplicado
    
    -- IP e dados técnicos
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, signed, cancelled
    signed_at TIMESTAMP,
    
    -- Metadados
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Foreign key
    FOREIGN KEY (contract_item_id) REFERENCES contract_items(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_contract_items_profile_item ON contract_items(profile_item_id);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_contract ON contract_signatures(contract_item_id);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_status ON contract_signatures(status);
CREATE INDEX IF NOT EXISTS idx_contract_signatures_signed_at ON contract_signatures(signed_at DESC);

-- Comentários
COMMENT ON TABLE contract_items IS 'Armazena contratos digitais dos usuários';
COMMENT ON TABLE contract_signatures IS 'Armazena assinaturas dos contratos';
COMMENT ON COLUMN contract_items.contract_template IS 'Template HTML do contrato com placeholders';
COMMENT ON COLUMN contract_signatures.signature_data IS 'Assinatura em base64 ou URL da foto';

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_contract_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contract_items_updated_at
    BEFORE UPDATE ON contract_items
    FOR EACH ROW
    EXECUTE FUNCTION update_contract_items_updated_at();

-- Verificação final
SELECT 'Migration 060 concluída com sucesso! Módulo de Contratos criado.' AS status;

